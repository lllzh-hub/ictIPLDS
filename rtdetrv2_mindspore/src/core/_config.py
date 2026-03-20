"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import mindspore.mint as torch
from mindspore import Tensor
import src.nn_compat as nn
import mindspore.nn as msnn  # 用于 nn.Cell -> msnn.Cell
from mindspore.nn import Optimizer
from mindspore.nn.learning_rate_schedule import LearningRateSchedule as LRScheduler
from mindspore.amp import DynamicLossScaler as GradScaler

# mindspore.mint.nn 没有 Module，补丁到 msnn.Cell
if not hasattr(nn, 'Module'):
    nn.Cell = msnn.Cell

# DataLoader / Dataset 占位（推理不使用，训练时按需替换）
try:
    from mindspore.dataset import GeneratorDataset as DataLoader
except ImportError:
    DataLoader = object

Dataset = object

# SummaryWriter 兼容层
try:
    from mindspore.train.summary import SummaryRecord as _SR
    class SummaryWriter:
        """薄包装，接口对齐原 SummaryWriter"""
        def __init__(self, log_dir='.', *args, **kwargs):
            self._sr = _SR(log_dir)
        def add_scalar(self, tag, scalar_value, global_step=0, **kwargs):
            self._sr.add_value(tag, 'scalar', scalar_value)
        def add_text(self, *args, **kwargs):
            pass
        def add_image(self, *args, **kwargs):
            pass
        def close(self):
            self._sr.close()
except Exception:
    class SummaryWriter:  # type: ignore
        """Fallback no-op SummaryWriter"""
        def __init__(self, *args, **kwargs): pass
        def add_scalar(self, *args, **kwargs): return None
        def add_text(self, *args, **kwargs): return None
        def add_image(self, *args, **kwargs): return None
        def close(self): return None

from pathlib import Path
from typing import Callable, List, Dict


__all__ = ['BaseConfig', ]


class BaseConfig(object):

    def __init__(self) -> None:
        super().__init__()

        self.task: str = None

        # instance / function
        self._model: nn.Cell = None
        self._postprocessor: nn.Cell = None
        self._criterion: nn.Cell = None
        self._optimizer: Optimizer = None
        self._lr_scheduler: LRScheduler = None
        self._lr_warmup_scheduler: LRScheduler = None
        self._train_dataloader = None
        self._val_dataloader = None
        self._ema: nn.Cell = None
        self._scaler = None
        self._train_dataset = None
        self._val_dataset = None
        self._collate_fn: Callable = None
        self._evaluator: Callable = None
        self._writer: SummaryWriter = None

        # dataset
        self.num_workers: int = 0
        self.batch_size: int = None
        self._train_batch_size: int = None
        self._val_batch_size: int = None
        self._train_shuffle: bool = None
        self._val_shuffle: bool = None

        # runtime
        self.resume: str = None
        self.tuning: str = None

        self.epoches: int = None
        self.last_epoch: int = -1

        self.use_amp: bool = False
        self.use_ema: bool = False
        self.ema_decay: float = 0.9999
        self.ema_warmups: int = 2000
        self.sync_bn: bool = False
        self.clip_max_norm: float = 0.
        self.find_unused_parameters: bool = None

        self.seed: int = None
        self.print_freq: int = None
        self.checkpoint_freq: int = 1
        self.output_dir: str = None
        self.summary_dir: str = None
        self.device: str = ''

    @property
    def model(self) -> nn.Cell:
        return self._model

    @model.setter
    def model(self, m):
        assert isinstance(m, nn.Cell), f'{type(m)} != nn.Cell'
        self._model = m

    @property
    def postprocessor(self) -> nn.Cell:
        return self._postprocessor

    @postprocessor.setter
    def postprocessor(self, m):
        assert isinstance(m, nn.Cell), f'{type(m)} != nn.Cell'
        self._postprocessor = m

    @property
    def criterion(self) -> nn.Cell:
        return self._criterion

    @criterion.setter
    def criterion(self, m):
        assert isinstance(m, nn.Cell), f'{type(m)} != nn.Cell'
        self._criterion = m

    @property
    def optimizer(self):
        return self._optimizer

    @optimizer.setter
    def optimizer(self, m):
        self._optimizer = m

    @property
    def lr_scheduler(self):
        return self._lr_scheduler

    @lr_scheduler.setter
    def lr_scheduler(self, m):
        self._lr_scheduler = m

    @property
    def lr_warmup_scheduler(self):
        return self._lr_warmup_scheduler

    @lr_warmup_scheduler.setter
    def lr_warmup_scheduler(self, m):
        self._lr_warmup_scheduler = m

    @property
    def train_dataloader(self):
        return self._train_dataloader

    @train_dataloader.setter
    def train_dataloader(self, loader):
        self._train_dataloader = loader

    @property
    def val_dataloader(self):
        return self._val_dataloader

    @val_dataloader.setter
    def val_dataloader(self, loader):
        self._val_dataloader = loader

    @property
    def ema(self) -> nn.Cell:
        if self._ema is None and self.use_ema and self.model is not None:
            from ..optim import ModelEMA
            self._ema = ModelEMA(self.model, self.ema_decay, self.ema_warmups)
        return self._ema

    @ema.setter
    def ema(self, obj):
        self._ema = obj

    @property
    def scaler(self):
        return self._scaler

    @scaler.setter
    def scaler(self, obj):
        self._scaler = obj

    @property
    def val_shuffle(self) -> bool:
        if self._val_shuffle is None:
            print('warning: set default val_shuffle=False')
            return False
        return self._val_shuffle

    @val_shuffle.setter
    def val_shuffle(self, shuffle):
        assert isinstance(shuffle, bool), 'shuffle must be bool'
        self._val_shuffle = shuffle

    @property
    def train_shuffle(self) -> bool:
        if self._train_shuffle is None:
            print('warning: set default train_shuffle=True')
            return True
        return self._train_shuffle

    @train_shuffle.setter
    def train_shuffle(self, shuffle):
        assert isinstance(shuffle, bool), 'shuffle must be bool'
        self._train_shuffle = shuffle

    @property
    def train_batch_size(self) -> int:
        if self._train_batch_size is None and isinstance(self.batch_size, int):
            print(f'warning: set train_batch_size=batch_size={self.batch_size}')
            return self.batch_size
        return self._train_batch_size

    @train_batch_size.setter
    def train_batch_size(self, batch_size):
        assert isinstance(batch_size, int), 'batch_size must be int'
        self._train_batch_size = batch_size

    @property
    def val_batch_size(self) -> int:
        if self._val_batch_size is None:
            print(f'warning: set val_batch_size=batch_size={self.batch_size}')
            return self.batch_size
        return self._val_batch_size

    @val_batch_size.setter
    def val_batch_size(self, batch_size):
        assert isinstance(batch_size, int), 'batch_size must be int'
        self._val_batch_size = batch_size

    @property
    def train_dataset(self):
        return self._train_dataset

    @train_dataset.setter
    def train_dataset(self, dataset):
        self._train_dataset = dataset

    @property
    def val_dataset(self):
        return self._val_dataset

    @val_dataset.setter
    def val_dataset(self, dataset):
        self._val_dataset = dataset

    @property
    def collate_fn(self) -> Callable:
        return self._collate_fn

    @collate_fn.setter
    def collate_fn(self, fn):
        self._collate_fn = fn

    @property
    def evaluator(self) -> Callable:
        return self._evaluator

    @evaluator.setter
    def evaluator(self, fn):
        self._evaluator = fn

    @property
    def writer(self) -> SummaryWriter:
        if self._writer is None:
            if self.summary_dir:
                self._writer = SummaryWriter(self.summary_dir)
            elif self.output_dir:
                self._writer = SummaryWriter(str(Path(self.output_dir) / 'summary'))
        return self._writer

    @writer.setter
    def writer(self, m):
        self._writer = m

    def __repr__(self):
        s = ''
        for k, v in self.__dict__.items():
            if not k.startswith('_'):
                s += f'{k}: {v}\n'
        return s
