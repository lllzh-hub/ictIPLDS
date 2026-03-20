"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""


import mindspore.mint as torch
from mindspore import Tensor
import src.nn_compat as nn

import math
from copy import deepcopy

from ..core import register
from ..misc import dist_utils

__all__ = ['ModelEMA']


@register()
class ModelEMA(object):
    """
    Model Exponential Moving Average from https://github.com/rwightman/pytorch-image-models
    Keep a moving average of everything in the model state_dict (parameters and buffers).
    This is intended to allow functionality like
    https://www.tensorflow.org/api_docs/python/tf/train/ExponentialMovingAverage
    A smoothed version of the weights is necessary for some training schemes to perform well.
    This class is sensitive where it is initialized in the sequence of model init,
    GPU assignment and distributed training wrappers.
    """
    def __init__(self, model: nn.Cell, decay: float=0.9999, warmups: int=2000, ):
        super().__init__()

        self.module = deepcopy(dist_utils.de_parallel(model)).set_train(False) 
        # if next(model.get_parameters()).device.type != 'cpu':
        #     self.module.half()  # FP16 EMA
        
        self.decay = decay 
        self.warmups = warmups
        self.updates = 0  # number of EMA updates
        self.decay_fn = lambda x: decay * (1 - math.exp(-x / warmups))  # decay exponential ramp (to help early epochs)
        
        for p in self.module.get_parameters():
            p.requires_grad = False


    def update(self, model: nn.Cell):
        # Update EMA parameters
        with torch.no_grad():
            self.updates += 1
            d = self.decay_fn(self.updates)
            msd = dist_utils.de_parallel(model).state_dict()
            for k, v in self.module.state_dict().items():
                if v.dtype.is_floating_point:
                    v *= d
                    v += (1 - d) * msd[k]
            
    def to(self, *args, **kwargs):
        self.module = self.module.to(*args, **kwargs)
        return self

    def state_dict(self, ):
        return dict(module=self.module.state_dict(), updates=self.updates)
    
    def load_state_dict(self, state, strict=True):
        self.module.load_state_dict(state['module'], strict=strict) 
        if 'updates' in state:
            self.updates = state['updates']

    def forwad(self, ):
        raise RuntimeError('ema...')

    def extra_repr(self) -> str:
        return f'decay={self.decay}, warmups={self.warmups}'


# NOTE: torch.optim.swa_utils.AveragedModel 在 MSAdapter 中不存在
# ExponentialMovingAverage 已移除，请统一使用上方的 ModelEMA
