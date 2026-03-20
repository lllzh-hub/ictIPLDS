"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import mindspore
import mindspore.mint as torch
from mindspore import Tensor
import src.nn_compat as nn
import mindspore.mint.nn.functional as F
import mindspore.ops as _ops
import mindspore.numpy as _mnp

from ...core import register


__all__ = ['RTDETRPostProcessor']


def mod(a, b):
    return a - a // b * b


def _box_cxcywh_to_xyxy(boxes):
    cx, cy, w, h = boxes[..., 0], boxes[..., 1], boxes[..., 2], boxes[..., 3]
    return torch.stack([cx - 0.5*w, cy - 0.5*h, cx + 0.5*w, cy + 0.5*h], dim=-1)


def _gather_fp16(src, dim, index):
    """
    310B GatherElements 无 AICore 实现，用 one-hot + fp16 matmul 替代。
    src:   (B, N, C)  dim=1
    index: (B, K) or (B, K, C)
    returns: (B, K, C)
    """
    # 统一处理 dim=1 的情况（postprocessor 只用 dim=1）
    assert dim == 1
    B, N, C = src.shape
    if index.ndim == 2:
        # index: (B, K) -> (B, K, C) by repeat
        K = index.shape[1]
        index3 = index.reshape(B, K, 1).broadcast_to((B, K, C))
    else:
        B2, K, C2 = index.shape
        index3 = index

    K = index3.shape[1]
    # one-hot: (B, K, N) fp16
    n_range = _mnp.arange(N).reshape(1, 1, N).astype(mindspore.float16)
    oh = (index3[:, :, 0:1].astype(mindspore.float16) == n_range).astype(mindspore.float16)  # (B, K, N)
    # src: (B, N, C) fp16
    src16 = src.astype(mindspore.float16)
    # (B, K, N) @ (B, N, C) -> (B, K, C)
    out = _ops.matmul(oh, src16)
    return out.astype(src.dtype)


@register()
class RTDETRPostProcessor(nn.Cell):
    __share__ = [
        "num_classes",
        "use_focal_loss",
        "num_top_queries",
        "remap_mscoco_category"
    ]

    def __init__(self, num_classes=80, use_focal_loss=True,
                 num_top_queries=300, remap_mscoco_category=False):
        super().__init__()
        self.use_focal_loss = use_focal_loss
        self.num_top_queries = num_top_queries
        self.num_classes = int(num_classes)
        self.remap_mscoco_category = remap_mscoco_category
        self.deploy_mode = False

    def extra_repr(self):
        return (f"use_focal_loss={self.use_focal_loss}, "
                f"num_classes={self.num_classes}, "
                f"num_top_queries={self.num_top_queries}")

    def construct(self, outputs, orig_target_sizes):
        logits, boxes = outputs["pred_logits"], outputs["pred_boxes"]

        bbox_pred = _box_cxcywh_to_xyxy(boxes)
        # orig_target_sizes: (B, 2) -> (B, 1, 4) for scaling
        scale = torch.stack([orig_target_sizes[:, 0], orig_target_sizes[:, 1],
                             orig_target_sizes[:, 0], orig_target_sizes[:, 1]], dim=1).unsqueeze(1)
        bbox_pred = bbox_pred * scale

        if self.use_focal_loss:
            scores = F.sigmoid(logits)                                      # (B, Q, num_classes)
            scores_flat = scores.flatten(start_dim=1)                       # (B, Q*num_classes)
            scores_topk, index = torch.topk(scores_flat, self.num_top_queries, dim=-1)  # (B, K)
            labels = mod(index, self.num_classes)                           # (B, K)
            index_q = index // self.num_classes                             # (B, K) query index

            # gather bbox_pred at index_q: (B, Q, 4) -> (B, K, 4)
            # 310B: no GatherElements, use one-hot matmul
            boxes_out = _gather_fp16(bbox_pred, 1, index_q)
            scores_out = scores_topk
        else:
            scores = F.softmax(logits, dim=-1)[..., :-1]                   # (B, Q, C)
            scores_max = scores.max(axis=-1)                               # (B, Q)
            labels_all = scores.argmax(axis=-1)                            # (B, Q)
            if scores_max.shape[1] > self.num_top_queries:
                scores_topk, index = torch.topk(scores_max, self.num_top_queries, dim=-1)
                labels = _gather_fp16(labels_all.unsqueeze(-1).astype(mindspore.float32),
                                      1, index).squeeze(-1).astype(mindspore.int32)
                boxes_out = _gather_fp16(bbox_pred, 1, index)
                scores_out = scores_topk
            else:
                labels = labels_all
                boxes_out = bbox_pred
                scores_out = scores_max

        if self.deploy_mode:
            return labels, boxes_out, scores_out

        results = []
        for lab, box, sco in zip(labels, boxes_out, scores_out):
            results.append(dict(labels=lab, boxes=box, scores=sco))
        return results

    def deploy(self):
        self.set_train(False)
        self.deploy_mode = True
        return self
