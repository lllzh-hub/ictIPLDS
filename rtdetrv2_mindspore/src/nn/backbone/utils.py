"""
https://github.com/pytorch/vision/blob/main/torchvision/models/_utils.py

Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

from collections import OrderedDict
from typing import Dict, List


import src.nn_compat as nn
import mindspore.nn as _msnn
# 补充 mindspore.mint.nn 缺少的容器类
for _cls in ["CellList","CellDict","SequentialCell","Sequential",
             "ModuleList","ModuleDict","BatchNorm2d","GroupNorm",
             "LayerNorm","InstanceNorm2d","Embedding","MultiheadAttention",
             "Identity","Dropout","LeakyReLU","SiLU","GELU",
             "Hardsigmoid","Hardswish","ReLU6","AvgPool2d","MaxPool2d",
             "AdaptiveAvgPool2d","ConvTranspose2d","PixelShuffle","Flatten"]:
    if not hasattr(nn, _cls) and hasattr(_msnn, _cls):
        setattr(nn, _cls, getattr(_msnn, _cls))
del _msnn, _cls



class IntermediateLayerGetter(nn.CellDict):
    """
    Module wrapper that returns intermediate layers from a model

    It has a strong assumption that the modules have been registered
    into the model in the same order as they are used.
    This means that one should **not** reuse the same nn.Cell
    twice in the forward if you want this to work.

    Additionally, it is only able to query submodules that are directly
    assigned to the model. So if `model` is passed, `model.feature1` can
    be returned, but not `model.feature1.layer2`.
    """

    _version = 3

    def __init__(self, model: nn.Cell, return_layers: List[str]) -> None:
        if not set(return_layers).issubset([name for name, _ in model.name_cells().items()]):
            raise ValueError("return_layers are not present in model. {}"\
                .format([name for name, _ in model.name_cells().items()]))
        orig_return_layers = return_layers
        return_layers = {str(k): str(k)  for k in return_layers}
        layers = OrderedDict()
        for name, module in model.name_cells().items():
            layers[name] = module
            if name in return_layers:
                del return_layers[name]
            if not return_layers:
                break

        super().__init__(layers)
        self.return_layers = orig_return_layers

    def construct(self, x):
        outputs = []
        for name, module in self.items():
            x = module(x)
            if name in self.return_layers:
                outputs.append(x)
        
        return outputs

