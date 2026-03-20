"""Copyright(c) 2023 lyuwenyu. All Rights Reserved."""
from typing import Optional, Callable
from ...core import register

@register()
class CIFAR10:
    """CIFAR10 占位类（推理不使用）"""
    __inject__ = ["transform", "target_transform"]
    def __init__(self, root="", train=True, transform=None, target_transform=None, download=False):
        raise NotImplementedError("CIFAR10 not supported in inference mode.")
