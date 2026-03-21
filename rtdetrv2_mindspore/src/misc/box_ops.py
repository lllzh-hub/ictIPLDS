"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import mindspore.mint as torch
from mindspore import Tensor
from mindspore.mint import Tensor 
from typing import List, Tuple
# NOTE: torchvision.ops.generalized_box_iou / box_area 依赖 C++ 扩展，在 Ascend 上不可用
# 改用纯 Python 实现


def _box_area(boxes: Tensor) -> Tensor:
    """纯 Python 实现 box_area，替代 torchvision.ops.box_area"""
    return (boxes[:, 2] - boxes[:, 0]).clamp(min=0) * (boxes[:, 3] - boxes[:, 1]).clamp(min=0)


def _box_iou_pairwise(boxes1: Tensor, boxes2: Tensor):
    """计算 [N,4] 与 [M,4] 的 pairwise IoU，返回 [N,M] iou 和 union"""
    area1 = _box_area(boxes1)  # [N,]
    area2 = _box_area(boxes2)  # [M,]
    lt = torch.max(boxes1[:, None, :2], boxes2[:, :2])   # [N,M,2]
    rb = torch.min(boxes1[:, None, 2:], boxes2[:, 2:])   # [N,M,2]
    wh = (rb - lt).clamp(min=0)                          # [N,M,2]
    inter = wh[:, :, 0] * wh[:, :, 1]                    # [N,M]
    union = area1[:, None] + area2 - inter
    iou = inter / (union + 1e-7)
    return iou, union


def generalized_box_iou(boxes1: Tensor, boxes2: Tensor) -> Tensor:
    """纯 Python 实现 generalized_box_iou，替代 torchvision.ops.generalized_box_iou"""
    assert (boxes1[:, 2:] >= boxes1[:, :2]).all()
    assert (boxes2[:, 2:] >= boxes2[:, :2]).all()
    iou, union = _box_iou_pairwise(boxes1, boxes2)
    lt = torch.min(boxes1[:, None, :2], boxes2[:, :2])
    rb = torch.max(boxes1[:, None, 2:], boxes2[:, 2:])
    wh = (rb - lt).clamp(min=0)
    area = wh[:, :, 0] * wh[:, :, 1]
    return iou - (area - union) / (area + 1e-7)


# elementwise
def elementwise_box_iou(boxes1: Tensor, boxes2: Tensor) -> Tensor:
    """
    Args:
        boxes1, [N, 4]
        boxes2, [N, 4]
    Returns:
        iou, [N, ]
        union, [N, ]
    """
    area1 = _box_area(boxes1)  # [N, ]
    area2 = _box_area(boxes2)  # [N, ]
    lt = torch.max(boxes1[:, :2], boxes2[:, :2])  # [N, 2]
    rb = torch.min(boxes1[:, 2:], boxes2[:, 2:])  # [N, 2]
    wh = (rb - lt).clamp(min=0)  # [N, 2]
    inter = wh[:, 0] * wh[:, 1]  # [N, ]
    union = area1 + area2 - inter
    iou = inter / union
    return iou, union


def elementwise_generalized_box_iou(boxes1: Tensor, boxes2: Tensor) -> Tensor:
    """
    Args:
        boxes1, [N, 4] with [x1, y1, x2, y2]
        boxes2, [N, 4] with [x1, y1, x2, y2]
    Returns:
        giou, [N, ]
    """
    assert (boxes1[:, 2:] >= boxes1[:, :2]).all()
    assert (boxes2[:, 2:] >= boxes2[:, :2]).all()
    iou, union = elementwise_box_iou(boxes1, boxes2)
    lt = torch.min(boxes1[:, :2], boxes2[:, :2]) # [N, 2]
    rb = torch.max(boxes1[:, 2:], boxes2[:, 2:]) # [N, 2]
    wh = (rb - lt).clamp(min=0)  # [N, 2]
    area = wh[:, 0] * wh[:, 1]
    return iou - (area - union) / area


def check_point_inside_box(points: Tensor, boxes: Tensor, eps=1e-9) -> Tensor:
    """
    Args:
        points, [K, 2], (x, y)
        boxes, [N, 4], (x1, y1, y2, y2)
    Returns:
        Tensor (bool), [K, N]
    """
    x, y = [p.unsqueeze(-1) for p in points.unbind(-1)]
    x1, y1, x2, y2 = [x.unsqueeze(0) for x in boxes.unbind(-1)]

    l = x - x1
    t = y - y1 
    r = x2 - x
    b = y2 - y
    
    ltrb = torch.stack([l, t, r, b], dim=-1)
    mask = ltrb.min(dim=-1).values > eps

    return mask


def point_box_distance(points: Tensor, boxes: Tensor) -> Tensor:
    """
    Args:
        boxes, [N, 4], (x1, y1, x2, y2)
        points, [N, 2], (x, y)
    Returns:
        Tensor (N, 4), (l, t, r, b)
    """
    x1y1, x2y2 = torch.split(boxes, 2, dim=-1)
    lt = points - x1y1
    rb = x2y2 - points
    return torch.concat([lt, rb], dim=-1)


def point_distance_box(points: Tensor, distances: Tensor) -> Tensor:
    """
    Args:
        points (Tensor), [N, 2], (x, y)
        distances (Tensor), [N, 4], (l, t, r, b)
    Returns:
        boxes (Tensor),  (N, 4), (x1, y1, x2, y2)
    """
    lt, rb = torch.split(distances, 2, dim=-1)
    x1y1 = -lt + points
    x2y2 = rb + points
    boxes = torch.concat([x1y1, x2y2], dim=-1)
    return boxes


# -----------------------------------------------------------------------
# Inner-IoU：面向微小目标的辅助内部边界框 IoU 损失
# 参考：Inner-IoU: More Effective Intersection over Union Loss with
#       Auxiliary Bounding Box (https://arxiv.org/abs/2311.02877)
# -----------------------------------------------------------------------

def _inner_box(boxes: Tensor, ratio: float) -> Tensor:
    """以各 box 中心为锚点，按 ratio 缩放生成辅助内部边界框。

    Args:
        boxes (Tensor): [N, 4]，格式 (x1, y1, x2, y2)
        ratio (float): 内框缩放比例，通常取 0.5~0.8；
                       ratio=1.0 退化为原框（等价于标准 IoU）。
    Returns:
        inner (Tensor): [N, 4]，缩放后的内部框
    """
    # 中心坐标
    cx = (boxes[:, 0] + boxes[:, 2]) * 0.5   # [N,]
    cy = (boxes[:, 1] + boxes[:, 3]) * 0.5   # [N,]
    # 半宽 / 半高 × ratio
    half_w = (boxes[:, 2] - boxes[:, 0]) * 0.5 * ratio  # [N,]
    half_h = (boxes[:, 3] - boxes[:, 1]) * 0.5 * ratio  # [N,]
    # 组装内框
    inner = torch.stack([
        cx - half_w,   # x1_inner
        cy - half_h,   # y1_inner
        cx + half_w,   # x2_inner
        cy + half_h,   # y2_inner
    ], dim=-1)         # [N, 4]
    return inner


def elementwise_inner_iou(boxes1: Tensor, boxes2: Tensor,
                          ratio: float = 0.7) -> Tensor:
    # 构建辅助内部框
    inner1 = _inner_box(boxes1, ratio)   # [N, 4]
    inner2 = _inner_box(boxes2, ratio)   # [N, 4]

    # 内部框的交集
    lt   = torch.max(inner1[:, :2], inner2[:, :2])   # [N, 2]
    rb   = torch.min(inner1[:, 2:], inner2[:, 2:])   # [N, 2]
    wh   = (rb - lt).clamp(min=0)                    # [N, 2]
    inter = wh[:, 0] * wh[:, 1]                      # [N,]

    # 内部框各自面积
    area1 = _box_area(inner1)   # [N,]
    area2 = _box_area(inner2)   # [N,]
    union = area1 + area2 - inter + 1e-7

    inner_iou = inter / union   # [N,]
    return inner_iou


def inner_iou_loss(boxes1: Tensor, boxes2: Tensor,
                   ratio: float = 0.7) -> Tensor:
    """Inner-IoU Loss = 1 - Inner-IoU，直接用于替换 GIoU Loss 的回归项。

    Args:
        boxes1 (Tensor): [N, 4]，预测框 (x1, y1, x2, y2)
        boxes2 (Tensor): [N, 4]，目标框 (x1, y1, x2, y2)
        ratio  (float):  内框缩放比例，默认 0.7
    Returns:
        loss (Tensor): [N,]，逐样本损失值
    """
    return 1.0 - elementwise_inner_iou(boxes1, boxes2, ratio=ratio)
