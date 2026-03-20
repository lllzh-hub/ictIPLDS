"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
RT-DETRv2 Decoder with DFL-compatible regression head (4*reg_max output) - MindSpore版本
"""

import math
import copy
import functools
from collections import OrderedDict
from typing import List

import numpy as np
import mindspore
import mindspore.mint as torch
import src.nn_compat as nn
import mindspore.nn as _msnn
# 补充 mindspore.mint.nn 缺少的容器类
for _cls in ["CellList", "CellDict", "SequentialCell", "Sequential",
             "ModuleList", "ModuleDict", "BatchNorm2d", "GroupNorm",
             "LayerNorm", "InstanceNorm2d", "Embedding", "MultiheadAttention",
             "Identity", "Dropout", "LeakyReLU", "SiLU", "GELU",
             "Hardsigmoid", "Hardswish", "ReLU6", "AvgPool2d", "MaxPool2d",
             "AdaptiveAvgPool2d", "ConvTranspose2d", "PixelShuffle", "Flatten"]:
    if not hasattr(nn, _cls) and hasattr(_msnn, _cls):
        setattr(nn, _cls, getattr(_msnn, _cls))
del _msnn, _cls

import mindspore.mint.nn.functional as F

from .denoising import get_contrastive_denoising_training_group
from .utils import deformable_attention_core_func_v2, get_activation, inverse_sigmoid
from .utils import bias_init_with_prob

from ...core import register

__all__ = ['RTDETRTransformerv2DFL']


class MLP(nn.Cell):
    def __init__(self, input_dim, hidden_dim, output_dim, num_layers, act='relu'):
        super().__init__()
        self.num_layers = num_layers
        h = [hidden_dim] * (num_layers - 1)
        self.layers = nn.CellList(
            list(nn.Linear(n, k) for n, k in zip([input_dim] + h, h + [output_dim]))
        )
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
        """Multi-Scale Deformable Attention - MindSpore版本"""
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

        num_points_scale = [1.0 / n for n in num_points_list for _ in range(n)]
        self.num_points_scale = mindspore.Parameter(
            mindspore.Tensor(num_points_scale, mindspore.float32),
            name="num_points_scale",
            requires_grad=False
        )

        self.total_points = num_heads * sum(num_points_list)
        self.method = method

        self.head_dim = embed_dim // num_heads
        assert self.head_dim * num_heads == self.embed_dim, "embed_dim must be divisible by num_heads"

        self.sampling_offsets = nn.Linear(embed_dim, self.total_points * 2)
        self.attention_weights = nn.Linear(embed_dim, self.total_points)
        self.value_proj = nn.Linear(embed_dim, embed_dim)
        self.output_proj = nn.Linear(embed_dim, embed_dim)

        self.ms_deformable_attn_core = functools.partial(
            deformable_attention_core_func_v2, method=self.method
        )

        self._reset_parameters()

        if method == 'discrete':
            for p in self.sampling_offsets.get_parameters():
                p.requires_grad = False

    def _reset_parameters(self):
        # sampling_offsets weight -> 0
        if hasattr(self.sampling_offsets, 'weight') and self.sampling_offsets.weight is not None:
            self.sampling_offsets.weight.set_data(
                mindspore.Tensor(np.zeros(self.sampling_offsets.weight.shape, dtype=np.float32))
            )
        # sampling_offsets bias: directional grid init
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
                mindspore.Tensor(grid_init.flatten().astype(np.float32))
            )
        # attention_weights -> 0
        if hasattr(self.attention_weights, 'weight') and self.attention_weights.weight is not None:
            self.attention_weights.weight.set_data(
                mindspore.Tensor(np.zeros(self.attention_weights.weight.shape, dtype=np.float32))
            )
        if hasattr(self.attention_weights, 'bias') and self.attention_weights.bias is not None:
            self.attention_weights.bias.set_data(
                mindspore.Tensor(np.zeros(self.attention_weights.bias.shape, dtype=np.float32))
            )

    def construct(self,
                  query: torch.Tensor,
                  reference_points: torch.Tensor,
                  value: torch.Tensor,
                  value_spatial_shapes: List[int],
                  value_mask: torch.Tensor = None):
        """
        Args:
            query (Tensor): [bs, query_length, C]
            reference_points (Tensor): [bs, query_length, n_levels, 4]  cx,cy,w,h
            value (Tensor): [bs, value_length, C]
            value_spatial_shapes (List): [n_levels, 2]
            value_mask (Tensor): [bs, value_length] optional
        Returns:
            output (Tensor): [bs, Length_{query}, C]
        """
        bs, Len_q = query.shape[:2]
        Len_v = value.shape[1]

        value = self.value_proj(value)
        if value_mask is not None:
            value = value * value_mask.to(value.dtype).unsqueeze(-1)
        value = value.reshape(bs, Len_v, self.num_heads, self.head_dim)

        sampling_offsets = self.sampling_offsets(query)
        sampling_offsets = sampling_offsets.reshape(
            bs, Len_q, self.num_heads, sum(self.num_points_list), 2
        )

        attention_weights = self.attention_weights(query).reshape(
            bs, Len_q, self.num_heads, sum(self.num_points_list)
        )
        attention_weights = F.softmax(attention_weights, dim=-1).reshape(
            bs, Len_q, self.num_heads, sum(self.num_points_list)
        )

        # reference_points shape[-1] == 4: cx,cy,w,h
        num_points_scale = self.num_points_scale.to(dtype=query.dtype).unsqueeze(-1)
        offset = sampling_offsets * num_points_scale * \
                 reference_points[:, :, None, :, 2:] * self.offset_scale
        sampling_locations = reference_points[:, :, None, :, :2] + offset

        output = self.ms_deformable_attn_core(
            value, value_spatial_shapes, sampling_locations, attention_weights, self.num_points_list
        )
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
        self.cross_attn = MSDeformableAttention(
            d_model, n_head, n_levels, n_points, method=cross_attn_method
        )
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
        target2 = self.cross_attn(
            self.with_pos_embed(target, query_pos_embed),
            reference_points,
            memory,
            memory_spatial_shapes,
            memory_mask
        )
        target = target + self.dropout2(target2)
        target = self.norm2(target)

        # ffn
        target2 = self.forward_ffn(target)
        target = target + self.dropout4(target2)
        target = self.norm3(target)
        return target


class TransformerDecoder(nn.Cell):
    def __init__(self, hidden_dim, decoder_layer, num_layers, eval_idx=-1, reg_max=16):
        super(TransformerDecoder, self).__init__()
        self.layers = nn.CellList([copy.deepcopy(decoder_layer) for _ in range(num_layers)])
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.eval_idx = eval_idx if eval_idx >= 0 else num_layers + eval_idx
        self.reg_max = reg_max

    def _dfl_to_bbox(self, dfl_output):
        """Convert DFL output (4*reg_max) to 4D bbox coordinates [0,1]

        Args:
            dfl_output: (bs, num_queries, 4*reg_max)
        Returns:
            bbox: (bs, num_queries, 4)
        """
        bs, num_queries, _ = dfl_output.shape
        dfl_output = dfl_output.reshape(bs, num_queries, 4, self.reg_max)
        dfl_output = dfl_output.clamp(-100., 100.)
        dfl_probs = F.softmax(dfl_output, dim=-1)
        # bin_values: [0, ..., reg_max-1] / (reg_max-1), shape (reg_max,)
        bin_values = torch.arange(self.reg_max, dtype=dfl_output.dtype)
        bin_values = bin_values / (self.reg_max - 1)
        bbox = (dfl_probs * bin_values).sum(dim=-1)  # (bs, num_queries, 4)
        bbox = bbox.clamp(0., 1.)
        # Ensure w, h >= 1e-4  (format: cx, cy, w, h)
        bbox = torch.cat([
            bbox[..., :2],
            bbox[..., 2:].clamp(min=1e-4),
        ], dim=-1)
        return bbox

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
        dec_out_bboxes_dfl = []
        dec_out_logits = []

        ref_points_detach = self._dfl_to_bbox(ref_points_unact)
        output = target

        for i, layer in enumerate(self.layers):
            ref_points_input = ref_points_detach.unsqueeze(2)
            query_pos_embed = query_pos_head(ref_points_detach)

            output = layer(
                output, ref_points_input, memory, memory_spatial_shapes,
                attn_mask, memory_mask, query_pos_embed
            )

            dfl_out = bbox_head[i](output)               # (bs, nq, 4*reg_max)
            inter_ref_bbox = self._dfl_to_bbox(dfl_out)  # (bs, nq, 4)

            if self.training:
                dec_out_logits.append(score_head[i](output))
                dec_out_bboxes.append(inter_ref_bbox)
                dec_out_bboxes_dfl.append(dfl_out)
            elif i == self.eval_idx:
                dec_out_logits.append(score_head[i](output))
                dec_out_bboxes.append(inter_ref_bbox)
                break

            ref_points_detach = inter_ref_bbox

        return (
            torch.stack(dec_out_bboxes),
            torch.stack(dec_out_logits),
            torch.stack(dec_out_bboxes_dfl) if self.training else None,
        )


@register()
class RTDETRTransformerv2DFL(nn.Cell):
    """RT-DETRv2 with DFL-compatible regression head - MindSpore版本

    Extends regression output from 4 to 4*reg_max for Distribution Focal Loss.
    """
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
                 activation='relu',
                 num_denoising=100,
                 label_noise_ratio=0.5,
                 box_noise_scale=1.0,
                 learn_query_content=False,
                 eval_spatial_size=None,
                 eval_idx=-1,
                 eps=1e-2,
                 aux_loss=True,
                 cross_attn_method='default',
                 query_select_method='default',
                 reg_max=16):
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
        self.reg_max = reg_max

        assert query_select_method in ('default', 'one2many', 'agnostic'), ''
        assert cross_attn_method in ('default', 'discrete'), ''
        self.cross_attn_method = cross_attn_method
        self.query_select_method = query_select_method

        # backbone feature projection
        self._build_input_proj_layer(feat_channels)

        # Transformer decoder
        decoder_layer = TransformerDecoderLayer(
            hidden_dim, nhead, dim_feedforward, dropout,
            activation, num_levels, num_points, cross_attn_method=cross_attn_method
        )
        self.decoder = TransformerDecoder(
            hidden_dim, decoder_layer, num_layers, eval_idx, reg_max=reg_max
        )

        # denoising
        self.num_denoising = num_denoising
        self.label_noise_ratio = label_noise_ratio
        self.box_noise_scale = box_noise_scale
        if num_denoising > 0:
            self.denoising_class_embed = nn.Embedding(
                num_classes + 1, hidden_dim, padding_idx=num_classes
            )

        # decoder embedding
        self.learn_query_content = learn_query_content
        if learn_query_content:
            self.tgt_embed = nn.Embedding(num_queries, hidden_dim)
        self.query_pos_head = MLP(4, 2 * hidden_dim, hidden_dim, 2)

        self.enc_output = nn.Sequential(OrderedDict([
            ('proj', nn.Linear(hidden_dim, hidden_dim)),
            ('norm', nn.LayerNorm(hidden_dim)),
        ]))

        if query_select_method == 'agnostic':
            self.enc_score_head = nn.Linear(hidden_dim, 1)
        else:
            self.enc_score_head = nn.Linear(hidden_dim, num_classes)

        # Encoder bbox head: 4D only (used for top-k selection anchor offset)
        self.enc_bbox_head = MLP(hidden_dim, hidden_dim, 4, 3)

        # decoder heads: 4*reg_max for DFL
        self.dec_score_head = nn.CellList([
            nn.Linear(hidden_dim, num_classes) for _ in range(num_layers)
        ])
        self.dec_bbox_head = nn.CellList([
            MLP(hidden_dim, hidden_dim, 4 * reg_max, 3) for _ in range(num_layers)
        ])

        # anchors for eval
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
                    ('norm', nn.BatchNorm2d(self.hidden_dim)),
                ]))
            )
        in_channels = feat_channels[-1]
        for _ in range(self.num_levels - len(feat_channels)):
            self.input_proj.append(
                nn.Sequential(OrderedDict([
                    ('conv', nn.Conv2d(in_channels, self.hidden_dim, 3, 2, padding=1, bias=False)),
                    ('norm', nn.BatchNorm2d(self.hidden_dim)),
                ]))
            )
            in_channels = self.hidden_dim

    def _get_encoder_input(self, feats: List[torch.Tensor]):
        proj_feats = [self.input_proj[i](feat) for i, feat in enumerate(feats)]
        if self.num_levels > len(proj_feats):
            len_srcs = len(proj_feats)
            for i in range(len_srcs, self.num_levels):
                if i == len_srcs:
                    proj_feats.append(self.input_proj[i](feats[-1]))
                else:
                    proj_feats.append(self.input_proj[i](proj_feats[-1]))

        feat_flatten = []
        spatial_shapes = []
        for feat in proj_feats:
            _, _, h, w = feat.shape
            feat_flatten.append(feat.flatten(start_dim=2).permute(0, 2, 1))
            spatial_shapes.append([h, w])
        feat_flatten = torch.concat(feat_flatten, 1)
        return feat_flatten, spatial_shapes

    def _generate_anchors(self,
                          spatial_shapes=None,
                          grid_size=0.05,
                          dtype=None,
                          device='cpu'):
        """用 numpy 生成 anchors，避免在构建期调用 NPU ops"""
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

        return mindspore.Tensor(anchors.astype(np.float32)), mindspore.Tensor(valid_mask)

    @staticmethod
    def _gather_dim1(src, index_1d):
        """310B 兼容的 dim=1 gather。
        310B 上 GatherElements / gather_d 均无 AICore 实现，
        改用 one-hot matmul 替代：(B,K,N) @ (B,N,C) -> (B,K,C)。
        src:      (B, N, C)
        index_1d: (B, K)  — 仅在 dim=1 上索引
        returns:  (B, K, C)  与 src 同 dtype
        """
        import mindspore.ops as _ops
        import mindspore.numpy as _mnp
        in_dtype = src.dtype
        B, N, C = src.shape
        K = index_1d.shape[1]
        # one-hot: (B, K, N)  — 用 fp16 matmul，310B matmul 只支持 fp16
        n_range = _mnp.arange(N).reshape(1, 1, N).astype(mindspore.float16)  # (1,1,N)
        oh = (index_1d.reshape(B, K, 1).astype(mindspore.float16) == n_range)  # (B,K,N) bool
        oh = oh.astype(mindspore.float16)                                        # (B,K,N) fp16
        src16 = src.astype(mindspore.float16)                                    # (B,N,C) fp16
        out = _ops.matmul(oh, src16)                                             # (B,K,C) fp16
        return out.astype(in_dtype)

    def _select_topk(self,
                     memory: torch.Tensor,
                     outputs_logits: torch.Tensor,
                     outputs_coords_unact: torch.Tensor,
                     topk: int):
        if self.query_select_method == 'default':
            _, topk_ind = torch.topk(outputs_logits.max(-1)[0], topk, dim=-1)
        elif self.query_select_method == 'one2many':
            _, topk_ind = torch.topk(outputs_logits.flatten(start_dim=1), topk, dim=-1)
            topk_ind = topk_ind // self.num_classes
        elif self.query_select_method == 'agnostic':
            _, topk_ind = torch.topk(outputs_logits.squeeze(-1), topk, dim=-1)

        # 310B: .gather(dim=1) 触发 GatherElements，NPU 无 AICore 实现
        # 改用 ops.gather_d，310B 支持
        topk_coords = self._gather_dim1(outputs_coords_unact, topk_ind)
        topk_logits = self._gather_dim1(outputs_logits, topk_ind)
        topk_memory = self._gather_dim1(memory, topk_ind)
        return topk_memory, topk_logits, topk_coords

    def _get_decoder_input(self,
                           memory: torch.Tensor,
                           spatial_shapes,
                           denoising_logits=None,
                           denoising_bbox_unact=None):
        if self.training or self.eval_spatial_size is None:
            anchors, valid_mask = self._generate_anchors(spatial_shapes, device=memory.device)
        else:
            anchors = self.anchors
            valid_mask = self.valid_mask

        memory = valid_mask.to(memory.dtype) * memory

        output_memory = self.enc_output(memory)
        enc_outputs_logits = self.enc_score_head(output_memory)
        # Encoder bbox head: 4D anchor offset
        enc_outputs_coord_unact = self.enc_bbox_head(output_memory) + anchors

        enc_topk_bboxes_list, enc_topk_logits_list = [], []
        enc_topk_memory, enc_topk_logits, enc_topk_bbox_unact = \
            self._select_topk(
                output_memory, enc_outputs_logits, enc_outputs_coord_unact, self.num_queries
            )

        if self.training:
            enc_topk_bboxes = F.sigmoid(enc_topk_bbox_unact)   # 4D [0,1] for matching
            enc_topk_bboxes_list.append(enc_topk_bboxes)
            enc_topk_logits_list.append(enc_topk_logits)

        # Expand 4D anchor logits to 4*reg_max for decoder initial ref points
        # by repeating each coordinate value reg_max times (uniform DFL init)
        # mindspore.mint.Tensor.expand() only accepts a single tuple argument,
        # so we use repeat + reshape instead.
        bs_q, nq, _ = enc_topk_bbox_unact.shape
        enc_topk_bbox_unact_dfl = enc_topk_bbox_unact.unsqueeze(-1).repeat(
            1, 1, 1, self.reg_max
        ).reshape(bs_q, nq, 4 * self.reg_max)

        if self.learn_query_content:
            content = self.tgt_embed.weight.unsqueeze(0).tile([memory.shape[0], 1, 1])
        else:
            content = enc_topk_memory

        if denoising_bbox_unact is not None:
            # denoising_bbox_unact: (bs, dn_num, 4) -> expand to (bs, dn_num, 4*reg_max)
            denoising_bbox_unact_dfl = denoising_bbox_unact.repeat(1, 1, self.reg_max)
            enc_topk_bbox_unact_dfl = torch.concat(
                [denoising_bbox_unact_dfl, enc_topk_bbox_unact_dfl], dim=1
            )
            content = torch.concat([denoising_logits, content], dim=1)

        return content, enc_topk_bbox_unact_dfl, enc_topk_bboxes_list, enc_topk_logits_list

    def construct(self, feats, targets=None):
        memory, spatial_shapes = self._get_encoder_input(feats)

        # denoising (training only)
        if self.training and self.num_denoising > 0:
            denoising_logits, denoising_bbox_unact, attn_mask, dn_meta = \
                get_contrastive_denoising_training_group(
                    targets,
                    self.num_classes,
                    self.num_queries,
                    self.denoising_class_embed,
                    num_denoising=self.num_denoising,
                    label_noise_ratio=self.label_noise_ratio,
                    box_noise_scale=self.box_noise_scale,
                )
        else:
            denoising_logits, denoising_bbox_unact, attn_mask, dn_meta = None, None, None, None

        init_ref_contents, init_ref_points_unact, enc_topk_bboxes_list, enc_topk_logits_list = \
            self._get_decoder_input(
                memory, spatial_shapes, denoising_logits, denoising_bbox_unact
            )

        out_bboxes, out_logits, out_bboxes_dfl = self.decoder(
            init_ref_contents,
            init_ref_points_unact,
            memory,
            spatial_shapes,
            self.dec_bbox_head,
            self.dec_score_head,
            self.query_pos_head,
            attn_mask=attn_mask,
        )

        if self.training and dn_meta is not None:
            dn_out_bboxes,     out_bboxes     = torch.split(out_bboxes,     dn_meta['dn_num_split'], dim=2)
            dn_out_logits,     out_logits     = torch.split(out_logits,     dn_meta['dn_num_split'], dim=2)
            dn_out_bboxes_dfl, out_bboxes_dfl = torch.split(out_bboxes_dfl, dn_meta['dn_num_split'], dim=2)

        out = {
            'pred_logits': out_logits[-1],
            'pred_boxes':  out_bboxes[-1],
        }
        if self.training and out_bboxes_dfl is not None:
            out['pred_boxes_dfl'] = out_bboxes_dfl[-1]  # (bs, nq, 4*reg_max)

        if self.training and self.aux_loss:
            out['aux_outputs'] = self._set_aux_loss(
                out_logits[:-1], out_bboxes[:-1], out_bboxes_dfl[:-1]
            )
            out['enc_aux_outputs'] = self._set_aux_loss_enc(
                enc_topk_logits_list, enc_topk_bboxes_list
            )
            out['enc_meta'] = {'class_agnostic': self.query_select_method == 'agnostic'}

            if dn_meta is not None:
                out['dn_aux_outputs'] = self._set_aux_loss(
                    dn_out_logits, dn_out_bboxes, dn_out_bboxes_dfl
                )
                out['dn_meta'] = dn_meta

        return out

    def _set_aux_loss(self, outputs_class, outputs_coord, outputs_coord_dfl):
        return [
            {'pred_logits': a, 'pred_boxes': b, 'pred_boxes_dfl': c}
            for a, b, c in zip(outputs_class, outputs_coord, outputs_coord_dfl)
        ]

    def _set_aux_loss_enc(self, outputs_class, outputs_coord):
        # encoder aux outputs don't have DFL logits; use pred_boxes as placeholder
        return [
            {'pred_logits': a, 'pred_boxes': b, 'pred_boxes_dfl': b}
            for a, b in zip(outputs_class, outputs_coord)
        ]
  