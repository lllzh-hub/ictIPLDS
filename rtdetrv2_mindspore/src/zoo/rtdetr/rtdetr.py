"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import mindspore
import mindspore.mint as torch
import src.nn_compat as nn
import mindspore.mint.nn.functional as F

import numpy as np
from typing import List

from ...core import register


__all__ = ['RTDETR', ]


@register()
class RTDETR(mindspore.nn.Cell):
    __inject__ = ['backbone', 'encoder', 'decoder', ]

    def __init__(self,
        backbone: mindspore.nn.Cell,
        encoder: mindspore.nn.Cell,
        decoder: mindspore.nn.Cell,
    ):
        super().__init__()
        self.backbone = backbone
        self.decoder = decoder
        self.encoder = encoder

    def construct(self, x, targets=None):
        x = self.backbone(x)
        x = self.encoder(x)
        x = self.decoder(x, targets)
        return x

    def deploy(self):
        self.set_train(False)
        for _, m in self.cells_and_names():
            if hasattr(m, 'convert_to_deploy'):
                m.convert_to_deploy()
        return self
