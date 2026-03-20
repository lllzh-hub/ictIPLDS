"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""
import mindspore.mint as torch
from mindspore import Tensor
import src.nn_compat as nn
import mindspore.nn as _msnn
# 补充 mindspore.mint.nn 缺少的容器类
for _cls in ["CellList","CellDict","SequentialCell","Sequential",
             "ModuleList","ModuleDict","BatchNorm2d","GroupNorm",
             "LayerNorm","InstanceNorm2d","Embedding","MultiheadAttention",
             "Identity","Dropout","LeakyReLU","SiLU","GELU",
             "Hardsigmoid","Hardswish","ReLU6","AvgPool2d","MaxPool2d",
             "AdaptiveAvgPool2d","ConvTranspose2d","PixelShuffle","Flatten"]:
    if not hasattr(nn, _cls) and hasattr(_msnn, _cls):
        setattr(nn, _cls, getattr(_msnn, _cls))
del _msnn, _cls

import mindspore.mint.nn.functional as F

from collections import OrderedDict

from .common import get_activation, FrozenBatchNorm2d

from ...core import register


__all__ = ['PResNet']


ResNet_cfg = {
    18: [2, 2, 2, 2],
    34: [3, 4, 6, 3],
    50: [3, 4, 6, 3],
    101: [3, 4, 23, 3],
    # 152: [3, 8, 36, 3],
}


donwload_url = {
    18: 'https://github.com/lyuwenyu/storage/releases/download/v0.1/ResNet18_vd_pretrained_from_paddle.pth',
    34: 'https://github.com/lyuwenyu/storage/releases/download/v0.1/ResNet34_vd_pretrained_from_paddle.pth',
    50: 'https://github.com/lyuwenyu/storage/releases/download/v0.1/ResNet50_vd_ssld_v2_pretrained_from_paddle.pth',
    101: 'https://github.com/lyuwenyu/storage/releases/download/v0.1/ResNet101_vd_ssld_pretrained_from_paddle.pth',
}


class ConvNormLayer(nn.Cell):
    def __init__(self, ch_in, ch_out, kernel_size, stride, padding=None, bias=False, act=None):
        bias = bool(bias) if bias is not None else False
        super().__init__()
        self.conv = nn.Conv2d(
            ch_in, 
            ch_out, 
            kernel_size, 
            stride, 
            padding=(kernel_size-1)//2 if padding is None else padding, 
            bias=bias)
        self.norm = nn.BatchNorm2d(ch_out)
        self.act = get_activation(act) 

    def construct(self, x):
        return self.act(self.norm(self.conv(x)))


class BasicBlock(nn.Cell):
    expansion = 1

    def __init__(self, ch_in, ch_out, stride, shortcut, act='relu', variant='b'):
        super().__init__()

        self.shortcut = shortcut

        if not shortcut:
            if variant == 'd' and stride == 2:
                self.short = nn.Sequential(OrderedDict([
                    ('pool', nn.AvgPool2d(2, 2, 0, ceil_mode=True)),
                    ('conv', ConvNormLayer(ch_in, ch_out, 1, 1))
                ]))
            else:
                self.short = ConvNormLayer(ch_in, ch_out, 1, stride)

        self.branch2a = ConvNormLayer(ch_in, ch_out, 3, stride, act=act)
        self.branch2b = ConvNormLayer(ch_out, ch_out, 3, 1, act=None)
        self.act = nn.Identity() if act is None else get_activation(act) 


    def construct(self, x):
        out = self.branch2a(x)
        out = self.branch2b(out)
        if self.shortcut:
            short = x
        else:
            short = self.short(x)
        
        out = out + short
        out = self.act(out)

        return out


class BottleNeck(nn.Cell):
    expansion = 4

    def __init__(self, ch_in, ch_out, stride, shortcut, act='relu', variant='b'):
        super().__init__()

        if variant == 'a':
            stride1, stride2 = stride, 1
        else:
            stride1, stride2 = 1, stride

        width = ch_out 

        self.branch2a = ConvNormLayer(ch_in, width, 1, stride1, act=act)
        self.branch2b = ConvNormLayer(width, width, 3, stride2, act=act)
        self.branch2c = ConvNormLayer(width, ch_out * self.expansion, 1, 1)

        self.shortcut = shortcut
        if not shortcut:
            if variant == 'd' and stride == 2:
                self.short = nn.Sequential(OrderedDict([
                    ('pool', nn.AvgPool2d(2, 2, 0, ceil_mode=True)),
                    ('conv', ConvNormLayer(ch_in, ch_out * self.expansion, 1, 1))
                ]))
            else:
                self.short = ConvNormLayer(ch_in, ch_out * self.expansion, 1, stride)

        self.act = nn.Identity() if act is None else get_activation(act) 

    def construct(self, x):
        out = self.branch2a(x)
        out = self.branch2b(out)
        out = self.branch2c(out)

        if self.shortcut:
            short = x
        else:
            short = self.short(x)

        out = out + short
        out = self.act(out)

        return out


class Blocks(nn.Cell):
    def __init__(self, block, ch_in, ch_out, count, stage_num, act='relu', variant='b'):
        super().__init__()

        self.blocks = nn.CellList()
        for i in range(count):
            self.blocks.append(
                block(
                    ch_in, 
                    ch_out,
                    stride=2 if i == 0 and stage_num != 2 else 1, 
                    shortcut=False if i == 0 else True,
                    variant=variant,
                    act=act)
            )

            if i == 0:
                ch_in = ch_out * block.expansion

    def construct(self, x):
        out = x
        for block in self.blocks:
            out = block(out)
        return out


@register()
class PResNet(nn.Cell):
    def __init__(
        self, 
        depth, 
        variant='d', 
        num_stages=4, 
        return_idx=[0, 1, 2, 3], 
        act='relu',
        freeze_at=-1, 
        freeze_norm=True, 
        pretrained=False):
        super().__init__()

        block_nums = ResNet_cfg[depth]
        ch_in = 64
        if variant in ['c', 'd']:
            conv_def = [
                [3, ch_in // 2, 3, 2, "conv1_1"],
                [ch_in // 2, ch_in // 2, 3, 1, "conv1_2"],
                [ch_in // 2, ch_in, 3, 1, "conv1_3"],
            ]
        else:
            conv_def = [[3, ch_in, 7, 2, "conv1_1"]]

        self.conv1 = nn.Sequential(OrderedDict([
            (name, ConvNormLayer(cin, cout, k, s, act=act)) for cin, cout, k, s, name in conv_def
        ]))

        ch_out_list = [64, 128, 256, 512]
        block = BottleNeck if depth >= 50 else BasicBlock

        _out_channels = [block.expansion * v for v in ch_out_list]
        _out_strides = [4, 8, 16, 32]

        self.res_layers = nn.CellList()
        for i in range(num_stages):
            stage_num = i + 2
            self.res_layers.append(
                Blocks(block, ch_in, ch_out_list[i], block_nums[i], stage_num, act=act, variant=variant)
            )
            ch_in = _out_channels[i]

        self.return_idx = return_idx
        self.out_channels = [_out_channels[_i] for _i in return_idx]
        self.out_strides = [_out_strides[_i] for _i in return_idx]

        # Ascend 310B: MaxPool2d 需要 fp16 输入，使用 MaxPool2dFp16 包装器
        self.stem_pool = nn.MaxPool2d(kernel_size=3, stride=2, pad_mode='pad', padding=1)

        if freeze_at >= 0:
            self._freeze_parameters(self.conv1)
            for i in range(min(freeze_at, num_stages)):
                self._freeze_parameters(self.res_layers[i])

        if freeze_norm:
            self._freeze_norm(self)

        if pretrained:
            if isinstance(pretrained, bool):
                # NOTE: torch.hub.load_state_dict_from_url 在 MSAdapter/Ascend 上不可用
                # 请预先下载权重到本地，并将 pretrained 设置为本地路径
                # 下载地址: {donwload_url[depth]}
                raise ValueError(
                    f'pretrained=True 不支持自动下载。请手动下载 ResNet{depth} 权重:\n'
                    f'  {donwload_url[depth]}\n'
                    f'并将 pretrained 设置为本地文件路径。'
                )
            elif 'http' in str(pretrained):
                # NOTE: MSAdapter/Ascend 上不支持 torch.hub 远程下载，改用本地路径
                raise ValueError(
                    f'不支持 http 远程加载权重。请手动下载:\n  {pretrained}\n并设置为本地路径。'
                )
            else:
                state = torch.load(pretrained, map_location='cpu')
            self.load_state_dict(state)
            print(f'Load PResNet{depth} state_dict')

    def _freeze_parameters(self, m: nn.Cell):
        for p in m.get_parameters():
            p.requires_grad = False

    def _freeze_norm(self, m: nn.Cell):
        if isinstance(m, nn.BatchNorm2d):
            m = FrozenBatchNorm2d(m.num_features)
        else:
            for name, child in m.name_cells().items():
                _child = self._freeze_norm(child)
                if _child is not child:
                    setattr(m, name, _child)
        return m

    def construct(self, x):
        conv1 = self.conv1(x)
        # NOTE: Ascend 310B 上 F.max_pool2d 走 MaxPool2dWithMask 算子，310B 不支持。
        # 改用 mindspore.nn.MaxPool2d（普通 MaxPool，310B 支持）。
        x = self.stem_pool(conv1)
        outs = []
        for idx, stage in enumerate(self.res_layers):
            x = stage(x)
            if idx in self.return_idx:
                outs.append(x)
        return outs


