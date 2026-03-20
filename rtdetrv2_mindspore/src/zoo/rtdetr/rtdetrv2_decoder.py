import mindspore
import numpy as np
"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import math 
import copy 
import functools
from collections import OrderedDict

import mindspore.mint as torch
from mindspore import Tensor
import src.nn_compat as nn
import mindspore.nn as _msnn
# 补充 mindspore.mint.nn 缺少的容器类
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
import mindspore.common.initializer as _ms_init
import sys, os as _os
sys.path.insert(0, _os.path.join(_os.path.dirname(__file__), "..", "..", "nn", "backbone"))
import ms_init_compat as init
from ...nn_init_compat import *
import sys as _sys; import importlib as _il
import src.nn_init_compat as init
from typing import List

from .denoising import get_contrastive_denoising_training_group
from .utils import deformable_attention_core_func_v2, get_activation, inverse_sigmoid
from .utils import bias_init_with_prob

from ...core import register

__all__ = ['RTDETRTransformerv2']


class MLP(nn.Cell):
    def __init__(self, input_dim, hidden_dim, output_dim, num_layers, act='relu'):
        super().__init__()
        self.num_layers = num_layers
        h = [hidden_dim] * (num_layers - 1)
        self.layers = nn.CellList(list(nn.Linear(n, k) for n, k in zip([input_dim] + h, h + [output_dim])))
        self.act = get_activation(act)

    def construct(self, x):
        for i, layer in enumerate(self.layers):
            x = self.act(layer(x)) if i < self.num_layers - 1 else layer(x)
        return x


class MSDeformableAttention(nn.Cell):
    def __init__(
        self, 
        embed_dim=256, 
        num_heads=8, 
        num_levels=4, 
        num_points=4, 
        method='default',
        offset_scale=0.5,
    ):
        """Multi-Scale Deformable Attention
        """
        super(MSDeformableAttention, self).__init__()
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.num_levels = num_levels
        self.offset_scale = offset_scale

        if isinstance(num_points, list):
            assert len(num_points) == num_levels, ''
            num_points_list = num_points
        else:
            num_points_list = [num_points for _ in range(num_levels)]

        self.num_points_list = num_points_list
        
        num_points_scale = [1/n for n in num_points_list for _ in range(n)]
        self.num_points_scale = mindspore.Parameter(mindspore.Tensor(num_points_scale, mindspore.float32), name="num_points_scale", requires_grad=False)

        self.total_points = num_heads * sum(num_points_list)
        self.method = method

        self.head_dim = embed_dim // num_heads
        assert self.head_dim * num_heads == self.embed_dim, "embed_dim must be divisible by num_heads"

        self.sampling_offsets = nn.Linear(embed_dim, self.total_points * 2)
        self.attention_weights = nn.Linear(embed_dim, self.total_points)
        self.value_proj = nn.Linear(embed_dim, embed_dim)
        self.output_proj = nn.Linear(embed_dim, embed_dim)

        self.ms_deformable_attn_core = functools.partial(deformable_attention_core_func_v2, method=self.method) 

        self._reset_parameters()

        if method == 'discrete':
            for p in self.sampling_offsets.get_parameters():
                p.requires_grad = False

    def _reset_parameters(self):
        import numpy as np
        import mindspore
        # sampling_offsets - 用 numpy 初始化权重，避免在构建期调用 NPU ops
        # weight 置零
        if hasattr(self.sampling_offsets, 'weight') and self.sampling_offsets.weight is not None:
            self.sampling_offsets.weight.set_data(
                mindspore.Tensor(np.zeros(self.sampling_offsets.weight.shape, dtype=np.float32)))
        # bias 初始化
        thetas = np.arange(self.num_heads, dtype=np.float32) * (2.0 * math.pi / self.num_heads)
        grid_init = np.stack([np.cos(thetas), np.sin(thetas)], axis=-1)
        abs_max = np.abs(grid_init).max(axis=-1, keepdims=True)
        abs_max = np.where(abs_max == 0, 1, abs_max)
        grid_init = grid_init / abs_max
        grid_init = np.tile(grid_init.reshape(self.num_heads, 1, 2), [1, sum(self.num_points_list), 1])
        scaling = np.concatenate([np.arange(1, n + 1) for n in self.num_points_list]).reshape(1, -1, 1)
        grid_init = grid_init * scaling
        if hasattr(self.sampling_offsets, 'bias') and self.sampling_offsets.bias is not None:
            self.sampling_offsets.bias.set_data(
                mindspore.Tensor(grid_init.flatten().astype(np.float32)))

        # attention_weights - 置零
        if hasattr(self.attention_weights, 'weight') and self.attention_weights.weight is not None:
            self.attention_weights.weight.set_data(
                mindspore.Tensor(np.zeros(self.attention_weights.weight.shape, dtype=np.float32)))
        if hasattr(self.attention_weights, 'bias') and self.attention_weights.bias is not None:
            self.attention_weights.bias.set_data(
                mindspore.Tensor(np.zeros(self.attention_weights.bias.shape, dtype=np.float32)))

    def construct(self,
                query: torch.Tensor,
                reference_points: torch.Tensor,
                value: torch.Tensor,
                value_spatial_shapes: List[int],
                value_mask: torch.Tensor=None):
        """
        Args:
            query (Tensor): [bs, query_length, C]
            reference_points (Tensor): [bs, query_length, n_levels, 2], range in [0, 1], top-left (0,0),
                bottom-right (1, 1), including padding area
            value (Tensor): [bs, value_length, C]
            value_spatial_shapes (List): [n_levels, 2], [(H_0, W_0), (H_1, W_1), ..., (H_{L-1}, W_{L-1})]
            value_mask (Tensor): [bs, value_length], True for non-padding elements, False for padding elements

        Returns:
            output (Tensor): [bs, Length_{query}, C]
        """
        bs, Len_q = query.shape[:2]
        Len_v = value.shape[1]

        value = self.value_proj(value)
        if value_mask is not None:
            value = value * value_mask.to(value.dtype).unsqueeze(-1)

        value = value.reshape(bs, Len_v, self.num_heads, self.head_dim)

        sampling_offsets: torch.Tensor = self.sampling_offsets(query)
        sampling_offsets = sampling_offsets.reshape(bs, Len_q, self.num_heads, sum(self.num_points_list), 2)

        attention_weights = self.attention_weights(query).reshape(bs, Len_q, self.num_heads, sum(self.num_points_list))
        attention_weights = F.softmax(attention_weights, dim=-1).reshape(bs, Len_q, self.num_heads, sum(self.num_points_list))

        if reference_points.shape[-1] == 2:
            offset_normalizer = mindspore.Tensor(value_spatial_shapes)
            offset_normalizer = offset_normalizer.flip([1]).reshape(1, 1, 1, self.num_levels, 1, 2)
            sampling_locations = reference_points.reshape(bs, Len_q, 1, self.num_levels, 1, 2) + sampling_offsets / offset_normalizer
        elif reference_points.shape[-1] == 4:
            # reference_points [8, 480, None, 1,  4]
            # sampling_offsets [8, 480, 8,    12, 2]
            num_points_scale = self.num_points_scale.to(dtype=query.dtype).unsqueeze(-1)
            offset = sampling_offsets * num_points_scale * reference_points[:, :, None, :, 2:] * self.offset_scale
            sampling_locations = reference_points[:, :, None, :, :2] + offset
        else:
            raise ValueError(
                "Last dim of reference_points must be 2 or 4, but get {} instead.".
                format(reference_points.shape[-1]))

        # 310B: grid_sample 只支持 fp32，在进入 deformable attn 前 cast 所有浮点输入
        import mindspore as _ms_da
        _da_orig_dtype = value.dtype
        output = self.ms_deformable_attn_core(
            value.astype(_ms_da.float32),
            value_spatial_shapes,
            sampling_locations.astype(_ms_da.float32),
            attention_weights.astype(_ms_da.float32),
            self.num_points_list)
        output = output.astype(_da_orig_dtype)

        output = self.output_proj(output)

        return output


class TransformerDecoderLayer(nn.Cell):
    def __init__(self,
                 d_model=256,
                 n_head=8,
                 dim_feedforward=1024,
                 dropout=0.,
                 activation='relu',
                 n_levels=4,
                 n_points=4,
                 cross_attn_method='default'):
        super(TransformerDecoderLayer, self).__init__()

        # self attention
        self.self_attn = nn.MultiheadAttention(d_model, n_head, dropout=dropout, batch_first=True)
        self.dropout1 = nn.Dropout(dropout)
        self.norm1 = nn.LayerNorm(d_model)

        # cross attention
        self.cross_attn = MSDeformableAttention(d_model, n_head, n_levels, n_points, method=cross_attn_method)
        self.dropout2 = nn.Dropout(dropout)
        self.norm2 = nn.LayerNorm(d_model)

        # ffn
        self.linear1 = nn.Linear(d_model, dim_feedforward)
        self.activation = get_activation(activation)
        self.dropout3 = nn.Dropout(dropout)
        self.linear2 = nn.Linear(dim_feedforward, d_model)
        self.dropout4 = nn.Dropout(dropout)
        self.norm3 = nn.LayerNorm(d_model)
        
        self._reset_parameters()

    def _reset_parameters(self):
        pass  # weights loaded from checkpoint

    def with_pos_embed(self, tensor, pos):
        return tensor if pos is None else tensor + pos

    def forward_ffn(self, tgt):
        return self.linear2(self.dropout3(self.activation(self.linear1(tgt))))

    def construct(self,
                target,
                reference_points,
                memory,
                memory_spatial_shapes,
                attn_mask=None,
                memory_mask=None,
                query_pos_embed=None):
        # self attention
        q = k = self.with_pos_embed(target, query_pos_embed)

        target2, _ = self.self_attn(q, k, target, attn_mask=attn_mask)
        target = target + self.dropout1(target2)
        target = self.norm1(target)

        # cross attention
        target2 = self.cross_attn(\
            self.with_pos_embed(target, query_pos_embed), 
            reference_points, 
            memory, 
            memory_spatial_shapes, 
            memory_mask)
        target = target + self.dropout2(target2)
        target = self.norm2(target)

        # ffn
        target2 = self.forward_ffn(target)
        target = target + self.dropout4(target2)
        target = self.norm3(target)

        return target


class TransformerDecoder(nn.Cell):
    def __init__(self, hidden_dim, decoder_layer, num_layers, eval_idx=-1):
        super(TransformerDecoder, self).__init__()
        self.layers = nn.CellList([copy.deepcopy(decoder_layer) for _ in range(num_layers)])
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.eval_idx = eval_idx if eval_idx >= 0 else num_layers + eval_idx

    def construct(self,
                target,
                ref_points_unact,
                memory,
                memory_spatial_shapes,
                bbox_head,
                score_head,
                query_pos_head,
                attn_mask=None,
                memory_mask=None):
        dec_out_bboxes = []
        dec_out_logits = []
        ref_points_detach = F.sigmoid(ref_points_unact)

        output = target
        for i, layer in enumerate(self.layers):
            ref_points_input = ref_points_detach.unsqueeze(2)
            query_pos_embed = query_pos_head(ref_points_detach)

            output = layer(output, ref_points_input, memory, memory_spatial_shapes, attn_mask, memory_mask, query_pos_embed)

            inter_ref_bbox = F.sigmoid(bbox_head[i](output) + inverse_sigmoid(ref_points_detach))

            if self.training:
                dec_out_logits.append(score_head[i](output))
                if i == 0:
                    dec_out_bboxes.append(inter_ref_bbox)
                else:
                    dec_out_bboxes.append(F.sigmoid(bbox_head[i](output) + inverse_sigmoid(ref_points)))

            elif i == self.eval_idx:
                dec_out_logits.append(score_head[i](output))
                dec_out_bboxes.append(inter_ref_bbox)
                break

            ref_points = inter_ref_bbox
            ref_points_detach = inter_ref_bbox

        return torch.stack(dec_out_bboxes), torch.stack(dec_out_logits)


@register()
class RTDETRTransformerv2(nn.Cell):
    __share__ = ['num_classes', 'eval_spatial_size']

    def __init__(self,
                 num_classes=80,
                 hidden_dim=256,
                 num_queries=300,
                 feat_channels=[512, 1024, 2048],
                 feat_strides=[8, 16, 32],
                 num_levels=3,
                 num_points=4,
                 nhead=8,
                 num_layers=6,
                 dim_feedforward=1024,
                 dropout=0.,
                 activation="relu",
                 num_denoising=100,
                 label_noise_ratio=0.5,
                 box_noise_scale=1.0,
                 learn_query_content=False,
                 eval_spatial_size=None,
                 eval_idx=-1,
                 eps=1e-2, 
                 aux_loss=True, 
                 cross_attn_method='default', 
                 query_select_method='default'):
        super().__init__()
        assert len(feat_channels) <= num_levels
        assert len(feat_strides) == len(feat_channels)
        
        for _ in range(num_levels - len(feat_strides)):
            feat_strides.append(feat_strides[-1] * 2)

        self.hidden_dim = hidden_dim
        self.nhead = nhead
        self.feat_strides = feat_strides
        self.num_levels = num_levels
        self.num_classes = num_classes
        self.num_queries = num_queries
        self.eps = eps
        self.num_layers = num_layers
        self.eval_spatial_size = eval_spatial_size
        self.aux_loss = aux_loss

        assert query_select_method in ('default', 'one2many', 'agnostic'), ''
        assert cross_attn_method in ('default', 'discrete'), ''
        self.cross_attn_method = cross_attn_method
        self.query_select_method = query_select_method

        # backbone feature projection
        self._build_input_proj_layer(feat_channels)

        # Transformer module
        decoder_layer = TransformerDecoderLayer(hidden_dim, nhead, dim_feedforward, dropout, \
            activation, num_levels, num_points, cross_attn_method=cross_attn_method)
        self.decoder = TransformerDecoder(hidden_dim, decoder_layer, num_layers, eval_idx)

        # denoising
        self.num_denoising = num_denoising
        self.label_noise_ratio = label_noise_ratio
        self.box_noise_scale = box_noise_scale
        if num_denoising > 0: 
            self.denoising_class_embed = nn.Embedding(num_classes+1, hidden_dim, padding_idx=num_classes)
            pass  # init skipped: weights loaded from checkpoint

        # decoder embedding
        self.learn_query_content = learn_query_content
        if learn_query_content:
            self.tgt_embed = nn.Embedding(num_queries, hidden_dim)
        self.query_pos_head = MLP(4, 2 * hidden_dim, hidden_dim, 2)

        # if num_select_queries != self.num_queries:
        #     layer = TransformerEncoderLayer(hidden_dim, nhead, dim_feedforward, activation='gelu')
        #     self.encoder = TransformerEncoder(layer, 1)

        self.enc_output = nn.Sequential(OrderedDict([
            ('proj', nn.Linear(hidden_dim, hidden_dim)),
            ('norm', nn.LayerNorm(hidden_dim,)),
        ]))

        if query_select_method == 'agnostic':
            self.enc_score_head = nn.Linear(hidden_dim, 1)
        else:
            self.enc_score_head = nn.Linear(hidden_dim, num_classes)

        self.enc_bbox_head = MLP(hidden_dim, hidden_dim, 4, 3)

        # decoder head
        self.dec_score_head = nn.CellList([
            nn.Linear(hidden_dim, num_classes) for _ in range(num_layers)
        ])
        self.dec_bbox_head = nn.CellList([
            MLP(hidden_dim, hidden_dim, 4, 3) for _ in range(num_layers)
        ])

        # init encoder output anchors and valid_mask
        if self.eval_spatial_size:
            anchors, valid_mask = self._generate_anchors()
            self.anchors = mindspore.Parameter(anchors, requires_grad=False)
            self.valid_mask = mindspore.Parameter(valid_mask, requires_grad=False)

        self._reset_parameters()
        
    def _reset_parameters(self):
        pass  # weights loaded from checkpoint

    def _build_input_proj_layer(self, feat_channels):
        self.input_proj = nn.CellList()
        for in_channels in feat_channels:
            self.input_proj.append(
                nn.Sequential(OrderedDict([
                    ('conv', nn.Conv2d(in_channels, self.hidden_dim, 1, bias=False)), 
                    ('norm', nn.BatchNorm2d(self.hidden_dim,))])
                )
            )

        in_channels = feat_channels[-1]

        for _ in range(self.num_levels - len(feat_channels)):
            self.input_proj.append(
                nn.Sequential(OrderedDict([
                    ('conv', nn.Conv2d(in_channels, self.hidden_dim, 3, 2, padding=1, bias=False)),
                    ('norm', nn.BatchNorm2d(self.hidden_dim))])
                )
            )
            in_channels = self.hidden_dim

    def _get_encoder_input(self, feats: List[torch.Tensor]):
        # get projection features
        proj_feats = [self.input_proj[i](feat) for i, feat in enumerate(feats)]
        if self.num_levels > len(proj_feats):
            len_srcs = len(proj_feats)
            for i in range(len_srcs, self.num_levels):
                if i == len_srcs:
                    proj_feats.append(self.input_proj[i](feats[-1]))
                else:
                    proj_feats.append(self.input_proj[i](proj_feats[-1]))

        # get encoder inputs
        feat_flatten = []
        spatial_shapes = []
        for i, feat in enumerate(proj_feats):
            _, _, h, w = feat.shape
            # [b, c, h, w] -> [b, h*w, c]
            feat_flatten.append(feat.flatten(start_dim=2).permute(0, 2, 1))
            # [num_levels, 2]
            spatial_shapes.append([h, w])
        # [b, l, c]
        feat_flatten = torch.concat(feat_flatten, 1)
        return feat_flatten, spatial_shapes

    def _generate_anchors(self,
                          spatial_shapes=None,
                          grid_size=0.05,
                          dtype=None,
                          device='cpu'):
        """用 numpy 生成 anchors，避免在构建期调用 NPU ops"""
        import numpy as np
        import mindspore
        if spatial_shapes is None:
            spatial_shapes = []
            eval_h, eval_w = self.eval_spatial_size
            for s in self.feat_strides:
                spatial_shapes.append([int(eval_h / s), int(eval_w / s)])

        anchors = []
        for lvl, (h, w) in enumerate(spatial_shapes):
            grid_y, grid_x = np.meshgrid(np.arange(h), np.arange(w), indexing='ij')
            grid_xy = np.stack([grid_x, grid_y], axis=-1).astype(np.float32)
            grid_xy = (grid_xy[None] + 0.5) / np.array([w, h], dtype=np.float32)
            wh = np.ones_like(grid_xy) * grid_size * (2.0 ** lvl)
            lvl_anchors = np.concatenate([grid_xy, wh], axis=-1).reshape(-1, h * w, 4)
            anchors.append(lvl_anchors)

        anchors = np.concatenate(anchors, axis=1)
        valid_mask = ((anchors > self.eps) & (anchors < 1 - self.eps)).all(-1, keepdims=True)
        anchors = np.log(anchors / (1 - anchors + 1e-9) + 1e-9)
        anchors = np.where(valid_mask, anchors, np.inf)

        anchors_t = mindspore.Tensor(anchors.astype(np.float32))
        valid_mask_t = mindspore.Tensor(valid_mask)
        return anchors_t, valid_mask_t


    def _get_decoder_input(self,
                           memory: torch.Tensor,
                           spatial_shapes,
                           denoising_logits=None,
                           denoising_bbox_unact=None):

        # prepare input for decoder
        if self.training or self.eval_spatial_size is None:
            anchors, valid_mask = self._generate_anchors(spatial_shapes, device=memory.device)
        else:
            anchors = self.anchors
            valid_mask = self.valid_mask

        # memory = torch.where(valid_mask, memory, 0)
        # TODO fix type error for onnx export 
        memory = valid_mask.to(memory.dtype) * memory  

        output_memory :torch.Tensor = self.enc_output(memory)
        enc_outputs_logits :torch.Tensor = self.enc_score_head(output_memory)
        enc_outputs_coord_unact :torch.Tensor = self.enc_bbox_head(output_memory) + anchors

        enc_topk_bboxes_list, enc_topk_logits_list = [], []
        enc_topk_memory, enc_topk_logits, enc_topk_bbox_unact = \
            self._select_topk(output_memory, enc_outputs_logits, enc_outputs_coord_unact, self.num_queries)
            
        if self.training:
            enc_topk_bboxes = F.sigmoid(enc_topk_bbox_unact)
            enc_topk_bboxes_list.append(enc_topk_bboxes)
            enc_topk_logits_list.append(enc_topk_logits)

        # if self.num_select_queries != self.num_queries:            
        #     raise NotImplementedError('')

        if self.learn_query_content:
            content = self.tgt_embed.weight.unsqueeze(0).tile([memory.shape[0], 1, 1])
        else:
            content = enc_topk_memory
            
        enc_topk_bbox_unact = enc_topk_bbox_unact
        
        if denoising_bbox_unact is not None:
            enc_topk_bbox_unact = torch.concat([denoising_bbox_unact, enc_topk_bbox_unact], dim=1)
            content = torch.concat([denoising_logits, content], dim=1)
        
        return content, enc_topk_bbox_unact, enc_topk_bboxes_list, enc_topk_logits_list

    def _select_topk(self, memory, outputs_logits, outputs_coords_unact, topk):
        import mindspore.ops as _ops2
        import mindspore as _ms2
        topk_op = _ops2.TopK(sorted=True)

        if self.query_select_method == 'default':
            scores = outputs_logits.max(-1)[0]          # (B, N)
            _, topk_ind = topk_op(scores, topk)         # (B, topk)

        elif self.query_select_method == 'one2many':
            flat = outputs_logits.reshape(outputs_logits.shape[0], -1)  # (B, N*C)
            _, topk_ind = topk_op(flat, topk)           # (B, topk)
            topk_ind = topk_ind // self.num_classes

        elif self.query_select_method == 'agnostic':
            scores = outputs_logits.squeeze(-1)         # (B, N)
            _, topk_ind = topk_op(scores, topk)         # (B, topk)

        # 310B: 用 batched Gather + offset 代替 GatherElements/one-hot，内存友好
        def _gather_batched(src, index_1d):
            # src: (B, N, D), index_1d: (B, K) -> (B, K, D)
            B2 = src.shape[0]
            N2 = src.shape[1]
            D2 = src.shape[2]
            K2 = index_1d.shape[1]
            src_flat = src.reshape(B2 * N2, D2)                                   # (B*N, D)
            offset = _ops2.cast(
                _ms2.Tensor(list(range(B2)), dtype=_ms2.int32) * N2,
                _ms2.int32
            ).reshape(B2, 1)                                                       # (B, 1)
            idx_flat = _ops2.cast(index_1d, _ms2.int32) + offset                 # (B, K)
            idx_flat = idx_flat.reshape(B2 * K2)                                  # (B*K,)
            gather = _ops2.Gather()
            out = gather(src_flat, idx_flat, 0)                                    # (B*K, D)
            return out.reshape(B2, K2, D2)                                         # (B, K, D)

        topk_coords = _gather_batched(outputs_coords_unact, topk_ind)
        topk_logits = _gather_batched(outputs_logits, topk_ind)
        topk_memory = _gather_batched(memory, topk_ind)

        return topk_memory, topk_logits, topk_coords

    def construct(self, feats, targets=None):
        # input projection and embedding
        memory, spatial_shapes = self._get_encoder_input(feats)
        
        # prepare denoising training
        if self.training and self.num_denoising > 0:
            denoising_logits, denoising_bbox_unact, attn_mask, dn_meta = \
                get_contrastive_denoising_training_group(targets, \
                    self.num_classes, 
                    self.num_queries, 
                    self.denoising_class_embed, 
                    num_denoising=self.num_denoising, 
                    label_noise_ratio=self.label_noise_ratio, 
                    box_noise_scale=self.box_noise_scale, )
        else:
            denoising_logits, denoising_bbox_unact, attn_mask, dn_meta = None, None, None, None

        init_ref_contents, init_ref_points_unact, enc_topk_bboxes_list, enc_topk_logits_list = \
            self._get_decoder_input(memory, spatial_shapes, denoising_logits, denoising_bbox_unact)

        # decoder
        out_bboxes, out_logits = self.decoder(
            init_ref_contents,
            init_ref_points_unact,
            memory,
            spatial_shapes,
            self.dec_bbox_head,
            self.dec_score_head,
            self.query_pos_head,
            attn_mask=attn_mask)

        if self.training and dn_meta is not None:
            dn_out_bboxes, out_bboxes = torch.split(out_bboxes, dn_meta['dn_num_split'], dim=2)
            dn_out_logits, out_logits = torch.split(out_logits, dn_meta['dn_num_split'], dim=2)

        out = {'pred_logits': out_logits[-1], 'pred_boxes': out_bboxes[-1]}

        if self.training and self.aux_loss:
            out['aux_outputs'] = self._set_aux_loss(out_logits[:-1], out_bboxes[:-1])
            out['enc_aux_outputs'] = self._set_aux_loss(enc_topk_logits_list, enc_topk_bboxes_list)
            out['enc_meta'] = {'class_agnostic': self.query_select_method == 'agnostic'}

            if dn_meta is not None:
                out['dn_aux_outputs'] = self._set_aux_loss(dn_out_logits, dn_out_bboxes)
                out['dn_meta'] = dn_meta

        return out


    def _set_aux_loss(self, outputs_class, outputs_coord):
        # this is a workaround to make torchscript happy, as torchscript
        # doesn't support dictionary with non-homogeneous values, such
        # as a dict having both a Tensor and a list.
        return [{'pred_logits': a, 'pred_boxes': b}
                for a, b in zip(outputs_class, outputs_coord)]
