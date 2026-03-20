"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""


import mindspore.mint as torch
from mindspore import Tensor
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


from ...core import register


__all__ = ['Classification', 'ClassHead']


@register()
class Classification(torch.nn.Cell):
    __inject__ = ['backbone', 'head']

    def __init__(self, backbone: nn.Cell, head: nn.Cell=None):
        super().__init__()
        
        self.backbone = backbone
        self.head = head

    def construct(self, x):
        x = self.backbone(x)

        if self.head is not None:
            x = self.head(x)

        return x 


@register()
class ClassHead(nn.Cell):
    def __init__(self, hidden_dim, num_classes):
        super().__init__()
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.proj = nn.Linear(hidden_dim, num_classes)  

    def construct(self, x):
        x = x[0] if isinstance(x, (list, tuple)) else x 
        x = self.pool(x)
        x = x.reshape(x.shape[0], -1)
        x = self.proj(x)
        return x 
