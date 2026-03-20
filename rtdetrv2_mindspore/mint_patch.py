
import mindspore.nn as _msnn
import mindspore
import mindspore.mint.nn as _mint_nn

_PATCHES = {
    "Module":        _msnn.Cell,
    "Parameter":     mindspore.Parameter,
    "ModuleList":    _msnn.CellList,
    "ModuleDict":    _msnn.CellDict,
    "Sequential":    _msnn.SequentialCell,
    "Embedding":     _msnn.Embedding,
    "MultiheadAttention": _msnn.MultiheadAttention,
    "LayerNorm":     _msnn.LayerNorm,
    "BatchNorm2d":   _msnn.BatchNorm2d,
    "GroupNorm":     _msnn.GroupNorm,
    "Dropout":       _msnn.Dropout,
    "Identity":      _msnn.Identity,
    "ReLU":          _msnn.ReLU,
    "SiLU":          _msnn.SiLU,
    "GELU":          _msnn.GELU,
    "LeakyReLU":     _msnn.LeakyReLU,
    "Hardsigmoid":   _msnn.HSigmoid,
    "Conv2d":        _msnn.Conv2d,
    "Linear":        _msnn.Dense,
    "AvgPool2d":     _msnn.AvgPool2d,
    "MaxPool2d":     _msnn.MaxPool2d,
}
for _n, _c in _PATCHES.items():
    if not hasattr(_mint_nn, _n):
        setattr(_mint_nn, _n, _c)

import contextlib
if not hasattr(mindspore.mint, "no_grad"):
    mindspore.mint.no_grad = contextlib.nullcontext
