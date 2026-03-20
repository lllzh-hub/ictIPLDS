"""
全局 mindspore.mint.nn 兼容补丁
用法：import src.nn_compat as nn  (替代 import mindspore.mint.nn as nn)

Ascend 310B 特殊处理：
  310B 的 aclnn 算子（Conv2d/AvgPool2d/MaxPool2d）不支持 fp32，通过 *Fp16 包装器
  在算子前将输入转 fp16，算子后转回原始精度，透明兼容所有上层代码。
  Linear / BN / LayerNorm 等保持 fp32，不做 cast。
"""
import mindspore.mint.nn as _mint_nn
import mindspore.nn as _msnn
import mindspore as _ms
import mindspore.ops as _ops


# -----------------------------------------------------------------------
# Ascend 310B 专用：Conv2d fp16 包装器
# 直接继承 mindspore.nn.Conv2d，保持参数路径和 weight/bias 属性不变
# -----------------------------------------------------------------------
class Conv2dFp16(_msnn.Conv2d):
    """
    Ascend 310B 兼容卷积：直接继承 mindspore.nn.Conv2d。
    construct 中无论输入/权重是什么 dtype，均 cast 到 fp16 执行卷积，
    输出恢复原始精度。参数路径和 weight/bias 属性与原生完全一致。
    """
    def __init__(self, in_channels, out_channels, kernel_size, stride=1,
                 padding=0, dilation=1, groups=1, bias=True,
                 padding_mode='zeros', **kwargs):
        if isinstance(padding, (tuple, list)):
            pad_mode = 'pad'
            ms_pad = padding if len(padding) == 4 else (
                padding[0], padding[0], padding[1], padding[1]
            )
        elif isinstance(padding, int) and padding == 0:
            pad_mode = 'valid'
            ms_pad = 0
        else:
            pad_mode = 'pad'
            ms_pad = padding

        super().__init__(
            in_channels=in_channels,
            out_channels=out_channels,
            kernel_size=kernel_size,
            stride=stride,
            pad_mode=pad_mode,
            padding=ms_pad,
            dilation=dilation,
            group=groups,
            has_bias=bool(bias),
        )

    def construct(self, x):
        in_dtype = x.dtype
        # 310B Conv2d 算子只接受 fp16，权重也 cast
        x16 = x.astype(_ms.float16)
        w16 = self.weight.astype(_ms.float16)
        conv_op = _ops.operations.Conv2D(
            out_channel=self.out_channels,
            kernel_size=self.kernel_size,
            mode=1,
            pad_mode=self.pad_mode,
            pad=self.padding,
            stride=self.stride,
            dilation=self.dilation,
            group=self.group,
        )
        out16 = conv_op(x16, w16)
        if self.bias is not None:
            out16 = out16 + self.bias.astype(_ms.float16).reshape(1, -1, 1, 1)
        return out16.astype(in_dtype)


# -----------------------------------------------------------------------
# Ascend 310B 专用：AvgPool2d fp16 包装器
# 310B AvgPool2d 不支持 fp32 输入（EZ1001），cast 到 fp16 后执行
# -----------------------------------------------------------------------
class AvgPool2dFp16(_msnn.AvgPool2d):
    """Ascend 310B 兼容 AvgPool2d：输入 cast fp16，输出恢复原始精度。"""

    def __init__(self, kernel_size, stride=None, padding=0, ceil_mode=False,
                 count_include_pad=True, **kwargs):
        stride = stride if stride is not None else kernel_size
        # mindspore.nn.AvgPool2d pad_mode: 'valid'/'same'/'pad'
        if isinstance(padding, int) and padding == 0:
            pad_mode = 'valid'
        else:
            pad_mode = 'pad'
        super().__init__(
            kernel_size=kernel_size,
            stride=stride,
            pad_mode=pad_mode,
            padding=padding,
            ceil_mode=ceil_mode,
        )

    def construct(self, x):
        in_dtype = x.dtype
        out16 = super().construct(x.astype(_ms.float16))
        return out16.astype(in_dtype)


# -----------------------------------------------------------------------
# Ascend 310B 专用：MaxPool2d fp16 包装器
# -----------------------------------------------------------------------
class MaxPool2dFp16(_msnn.MaxPool2d):
    """Ascend 310B 兼容 MaxPool2d：输入 cast fp16，输出恢复原始精度。"""

    def __init__(self, kernel_size, stride=None, padding=0,
                 pad_mode=None, ceil_mode=False, **kwargs):
        stride = stride if stride is not None else kernel_size
        if pad_mode is not None:
            # 直接透传 mindspore 风格 pad_mode（如 'pad'）
            super().__init__(
                kernel_size=kernel_size,
                stride=stride,
                pad_mode=pad_mode,
                padding=kwargs.get('padding', padding),
            )
        elif isinstance(padding, int) and padding == 0:
            super().__init__(kernel_size=kernel_size, stride=stride, pad_mode='valid')
        else:
            super().__init__(kernel_size=kernel_size, stride=stride,
                             pad_mode='pad', padding=padding)

    def construct(self, x):
        in_dtype = x.dtype
        out16 = super().construct(x.astype(_ms.float16))
        return out16.astype(in_dtype)


# -----------------------------------------------------------------------
# Ascend 310B 专用：BatchNorm2d
# mindspore.mint.nn.BatchNorm2d 走 aclnnBatchNorm，310B 未实现
# mindspore.nn.BatchNorm2d 走旧版内核，310B 支持，保持 fp32
# 同时兼容 PyTorch 风格属性 running_mean/running_var/weight/bias
# -----------------------------------------------------------------------
class BatchNorm2d310B(_msnn.BatchNorm2d):
    """Ascend 310B 兼容 BatchNorm2d（fp32 旧版内核）。
    整网 fp16 时输入可能是 fp16，需要 cast fp32 后执行，输出转回原始精度。"""

    def construct(self, x):
        in_dtype = x.dtype
        out = super().construct(x.astype(_ms.float32))
        return out.astype(in_dtype)


    @property
    def running_mean(self):
        return self.moving_mean

    @property
    def running_var(self):
        return self.moving_variance

    @property
    def weight(self):
        return self.gamma

    @weight.setter
    def weight(self, value):
        self.gamma = value

    @property
    def bias(self):
        return self.beta

    @bias.setter
    def bias(self, value):
        self.beta = value


# -----------------------------------------------------------------------
# LayerNorm 兼容包装器
# PyTorch 风格：LayerNorm(int) 或 LayerNorm((int,))
# MindSpore：normalized_shape 必须是 tuple 或 list
# -----------------------------------------------------------------------
class LayerNormCompat(_msnn.LayerNorm):
    """兼容 PyTorch LayerNorm(int) 调用方式，并在 310B 上将输入 cast fp16。"""
    def __init__(self, normalized_shape, eps=1e-5, elementwise_affine=True, **kwargs):
        if isinstance(normalized_shape, int):
            normalized_shape = (normalized_shape,)
        elif isinstance(normalized_shape, list):
            normalized_shape = tuple(normalized_shape)
        super().__init__(normalized_shape, epsilon=eps)

    def construct(self, x):
        # 310B：用 mindspore.mint.nn.functional.layer_norm，走 aclnnLayerNorm 内核
        import mindspore.mint.nn.functional as _mF
        in_dtype = x.dtype
        x16 = x.astype(_ms.float16)
        g16 = self.gamma.astype(_ms.float16)
        b16 = self.beta.astype(_ms.float16)
        out = _mF.layer_norm(x16, self.normalized_shape, g16, b16, self.epsilon)
        return out.astype(in_dtype)


# -----------------------------------------------------------------------
# Dropout 兼容包装器
# PyTorch 风格：Dropout(p=0.1)  p = drop 概率
# MindSpore 旧版：Dropout(keep_prob=0.9)  keep_prob = 1 - p
# -----------------------------------------------------------------------
class DropoutCompat(_msnn.Dropout):
    """兼容 PyTorch Dropout(p) 调用方式。"""
    def __init__(self, p=0.5, inplace=False):
        keep_prob = 1.0 - float(p)
        # keep_prob 必须在 (0, 1]，当 p=0 时 keep_prob=1.0 正好合法
        keep_prob = max(keep_prob, 1e-6)  # 防止 p=1.0 时 keep_prob=0
        super().__init__(keep_prob=keep_prob)


# -----------------------------------------------------------------------
# Linear (Dense) 兼容包装器
# PyTorch 风格：Linear(in, out, bias=True)
# MindSpore：Dense(in, out, has_bias=True)
# 310B matmul 不支持 fp32，construct 中 cast fp16
# -----------------------------------------------------------------------
class LinearFp16(_msnn.Dense):
    """兼容 PyTorch Linear(in, out) 调用，310B 上 cast fp16 执行 matmul。"""
    def __init__(self, in_features, out_features, bias=True, **kwargs):
        super().__init__(
            in_channels=in_features,
            out_channels=out_features,
            has_bias=bool(bias),
        )

    def construct(self, x):
        in_dtype = x.dtype
        x16 = x.astype(_ms.float16)
        w16 = self.weight.astype(_ms.float16)
        w16t = _ops.transpose(w16, (1, 0))
        out16 = _ops.matmul(x16, w16t)
        if self.bias is not None:
            out16 = out16 + self.bias.astype(_ms.float16)
        return out16.astype(in_dtype)


# -----------------------------------------------------------------------
# Activation fp16 包装器
# 310B 的 GELU / SiLU 算子不支持 fp32 输入
# -----------------------------------------------------------------------
class GELUFp16(_msnn.GELU):
    """310B 兼容 GELU：输入 cast fp16，输出恢复原始精度。"""
    def construct(self, x):
        in_dtype = x.dtype
        x16 = x.astype(_ms.float16)
        # 直接用 ops.gelu 避免 _msnn.GELU 内部走 fp32 路径
        out16 = _ops.gelu(x16)
        return out16.astype(in_dtype)


class SiLUFp16(_msnn.SiLU):
    """310B 兼容 SiLU：输入 cast fp16，输出恢复原始精度。"""
    def construct(self, x):
        in_dtype = x.dtype
        x16 = x.astype(_ms.float16)
        out16 = _ops.silu(x16)
        return out16.astype(in_dtype)


class ReLUFp16(_msnn.ReLU):
    """310B 兼容 ReLU：输入 cast fp16，输出恢复原始精度。"""
    def construct(self, x):
        in_dtype = x.dtype
        x16 = x.astype(_ms.float16)
        out16 = _ops.relu(x16)
        return out16.astype(in_dtype)


# -----------------------------------------------------------------------
# MultiheadAttention 兼容包装器
# 310B 内部 matmul 不支持 fp32
# 完全重写 construct，所有权重在运行时 cast fp16
# -----------------------------------------------------------------------
class MultiheadAttentionFp16(_msnn.MultiheadAttention):
    """310B 兼容 MultiheadAttention：所有 matmul 权重运行时 cast fp16。"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def construct(self, query, key, value, key_padding_mask=None,
                  need_weights=True, attn_mask=None, average_attn_weights=True):
        in_dtype = query.dtype
        B, T, C = query.shape
        S = key.shape[1]
        H = self.num_heads
        head_dim = C // H

        # cast 输入和所有权重到 fp16
        q16 = query.astype(_ms.float16)
        k16 = key.astype(_ms.float16)
        v16 = value.astype(_ms.float16)

        w = self.in_proj_weight.astype(_ms.float16)   # (3C, C)
        b = self.in_proj_bias.astype(_ms.float16) if self.in_proj_bias is not None else None

        # in-projection
        # q_w:(C,C) k_w:(C,C) v_w:(C,C)
        q_w, k_w, v_w = w[:C], w[C:2*C], w[2*C:]
        q_proj = _ops.matmul(q16, _ops.transpose(q_w, (1, 0)))
        k_proj = _ops.matmul(k16, _ops.transpose(k_w, (1, 0)))
        v_proj = _ops.matmul(v16, _ops.transpose(v_w, (1, 0)))
        if b is not None:
            q_proj = q_proj + b[:C]
            k_proj = k_proj + b[C:2*C]
            v_proj = v_proj + b[2*C:]

        # reshape for multi-head: (B, seq, H, head_dim) -> (B*H, seq, head_dim)
        q_proj = q_proj.reshape(B, T, H, head_dim).transpose(0, 2, 1, 3).reshape(B*H, T, head_dim)
        k_proj = k_proj.reshape(B, S, H, head_dim).transpose(0, 2, 1, 3).reshape(B*H, S, head_dim)
        v_proj = v_proj.reshape(B, S, H, head_dim).transpose(0, 2, 1, 3).reshape(B*H, S, head_dim)

        # scaled dot-product attention
        scale = float(head_dim) ** -0.5
        attn = _ops.matmul(q_proj, _ops.transpose(k_proj, (0, 2, 1))) * scale  # (B*H, T, S)
        if attn_mask is not None:
            if attn_mask.ndim == 2:
                attn = attn + attn_mask.astype(_ms.float16)
            else:
                attn = attn + attn_mask.reshape(B*H, T, S).astype(_ms.float16)
        attn = attn.astype(_ms.float32)  # softmax in fp32 for stability
        attn = _ops.softmax(attn, -1).astype(_ms.float16)

        out = _ops.matmul(attn, v_proj)  # (B*H, T, head_dim)

        # reshape back: (B, T, C)
        out = out.reshape(B, H, T, head_dim).transpose(0, 2, 1, 3).reshape(B, T, C)

        # out projection
        out_w = self.out_proj.weight.astype(_ms.float16)
        out_b = self.out_proj.bias.astype(_ms.float16) if self.out_proj.bias is not None else None
        out = _ops.matmul(out, _ops.transpose(out_w, (1, 0)))
        if out_b is not None:
            out = out + out_b

        return out.astype(in_dtype), None



import sys as _sys

_mod = type(_sys)('nn_compat')

for _k in dir(_mint_nn):
    setattr(_mod, _k, getattr(_mint_nn, _k))

_missing = {
    "Sequential":         _msnn.SequentialCell,
    "SequentialCell":     _msnn.SequentialCell,
    "CellList":           _msnn.CellList,
    "ModuleList":         _msnn.CellList,
    "CellDict":           _msnn.CellDict,
    "ModuleDict":         _msnn.CellDict,
    "BatchNorm2d":        BatchNorm2d310B,
    "BatchNorm1d":        _msnn.BatchNorm1d,
    "GroupNorm":          _msnn.GroupNorm,
    "LayerNorm":          LayerNormCompat,
    "InstanceNorm2d":     _msnn.InstanceNorm2d,
    "Embedding":          _msnn.Embedding,
    "MultiheadAttention": MultiheadAttentionFp16,
    "Identity":           _msnn.Identity,
    "Dropout":            DropoutCompat,
    "LeakyReLU":          _msnn.LeakyReLU,
    "SiLU":               SiLUFp16,
    "GELU":               GELUFp16,
    "ReLU":               ReLUFp16,
    "ReLU6":              _msnn.ReLU6,
    "Hardsigmoid":        _msnn.HSigmoid,
    "Hardswish":          _msnn.HSwish,
    # Pool 层用 fp16 包装器
    "AvgPool2d":          AvgPool2dFp16,
    "MaxPool2d":          MaxPool2dFp16,
    "AdaptiveAvgPool2d":  _msnn.AdaptiveAvgPool2d,
    "ConvTranspose2d":    _msnn.Conv2dTranspose,
    "Linear":             LinearFp16,
    "Flatten":            _msnn.Flatten,
    "Cell":               _msnn.Cell,
    "Module":             _msnn.Cell,
}
for _k, _v in _missing.items():
        setattr(_mod, _k, _v)

# Conv2d -> Conv2dFp16（310B fp32 卷积不支持）
_mod.Conv2d      = Conv2dFp16
_mod.Conv2dFp16  = Conv2dFp16
# BatchNorm2d -> BatchNorm2d310B（避免 aclnnBatchNorm）
_mod.BatchNorm2d     = BatchNorm2d310B
_mod.BatchNorm2d310B = BatchNorm2d310B
# Pool 层 fp16 包装器
_mod.AvgPool2d   = AvgPool2dFp16
_mod.MaxPool2d   = MaxPool2dFp16

_mod.MultiheadAttention     = MultiheadAttentionFp16
_mod.MultiheadAttentionFp16 = MultiheadAttentionFp16
_mod.Linear                 = LinearFp16
_mod.LinearFp16             = LinearFp16

_mod.Cell   = _msnn.Cell
_mod.Module = _msnn.Cell

_sys.modules[__name__] = _mod

del _sys, _mod, _mint_nn, _msnn, _missing, _k, _v
