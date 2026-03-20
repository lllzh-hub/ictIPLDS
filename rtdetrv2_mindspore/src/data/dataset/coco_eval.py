"""
# Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved
COCO evaluator that works in distributed mode.
Mostly copy-paste from https://github.com/pytorch/vision/blob/edfd5a7/references/detection/coco_eval.py
The difference is that there is less copy-pasting from pycocotools
in the end of the file, as python3 can suppress prints with contextlib

# MiXaiLL76 replacing pycocotools with faster-coco-eval for better performance and support.
"""

from ...core import register
try:  # pragma: no cover
    from faster_coco_eval.utils.pytorch import FasterCocoEvaluator
    _FASTER_COCO_EVAL_AVAILABLE = True
except Exception:  # pragma: no cover
    FasterCocoEvaluator = None  # type: ignore
    _FASTER_COCO_EVAL_AVAILABLE = False

@register()
class CocoEvaluator(FasterCocoEvaluator if _FASTER_COCO_EVAL_AVAILABLE else object):
    def __init__(self, *args, **kwargs):
        if not _FASTER_COCO_EVAL_AVAILABLE:
            raise ModuleNotFoundError(
                "Missing optional dependency `faster_coco_eval`. "
                "Please `pip install faster_coco_eval` to use CocoEvaluator."
            )
        super().__init__(*args, **kwargs)
