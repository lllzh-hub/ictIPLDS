"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

# from ._dataset import DetDataset
from .cifar_dataset import CIFAR10
from .voc_detection import VOCDetection
from .voc_eval import VOCEvaluator

# COCO components require optional dependency `faster_coco_eval`.
# Keep them optional so inference scripts can run without COCO toolchain installed.
try:  # pragma: no cover
    from .coco_dataset import (
        CocoDetection,
        mscoco_category2name,
        mscoco_category2label,
        mscoco_label2category,
    )
    from .coco_eval import CocoEvaluator
    from .coco_utils import get_coco_api_from_dataset
except Exception:  # pragma: no cover
    CocoDetection = None  # type: ignore
    CocoEvaluator = None  # type: ignore
    get_coco_api_from_dataset = None  # type: ignore
    mscoco_category2name = {}  # type: ignore
    mscoco_category2label = {}  # type: ignore
    mscoco_label2category = {}  # type: ignore
