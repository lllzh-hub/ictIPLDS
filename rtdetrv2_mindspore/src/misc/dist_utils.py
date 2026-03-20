"""
Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import os
import random
import time
import atexit
import numpy as np

import mindspore as ms
import mindspore.mint as torch
from mindspore import Tensor
import src.nn_compat as nn

try:
    import mindspore.communication as dist
    _DIST_AVAILABLE = True
except ImportError:
    _DIST_AVAILABLE = False

class _FakeCudnn:
    deterministic = False
    benchmark = False
    def is_available(self):
        return False
cudnn = _FakeCudnn()

DP = None
DDP = None

# DataLoader not imported at module level to avoid circular deps


def setup_distributed(print_rank=0, print_method='builtin', seed=None):
    try:
        dist.init()
        enabled_dist = True
        print('Initialized distributed mode...')
    except Exception:
        enabled_dist = False
        print('Not init distributed mode.')
    setup_print(get_rank() == print_rank, method=print_method)
    if seed is not None:
        setup_seed(seed)
    return enabled_dist


def setup_print(is_main, method='builtin'):
    import builtins as __builtin__
    builtin_print = __builtin__.print
    def print(*args, **kwargs):
        force = kwargs.pop('force', False)
        if is_main or force:
            builtin_print(*args, **kwargs)
    __builtin__.print = print


def is_dist_available_and_initialized():
    if not _DIST_AVAILABLE:
        return False
    try:
        return dist.get_rank() >= 0
    except Exception:
        return False


@atexit.register
def cleanup():
    pass


def get_rank():
    if not is_dist_available_and_initialized():
        return 0
    try:
        return dist.get_rank()
    except Exception:
        return 0


def get_world_size():
    if not is_dist_available_and_initialized():
        return 1
    try:
        return dist.get_group_size()
    except Exception:
        return 1


def is_main_process():
    return get_rank() == 0


def save_on_master(*args, **kwargs):
    if is_main_process():
        ms.save_checkpoint(*args, **kwargs)


def warp_model(model, sync_bn=False, dist_mode='ddp', find_unused_parameters=False,
               compile=False, compile_mode='reduce-overhead', **kwargs):
    return model


def de_model(model):
    return model


def warp_loader(loader, shuffle=False):
    return loader


def is_parallel(model):
    return False


def de_parallel(model):
    return model


def reduce_dict(data, avg=True):
    return data


def all_gather(data):
    return [data]


def sync_time():
    return time.time()


def setup_seed(seed, deterministic=False):
    seed = seed + get_rank()
    random.seed(seed)
    np.random.seed(seed)
    ms.set_seed(seed)


def check_compile():
    return False


def is_compile(model):
    return False


def de_complie(model):
    return model
