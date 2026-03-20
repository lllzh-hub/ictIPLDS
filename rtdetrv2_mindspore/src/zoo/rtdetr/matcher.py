"""
Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved
Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import mindspore
import mindspore.mint as torch
import src.nn_compat as nn
import mindspore.mint.nn.functional as F
from mindspore import Tensor

from scipy.optimize import linear_sum_assignment
from typing import Dict

from .box_ops import box_cxcywh_to_xyxy, generalized_box_iou
from ...core import register


@register()
class HungarianMatcher(nn.Cell):
    __share__ = ["use_focal_loss"]

    def __init__(self, weight_dict, use_focal_loss=False, alpha=0.25, gamma=2.0):
        super().__init__()
        self.cost_class = weight_dict["cost_class"]
        self.cost_bbox = weight_dict["cost_bbox"]
        self.cost_giou = weight_dict["cost_giou"]
        self.use_focal_loss = use_focal_loss
        self.alpha = alpha
        self.gamma = gamma
        assert self.cost_class != 0 or self.cost_bbox != 0 or self.cost_giou != 0

    def construct(self, outputs: Dict[str, Tensor], targets):
        bs, num_queries = outputs["pred_logits"].shape[:2]
        if self.use_focal_loss:
            out_prob = F.sigmoid(outputs["pred_logits"].flatten(start_dim=0, end_dim=1))
        else:
            out_prob = outputs["pred_logits"].flatten(start_dim=0, end_dim=1).softmax(-1)
        out_bbox = outputs["pred_boxes"].flatten(start_dim=0, end_dim=1)
        tgt_ids = torch.cat([v["labels"] for v in targets])
        tgt_bbox = torch.cat([v["boxes"] for v in targets])
        if self.use_focal_loss:
            out_prob = out_prob[:, tgt_ids]
            neg_cost_class = (1 - self.alpha) * (out_prob ** self.gamma) * (-(1 - out_prob + 1e-8).log())
            pos_cost_class = self.alpha * ((1 - out_prob) ** self.gamma) * (-(out_prob + 1e-8).log())
            cost_class = pos_cost_class - neg_cost_class
        else:
            cost_class = -out_prob[:, tgt_ids]
        cost_bbox = torch.cdist(out_bbox, tgt_bbox, p=1)
        cost_giou = -generalized_box_iou(box_cxcywh_to_xyxy(out_bbox), box_cxcywh_to_xyxy(tgt_bbox))
        C = self.cost_bbox * cost_bbox + self.cost_class * cost_class + self.cost_giou * cost_giou
        C = C.view(bs, num_queries, -1).asnumpy()
        sizes = [len(v["boxes"]) for v in targets]
        indices = [linear_sum_assignment(c[i]) for i, c in enumerate(
            [C[:, :, sum(sizes[:k]):sum(sizes[:k+1])] for k in range(len(sizes))]
        )]
        indices = [
            (mindspore.Tensor(i, dtype=mindspore.int64), mindspore.Tensor(j, dtype=mindspore.int64))
            for i, j in indices
        ]
        return {"indices": indices}

    def construct(self, outputs, targets):
        return self.construct(outputs, targets)
