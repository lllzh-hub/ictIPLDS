"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

from .common import (
    get_activation, 
    FrozenBatchNorm2d,
    freeze_batch_norm2d,
)
from .presnet import PResNet
from .test_resnet import MResNet

# Optional backbones that rely on torchvision / timm. Import them lazily in
# environments where those dependencies are available.
try:  # pragma: no cover
    from .timm_model import TimmModel  # type: ignore
except Exception:  # pragma: no cover
    TimmModel = None  # type: ignore

try:  # pragma: no cover
    from .torchvision_model import TorchVisionModel  # type: ignore
except Exception:  # pragma: no cover
    TorchVisionModel = None  # type: ignore

from .csp_resnet import CSPResNet
from .csp_darknet import CSPDarkNet, CSPPAN

from .hgnetv2 import HGNetv2