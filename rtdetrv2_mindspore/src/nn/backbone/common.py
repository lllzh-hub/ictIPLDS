"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import numpy as np
import mindspore
import mindspore.nn as _msnn
import src.nn_compat as nn


class FrozenBatchNorm2d(_msnn.Cell):
    """BatchNorm2d where the batch statistics and affine parameters are fixed."""
    def __init__(self, num_features, eps=1e-5):
        super(FrozenBatchNorm2d, self).__init__()
        n = num_features
        self.num_features = n
        self.eps = eps
        self.weight = mindspore.Parameter(
            mindspore.Tensor(np.ones(n, dtype=np.float32)),
            name='weight', requires_grad=False)
        self.bias = mindspore.Parameter(
            mindspore.Tensor(np.zeros(n, dtype=np.float32)),
            name='bias', requires_grad=False)
        self.running_mean = mindspore.Parameter(
            mindspore.Tensor(np.zeros(n, dtype=np.float32)),
            name='running_mean', requires_grad=False)
        self.running_var = mindspore.Parameter(
            mindspore.Tensor(np.ones(n, dtype=np.float32)),
            name='running_var', requires_grad=False)

    def construct(self, x):
        w = self.weight.reshape(1, -1, 1, 1)
        b = self.bias.reshape(1, -1, 1, 1)
        rv = self.running_var.reshape(1, -1, 1, 1)
        rm = self.running_mean.reshape(1, -1, 1, 1)
        scale = w * (rv + self.eps).rsqrt()
        bias = b - rm * scale
        return x * scale + bias


    def extra_repr(self):
        return "{num_features}, eps={eps}".format(**self.__dict__)


def freeze_batch_norm2d(module):
    if isinstance(module, _msnn.BatchNorm2d):
        module = FrozenBatchNorm2d(module.num_features)
    else:
        for name, child in module.name_cells().items():
            _child = freeze_batch_norm2d(child)
            if _child is not child:
                setattr(module, name, _child)
    return module


def get_activation(act: str, inplace: bool = True):
    """get activation"""
    if act is None:
        return _msnn.Identity()
    elif isinstance(act, _msnn.Cell):
        return act

    act = act.lower()
    if act in ('silu', 'swish'):
        m = _msnn.SiLU()
    elif act == 'relu':
        m = _msnn.ReLU()
    elif act == 'leaky_relu':
        m = _msnn.LeakyReLU()
    elif act == 'gelu':
        m = _msnn.GELU()
    elif act == 'hardsigmoid':
        m = _msnn.HSigmoid()
    else:
        raise RuntimeError(f'Unknown activation: {act}')

    if hasattr(m, 'inplace'):
        m.inplace = inplace
    return m
