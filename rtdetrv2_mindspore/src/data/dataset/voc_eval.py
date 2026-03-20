"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import mindspore.mint as torch
from mindspore import Tensor
import mindspore.mint as torch
# torchvision not needed for inference  # [migrated: torchvision -> mint, ops.box_convert 已在各文件中内联替换]


class VOCEvaluator(object):
    def __init__(self) -> None:
        pass