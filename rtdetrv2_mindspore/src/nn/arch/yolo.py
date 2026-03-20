"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import mindspore.mint as torch
from mindspore import Tensor

from ...core import register


__all__ = ['YOLO', ]


@register()
class YOLO(torch.nn.Cell):
    __inject__ = ['backbone', 'neck', 'head', ]

    def __init__(self, backbone: torch.nn.Cell, neck, head):
        super().__init__()
        self.backbone = backbone
        self.neck = neck
        self.head = head

    def construct(self, x, **kwargs):           
        x = self.backbone(x)
        x = self.neck(x)        
        x = self.head(x)
        return x
    
    def deploy(self, ):
        self.set_train(False)
        for m in self.cells_and_names():
            if m is not self and hasattr(m, 'deploy'):
                m.deploy()
        return self 
