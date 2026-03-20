"""
mindspore_init_compat.py
兼容 PyTorch nn.init API，推理时为 no-op（权重由 load_checkpoint 覆盖）
"""
import mindspore
import numpy as np

def constant_(tensor, val):
    """no-op for inference: weights are loaded from checkpoint"""
    try:
        data = np.full(tensor.shape, val, dtype=np.float32)
        tensor.set_data(mindspore.Tensor(data))
    except Exception:
        pass

def zeros_(tensor):
    constant_(tensor, 0.0)

def ones_(tensor):
    constant_(tensor, 1.0)

def normal_(tensor, mean=0.0, std=1.0):
    try:
        data = np.random.normal(mean, std, tensor.shape).astype(np.float32)
        tensor.set_data(mindspore.Tensor(data))
    except Exception:
        pass

def xavier_uniform_(tensor, gain=1.0):
    try:
        from mindspore.common.initializer import XavierUniform, initializer
        shape = tensor.shape
        data = initializer(XavierUniform(gain), shape, mindspore.float32)
        tensor.set_data(data)
    except Exception:
        pass

def xavier_normal_(tensor, gain=1.0):
    xavier_uniform_(tensor, gain)

def kaiming_uniform_(tensor, *args, **kwargs):
    try:
        from mindspore.common.initializer import HeUniform, initializer
        data = initializer(HeUniform(), tensor.shape, mindspore.float32)
        tensor.set_data(data)
    except Exception:
        pass

def kaiming_normal_(tensor, *args, **kwargs):
    kaiming_uniform_(tensor)

def uniform_(tensor, a=0.0, b=1.0):
    try:
        data = np.random.uniform(a, b, tensor.shape).astype(np.float32)
        tensor.set_data(mindspore.Tensor(data))
    except Exception:
        pass

def trunc_normal_(tensor, mean=0.0, std=1.0, a=-2.0, b=2.0):
    normal_(tensor, mean, std)

# 兼容 init.constant_ 等调用方式
