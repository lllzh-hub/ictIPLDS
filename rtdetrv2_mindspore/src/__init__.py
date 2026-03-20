"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

# for register purpose
# data 和 optim 模块仅在训练时需要，推理时延迟加载以避免不必要的依赖
try:
    from . import optim
except Exception as e:
    import warnings
    warnings.warn(f'optim module not loaded: {e}')

try:
    from . import data
except Exception as e:
    import warnings
    warnings.warn(f'data module not loaded: {e}')

from . import nn
from . import zoo
