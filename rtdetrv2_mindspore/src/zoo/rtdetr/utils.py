import mindspore
import math
from typing import List
import mindspore.mint as torch
from mindspore import Tensor
import src.nn_compat as nn
import mindspore.nn as _msnn
for _cls in ["CellList","CellDict","SequentialCell","Sequential",
             "ModuleList","ModuleDict","BatchNorm2d","GroupNorm",
             "LayerNorm","InstanceNorm2d","Embedding","MultiheadAttention",
             "Identity","Dropout","LeakyReLU","SiLU","GELU",
             "Hardsigmoid","Hardswish","ReLU6","AvgPool2d","MaxPool2d",
             "AdaptiveAvgPool2d","ConvTranspose2d","PixelShuffle","Flatten"]:
    if not hasattr(nn, _cls) and hasattr(_msnn, _cls):
        setattr(nn, _cls, getattr(_msnn, _cls))
del _msnn, _cls

import mindspore.mint.nn.functional as F
import mindspore.ops as _ops
import mindspore.numpy as _mnp


def inverse_sigmoid(x, eps=1e-5):
    x = x.clip(min=0., max=1.)
    return torch.log(x.clip(min=eps) / (1 - x).clip(min=eps))


def bias_init_with_prob(prior_prob=0.01):
    bias_init = float(-math.log((1 - prior_prob) / prior_prob))
    return bias_init


def _bilinear_grid_sample_fp16(input_fp32, grid_fp32):
    """
    手写双线性 grid_sample，零 gather 算子。
    310B 所有 Gather/IndexSelect 无 AICore 实现，改用 one-hot + fp16 matmul。
    input_fp32: (N, C, H, W) fp32
    grid_fp32:  (N, Lq, P, 2) fp32, [-1,1] align_corners=True
    returns:    (N, C, Lq, P) fp32
    """
    N, C, H, W = input_fp32.shape
    Lq = grid_fp32.shape[1]
    P  = grid_fp32.shape[2]
    LP = Lq * P

    x = (grid_fp32[..., 0] + 1.0) * 0.5 * float(W - 1)
    y = (grid_fp32[..., 1] + 1.0) * 0.5 * float(H - 1)
    x0f = x.floor(); y0f = y.floor()
    x0c = x0f.astype(mindspore.int32).clip(0, W-1)
    x1c = (x0f+1).astype(mindspore.int32).clip(0, W-1)
    y0c = y0f.astype(mindspore.int32).clip(0, H-1)
    y1c = (y0f+1).astype(mindspore.int32).clip(0, H-1)
    wx1 = (x - x0f).reshape(N, 1, Lq, P)
    wy1 = (y - y0f).reshape(N, 1, Lq, P)
    wx0 = 1.0 - wx1; wy0 = 1.0 - wy1

    def flat(yc, xc):
        return (yc * W + xc).reshape(N, LP).astype(mindspore.float16)

    hw_range = _mnp.arange(H * W).reshape(1, 1, H * W).astype(mindspore.float16)
    inp_hw = _ops.transpose(input_fp32.reshape(N, C, H*W), (0, 2, 1)).astype(mindspore.float16)

    def sample(yc, xc):
        oh = (flat(yc, xc).reshape(N, LP, 1) == hw_range).astype(mindspore.float16)
        out = _ops.matmul(oh, inp_hw)
        return _ops.transpose(out, (0, 2, 1)).reshape(N, C, Lq, P).astype(mindspore.float32)

    v00 = sample(y0c, x0c); v01 = sample(y0c, x1c)
    v10 = sample(y1c, x0c); v11 = sample(y1c, x1c)
    return wy0*(wx0*v00 + wx1*v01) + wy1*(wx0*v10 + wx1*v11)


def deformable_attention_core_func(value, value_spatial_shapes, sampling_locations, attention_weights):
    bs, _, n_head, c = value.shape
    _, Len_q, _, n_levels, n_points, _ = sampling_locations.shape
    _orig_dtype = value.dtype
    value_fp32 = value.astype(mindspore.float32)
    slocs_fp32 = sampling_locations.astype(mindspore.float32)

    split_shape = [h * w for h, w in value_spatial_shapes]
    value_list = []
    start = 0
    for s in split_shape:
        value_list.append(value_fp32[:, start:start+s, :, :])
        start += s

    sampling_grids = 2 * slocs_fp32 - 1
    sampling_value_list = []
    for level, (h, w) in enumerate(value_spatial_shapes):
        vl = value_list[level].flatten(start_dim=2).permute(0, 2, 1).reshape(bs*n_head, c, h, w)
        sgl = sampling_grids[:, :, :, level].permute(0, 2, 1, 3, 4).flatten(start_dim=0, end_dim=1)
        sampling_value_list.append(_bilinear_grid_sample_fp16(vl, sgl))

    aw = attention_weights.astype(mindspore.float32).permute(0, 2, 1, 3, 4).reshape(
        bs*n_head, 1, Len_q, n_levels*n_points)
    output = (torch.stack(sampling_value_list, dim=-2).flatten(-2) * aw).sum(-1).reshape(bs, n_head*c, Len_q)
    return output.permute(0, 2, 1).astype(_orig_dtype)


def deformable_attention_core_func_v2(value, value_spatial_shapes, sampling_locations,
                                       attention_weights, num_points_list, method='default'):
    bs, _, n_head, c = value.shape
    _, Len_q, _, _, _ = sampling_locations.shape
    _orig_dtype = value.dtype
    value_fp32 = value.astype(mindspore.float32)
    slocs_fp32 = sampling_locations.astype(mindspore.float32)
    aw_fp32 = attention_weights.astype(mindspore.float32)

    # (bs, total_hw, n_head, c) -> (bs*n_head, c, total_hw)
    value_perm = value_fp32.permute(0, 2, 3, 1).reshape(bs*n_head, c, -1)

    split_shape = [h * w for h, w in value_spatial_shapes]
    value_list = []
    start = 0
    for s in split_shape:
        value_list.append(value_perm[:, :, start:start+s])
        start += s

    if method == 'default':
        sampling_grids = 2 * slocs_fp32 - 1
    else:
        sampling_grids = slocs_fp32

    # (bs, Len_q, n_head, total_pts, 2) -> (bs*n_head, Len_q, total_pts, 2)
    sampling_grids = sampling_grids.permute(0, 2, 1, 3, 4).reshape(bs*n_head, Len_q, -1, 2)

    sloc_list = []
    start = 0
    for s in num_points_list:
        sloc_list.append(sampling_grids[:, :, start:start+s, :])
        start += s

    sampling_value_list = []
    for level, (h, w) in enumerate(value_spatial_shapes):
        vl = value_list[level].reshape(bs*n_head, c, h, w)
        sgl = sloc_list[level]  # (bs*n_head, Len_q, P, 2)
        if method == 'default':
            sampling_value_list.append(_bilinear_grid_sample_fp16(vl, sgl))
        else:
            sg = sgl * mindspore.Tensor([[w, h]]) + 0.5
            xi = sg[..., 0].astype(mindspore.int32).clip(0, w-1)
            yi = sg[..., 1].astype(mindspore.int32).clip(0, h-1)
            NM = bs*n_head; LP2 = Len_q*num_points_list[level]
            fi = (yi*w + xi).reshape(NM, LP2).astype(mindspore.float16)
            hwr = _mnp.arange(h*w).reshape(1, 1, h*w).astype(mindspore.float16)
            oh = (fi.reshape(NM, LP2, 1) == hwr).astype(mindspore.float16)
            inh = _ops.transpose(vl.reshape(NM, c, h*w), (0, 2, 1)).astype(mindspore.float16)
            out = _ops.matmul(oh, inh)
            sampling_value_list.append(_ops.transpose(out, (0, 2, 1)).reshape(
                NM, c, Len_q, num_points_list[level]).astype(mindspore.float32))

    aw = aw_fp32.permute(0, 2, 1, 3).reshape(bs*n_head, 1, Len_q, sum(num_points_list))
    output = (torch.concat(sampling_value_list, dim=-1) * aw).sum(-1).reshape(bs, n_head*c, Len_q)
    return output.permute(0, 2, 1).astype(_orig_dtype)


def get_activation(act, inpace=True):
    if act is None:
        return nn.Identity()
    elif isinstance(act, nn.Cell):
        return act
    act = act.lower()
    if act in ('silu', 'swish'): m = nn.SiLU()
    elif act == 'relu': m = nn.ReLU()
    elif act == 'leaky_relu': m = nn.LeakyReLU()
    elif act == 'gelu': m = nn.GELU()
    elif act == 'hardsigmoid': m = nn.Hardsigmoid()
    else: raise RuntimeError('')
    if hasattr(m, 'inplace'):
        m.inplace = inpace
    return m
