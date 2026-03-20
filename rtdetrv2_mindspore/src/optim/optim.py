"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import mindspore.mint.optim as optim

from ..core import register


__all__ = ['AdamW', 'SGD', 'Adam', 'MultiStepLR', 'CosineAnnealingLR', 'OneCycleLR', 'LambdaLR']


SGD = register()(optim.SGD)
Adam = register()(optim.Adam)
AdamW = register()(optim.AdamW)


class MultiStepLR:
    def __init__(self, *a, **kw): pass
    def get_last_lr(self): return [0.0]
    def step(self): pass

class CosineAnnealingLR:
    def __init__(self, *a, **kw): pass
    def get_last_lr(self): return [0.0]
    def step(self): pass

class OneCycleLR:
    def __init__(self, *a, **kw): pass
    def get_last_lr(self): return [0.0]
    def step(self): pass

class LambdaLR:
    def __init__(self, *a, **kw): pass
    def get_last_lr(self): return [0.0]
    def step(self): pass


MultiStepLR = register()(MultiStepLR)
CosineAnnealingLR = register()(CosineAnnealingLR)
OneCycleLR = register()(OneCycleLR)
LambdaLR = register()(LambdaLR)
