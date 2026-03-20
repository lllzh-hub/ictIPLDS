"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

from __future__ import annotations

from mindspore.mint import Tensor

# MindTorch's torchvision coverage varies by version/environment.
# We keep v2 / tv_tensors optional so the repo can run inference without them.
try:  # pragma: no cover
    import mindspore.mint as torch
# torchvision not needed for inference  # [migrated: torchvision -> mint, ops.box_convert 已在各文件中内联替换]
except Exception:  # pragma: no cover
    torchvision = None  # type: ignore

try:  # pragma: no cover
    # from mindspore.mint.transforms  # not available.v2 import SanitizeBoundingBoxes  # type: ignore
except Exception:  # pragma: no cover
    class SanitizeBoundingBoxes:  # type: ignore
        """Fallback no-op SanitizeBoundingBoxes when transforms.v2 is unavailable."""
        def __init__(self, *args, **kwargs):
            pass
        def __call__(self, *inputs, **kwargs):
            return inputs if len(inputs) > 1 else inputs[0]

try:  # pragma: no cover
    from mindspore.mint.tv_tensors import (  # type: ignore
        BoundingBoxes, BoundingBoxFormat, Mask, Image, Video
    )
    _TV_TENSORS_AVAILABLE = True
except Exception:  # pragma: no cover
    _TV_TENSORS_AVAILABLE = False

    # Minimal placeholders to satisfy imports/type checks in other modules.
    class BoundingBoxFormat:  # type: ignore
        XYXY = "XYXY"

    class BoundingBoxes(Tensor):  # type: ignore
        pass

    class Mask(Tensor):  # type: ignore
        pass

    class Image(Tensor):  # type: ignore
        pass

    class Video(Tensor):  # type: ignore
        pass

_boxes_keys = ['format', 'canvas_size']



def convert_to_tv_tensor(tensor: Tensor, key: str, box_format='xyxy', spatial_size=None) -> Tensor:
    """
    Args:
        tensor (Tensor): input tensor
        key (str): transform to key

    Return:
        Dict[str, TV_Tensor]
    """
    assert key in ('boxes', 'masks', ), "Only support 'boxes' and 'masks'"
    
    # If tv_tensors are not available, fall back to raw tensors.
    if not _TV_TENSORS_AVAILABLE:
        return tensor

    if key == 'boxes':
        box_format = getattr(BoundingBoxFormat, box_format.upper())
        _kwargs = dict(zip(_boxes_keys, [box_format, spatial_size]))
        return BoundingBoxes(tensor, **_kwargs)

    if key == 'masks':
       return Mask(tensor)

