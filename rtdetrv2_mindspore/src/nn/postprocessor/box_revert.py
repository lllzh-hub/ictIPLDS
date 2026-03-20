"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import mindspore.mint as torch
from mindspore import Tensor
from mindspore.mint import Tensor
from enum import Enum


class BoxProcessFormat(Enum):
    """Box process format 

    Available formats are
    * ``RESIZE``
    * ``RESIZE_KEEP_RATIO``
    * ``RESIZE_KEEP_RATIO_PADDING``
    """
    RESIZE = 1
    RESIZE_KEEP_RATIO = 2
    RESIZE_KEEP_RATIO_PADDING = 3


def _box_convert(boxes: Tensor, in_fmt: str, out_fmt: str) -> Tensor:
    """纯 MindSpore 实现的 box_convert，替代 _box_convert"""
    if in_fmt == out_fmt:
        return boxes.clone()

    if in_fmt == 'cxcywh' and out_fmt == 'xyxy':
        cx, cy, w, h = boxes.unbind(-1)
        x1 = cx - 0.5 * w
        y1 = cy - 0.5 * h
        x2 = cx + 0.5 * w
        y2 = cy + 0.5 * h
        return torch.stack([x1, y1, x2, y2], dim=-1)

    if in_fmt == 'xyxy' and out_fmt == 'cxcywh':
        x1, y1, x2, y2 = boxes.unbind(-1)
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        w = x2 - x1
        h = y2 - y1
        return torch.stack([cx, cy, w, h], dim=-1)

    if in_fmt == 'xywh' and out_fmt == 'xyxy':
        x1, y1, w, h = boxes.unbind(-1)
        return torch.stack([x1, y1, x1 + w, y1 + h], dim=-1)

    if in_fmt == 'xyxy' and out_fmt == 'xywh':
        x1, y1, x2, y2 = boxes.unbind(-1)
        return torch.stack([x1, y1, x2 - x1, y2 - y1], dim=-1)

    raise ValueError(f'不支持的格式转换: {in_fmt} -> {out_fmt}')


def box_revert(
    boxes: Tensor, 
    orig_sizes: Tensor=None, 
    eval_sizes: Tensor=None,
    inpt_sizes: Tensor=None,
    inpt_padding: Tensor=None,
    normalized: bool=True,
    in_fmt: str='cxcywh', 
    out_fmt: str='xyxy',
    process_fmt=BoxProcessFormat.RESIZE,
) -> Tensor:
    """
    Args:
        boxes(Tensor), [N, :, 4], (x1, y1, x2, y2), pred boxes.
        inpt_sizes(Tensor), [N, 2], (w, h). input sizes.
        orig_sizes(Tensor), [N, 2], (w, h). origin sizes.
        inpt_padding (Tensor), [N, 2], (w_pad, h_pad, ...).
        (inpt_sizes + inpt_padding) == eval_sizes
    """
    assert in_fmt in ('cxcywh', 'xyxy'), ''

    if normalized and eval_sizes is not None:
        boxes = boxes * eval_sizes.repeat(1, 2).unsqueeze(1)
    
    if inpt_padding is not None:
        if in_fmt == 'xyxy':
            boxes -= inpt_padding[:, :2].repeat(1, 2).unsqueeze(1)
        elif in_fmt == 'cxcywh':
            boxes[..., :2] -= inpt_padding[:, :2].repeat(1, 2).unsqueeze(1)

    if orig_sizes is not None:
        orig_sizes = orig_sizes.repeat(1, 2).unsqueeze(1)
        if inpt_sizes is not None:
            inpt_sizes = inpt_sizes.repeat(1, 2).unsqueeze(1)
            boxes = boxes * (orig_sizes / inpt_sizes)
        else:
            boxes = boxes * orig_sizes

    boxes = _box_convert(boxes, in_fmt=in_fmt, out_fmt=out_fmt)
    return boxes
