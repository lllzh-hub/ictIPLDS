
# mindspore.mint 兼容补丁
import mindspore
import mindspore.mint as _mint
import contextlib

# 补充缺失的属性
if not hasattr(_mint, 'Tensor'):
    _mint.Tensor = mindspore.Tensor
if not hasattr(_mint, 'no_grad'):
    _mint.no_grad = contextlib.nullcontext
if not hasattr(_mint, 'device'):
    _mint.device = str
if not hasattr(_mint, 'dtype'):
    _mint.dtype = type

import mindspore.mint.nn as _mint_nn
import mindspore.nn as _msnn
_patches = {
    "Module": _msnn.Cell, "ModuleList": _msnn.CellList,
    "ModuleDict": _msnn.CellDict, "Sequential": _msnn.SequentialCell,
    "Parameter": mindspore.Parameter,
    "Embedding": _msnn.Embedding, "MultiheadAttention": _msnn.MultiheadAttention,
    "LayerNorm": _msnn.LayerNorm, "BatchNorm2d": _msnn.BatchNorm2d,
    "GroupNorm": _msnn.GroupNorm, "Dropout": _msnn.Dropout,
    "Identity": _msnn.Identity, "ReLU": _msnn.ReLU, "SiLU": _msnn.SiLU,
    "GELU": _msnn.GELU, "LeakyReLU": _msnn.LeakyReLU,
    "Hardsigmoid": _msnn.HSigmoid, "Conv2d": _msnn.Conv2d,
    "Linear": _msnn.Dense, "AvgPool2d": _msnn.AvgPool2d,
    "MaxPool2d": _msnn.MaxPool2d,
}
for _n, _c in _patches.items():
    if not hasattr(_mint_nn, _n):
        setattr(_mint_nn, _n, _c)
