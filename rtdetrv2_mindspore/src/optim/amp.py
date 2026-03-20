"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

# NOTE: torch.cuda.amp.GradScaler 在 MSAdapter+Ascend 上不可用
# 用 try/except 兼容性导入
from ..core import register

__all__ = ['GradScaler']

try:
    import mindspore.mint.cuda.amp as amp
    GradScaler = register()(amp.grad_scaler.GradScaler)
except Exception:
    # Ascend / MSAdapter 环境下无 AMP，提供空壳占位
    @register()
    class GradScaler:  # type: ignore
        """AMP GradScaler 不可用时的空壳实现（Ascend/MSAdapter 环境）"""
        def __init__(self, *args, **kwargs):
            pass
        def scale(self, loss):
            return loss
        def unscale_(self, optimizer):
            pass
        def step(self, optimizer):
            optimizer.step()
        def update(self):
            pass
        def state_dict(self):
            return {}
        def load_state_dict(self, state_dict):
            pass
