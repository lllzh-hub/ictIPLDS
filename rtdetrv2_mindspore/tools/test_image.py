"""测试训练好的模型 - 单张图片推理（MindSpore 原生版，支持 NPU）
Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""
import os

import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

import sys as _sys
_sys.path.insert(0, '/home/ma-user/work/rtdetrv2_pytorch')
import ms_mint_patch  # 全局补丁

# -----------------------------------------------------------------------
# 全局补丁：mindspore.mint.nn 缺少 Module，统一用 mindspore.nn.Cell 填充
# -----------------------------------------------------------------------
import mindspore
import mindspore.mint
import mindspore.mint.nn
import mindspore.nn as _msnn

_MINT_PATCHES = {
    'Module':        _msnn.Cell,
    'Parameter':     mindspore.Parameter,
    'ModuleList':    _msnn.CellList,
    'ModuleDict':    _msnn.CellDict,
    'Sequential':    _msnn.SequentialCell,
    'Embedding':     _msnn.Embedding,
    'MultiheadAttention': _msnn.MultiheadAttention,
    'LayerNorm':     _msnn.LayerNorm,
    'BatchNorm2d':   _msnn.BatchNorm2d,
    'GroupNorm':     _msnn.GroupNorm,
    'Dropout':       _msnn.Dropout,
    'Identity':      _msnn.Identity,
    'ReLU':          _msnn.ReLU,
    'SiLU':          _msnn.SiLU,
    'GELU':          _msnn.GELU,
    'LeakyReLU':     _msnn.LeakyReLU,
    'Hardsigmoid':   _msnn.HSigmoid,
    'Conv2d':        _msnn.Conv2d,
    'Linear':        _msnn.Dense,
    'AvgPool2d':     _msnn.AvgPool2d,
    'MaxPool2d':     _msnn.MaxPool2d,
}
for _n, _c in _MINT_PATCHES.items():
    if not hasattr(mindspore.mint.nn, _n):
        setattr(mindspore.mint.nn, _n, _c)

import contextlib
if not hasattr(mindspore.mint, 'no_grad'):
    mindspore.mint.no_grad = contextlib.nullcontext
# -----------------------------------------------------------------------


# -----------------------------------------------------------------------
# 全局补丁：mindspore.mint.nn 缺少 Module，统一用 mindspore.nn.Cell 填充
# 必须在所有其他 import 之前执行
# -----------------------------------------------------------------------
import mindspore
import mindspore.mint
import mindspore.mint.nn
import mindspore.nn as _msnn

_MINT_PATCHES = {
    'Module':        _msnn.Cell,
    'Parameter':     mindspore.Parameter,
    'ModuleList':    _msnn.CellList,
    'ModuleDict':    _msnn.CellDict,
    'Sequential':    _msnn.SequentialCell,
    'Embedding':     _msnn.Embedding,
    'MultiheadAttention': _msnn.MultiheadAttention,
    'LayerNorm':     _msnn.LayerNorm,
    'BatchNorm2d':   _msnn.BatchNorm2d,
    'GroupNorm':     _msnn.GroupNorm,
    'Dropout':       _msnn.Dropout,
    'Identity':      _msnn.Identity,
    'ReLU':          _msnn.ReLU,
    'SiLU':          _msnn.SiLU,
    'GELU':          _msnn.GELU,
    'LeakyReLU':     _msnn.LeakyReLU,
    'Hardsigmoid':   _msnn.HSigmoid,
    'Conv2d':        _msnn.Conv2d,
    'Linear':        _msnn.Dense,
    'AvgPool2d':     _msnn.AvgPool2d,
    'MaxPool2d':     _msnn.MaxPool2d,
}
for _name, _cls in _MINT_PATCHES.items():
    if not hasattr(mindspore.mint.nn, _name):
        setattr(mindspore.mint.nn, _name, _cls)

# mindspore.mint 本身也需要 no_grad
if not hasattr(mindspore.mint, 'no_grad'):
    import contextlib
    mindspore.mint.no_grad = contextlib.nullcontext

# -----------------------------------------------------------------------

import numpy as np
import argparse
from PIL import Image, ImageDraw

import mindspore as ms
import mindspore.mint as torch
import mindspore.mint.nn as nn
from mindspore import Tensor

# 增加 PIL 图片大小限制
Image.MAX_IMAGE_PIXELS = None

from src.core import YAMLConfig

# 类别名称（8类电力线数据集）
CLASS_NAMES = [
    'cable_defectueux',          # 0: 电缆缺陷
    'isolateur_manquant',        # 1: 绝缘子缺失
    'rouille',                   # 2: 锈蚀
    'Broken shell',              # 3: 外壳破损
    'nest',                      # 4: 鸟巢
    'Flashover damage shell',    # 5: 闪络损伤外壳
    'kite',                      # 6: 风筝
    'trash',                     # 7: 垃圾
]


def preprocess(im_pil, size=(640, 640)):
    """图像预处理：Resize + ToTensor，纯 numpy 实现，无需 torchvision"""
    im = im_pil.resize(size, Image.BILINEAR)
    im_np = np.array(im, dtype=np.float32) / 255.0          # HWC, [0,1]
    im_np = im_np.transpose(2, 0, 1)                        # CHW
    im_np = im_np[np.newaxis, ...]                           # NCHW
    return Tensor(im_np, ms.float32)


def draw_boxes(im, labels, boxes, scores, threshold=0.5, class_names=None):
    """在图片上绘制检测框和标签"""
    draw = ImageDraw.Draw(im)

    # 转为 numpy 方便索引
    labels_np = labels.asnumpy()
    boxes_np  = boxes.asnumpy()
    scores_np = scores.asnumpy()

    valid_mask = scores_np > threshold
    labels_np = labels_np[valid_mask]
    boxes_np  = boxes_np[valid_mask]
    scores_np = scores_np[valid_mask]

    colors = [
        'red', 'blue', 'green', 'yellow', 'orange',
        'purple', 'cyan', 'magenta', 'lime', 'pink',
        'brown', 'navy'
    ]

    for label_idx, box, score_val in zip(labels_np, boxes_np, scores_np):
        label_idx = int(label_idx)
        score_val = float(score_val)
        color = colors[label_idx % len(colors)]
        draw.rectangle(list(box), outline=color, width=3)
        if class_names and label_idx < len(class_names):
            label_text = f"{class_names[label_idx]}: {score_val:.2f}"
        else:
            label_text = f"Class {label_idx}: {score_val:.2f}"
        text_bbox = draw.textbbox((box[0], box[1]), label_text)
        draw.rectangle(
            [text_bbox[0]-2, text_bbox[1]-2, text_bbox[2]+2, text_bbox[3]+2],
            fill=color, outline=color
        )
        draw.text((box[0], box[1]), label_text, fill='white')

    return im


def main(args):
    # 设置 MindSpore 运行设备
    device = args.device.lower() if args.device else 'cpu'
    if device == 'npu':
        ms.set_context(mode=ms.PYNATIVE_MODE, device_target='Ascend')
        print('Using device: Ascend NPU')
    elif device.startswith('cuda') or device == 'gpu':
        ms.set_context(mode=ms.PYNATIVE_MODE, device_target='GPU')
        print('Using device: GPU')
    else:
        ms.set_context(mode=ms.PYNATIVE_MODE, device_target='CPU')
        print('Using device: CPU')

    print(f'Loading config: {args.config}')
    cfg = YAMLConfig(args.config)

    print(f'Loading checkpoint: {args.resume}')

    # 兼容 PyTorch .pth 和 MindSpore .ckpt 两种格式
    if args.resume.endswith('.ckpt'):
        checkpoint = ms.load_checkpoint(args.resume)
        # MindSpore ckpt 直接是 {name: Parameter} 字典
        raw = {k: v.asnumpy() for k, v in checkpoint.items()}
    else:
        # PyTorch .pth 格式，用 pickle + numpy 加载，无需安装 torch
        import pickle
        import io

        class _TorchUnpickler(pickle.Unpickler):
            """最小化 torch 反序列化，把 tensor 转为 numpy"""
            def find_class(self, module, name):
                # 拦截 torch.storage，返回 bytes
                if 'torch' in module:
                    return lambda *a, **kw: None
                return super().find_class(module, name)

        # 直接用 numpy 读取（适用于 zip 格式的 .pth）
        try:
            import zipfile
            with zipfile.ZipFile(args.resume) as zf:
                # pytorch zip 格式：archive/data.pkl + archive/data/0, 1, ...
                names = zf.namelist()
                # 找到所有 tensor 数据文件
                data_files = {n: zf.read(n) for n in names if '/data/' in n or n.endswith('.npy')}
        except Exception:
            data_files = {}

        # 用 torch 的方式：通过 numpy bridge 加载（不依赖 torch）
        try:
            # 尝试用 safetensors（MindSpore 2.6 已安装）
            from safetensors.numpy import load_file as st_load
            # 先尝试 safetensors 格式
            raw = st_load(args.resume)
            print('Loaded as safetensors format')
        except Exception:
            # fallback: 用 mindspore 的 load_checkpoint 尝试（对某些 pth 有效）
            try:
                ckpt = ms.load_checkpoint(args.resume)
                raw = {k: v.asnumpy() for k, v in ckpt.items()}
                print('Loaded as MindSpore ckpt format')
            except Exception:
                raise RuntimeError(
                    f'无法加载权重文件 {args.resume}。\n'
                    f'请将 .pth 转换为 MindSpore .ckpt 格式后再使用，或运行：\n'
                    f'  python tools/convert_pth_to_ckpt.py -i {args.resume} -o weights/best.ckpt'
                )

    # 兼容 EMA / model / 直接权重 三种 key 前缀
    if any(k.startswith('ema.module.') for k in raw):
        state = {k[len('ema.module.'):]: v for k, v in raw.items() if k.startswith('ema.module.')}
        print('Using EMA weights')
    elif any(k.startswith('model.') for k in raw):
        state = {k[len('model.'):]: v for k, v in raw.items() if k.startswith('model.')}
        print('Using model weights')
    else:
        state = raw
        print('Using direct weights')

    # 加载权重，跳过 shape 不匹配的参数
    model_params = {p.name: p for p in cfg.model.get_parameters()}
    loaded, skipped = 0, []
    param_dict = {}
    for k, v in state.items():
        if v is None:
            skipped.append(k)
            continue
        arr = np.array(v, dtype=np.float32) if not isinstance(v, np.ndarray) else v.astype(np.float32)
        ms_param = ms.Parameter(ms.Tensor(arr), name=k)
        if k in model_params and model_params[k].shape == ms_param.shape:
            # 类型匹配：根据模型参数的实际 dtype 进行转换
            target_dtype = model_params[k].dtype
            if target_dtype != ms_param.dtype:
                ms_param = ms.Parameter(ms_param.data.astype(target_dtype), name=k)
            param_dict[k] = ms_param
            loaded += 1
        else:
            skipped.append(k)
    ms.load_param_into_net(cfg.model, param_dict, strict_load=False)
    print(f'Model weights loaded. Matched: {loaded}, Skipped: {len(skipped)}')
    if skipped:
        print(f'Skipped keys: {skipped[:5]} ...')

    # 推理封装
    class Model(ms.nn.Cell):
        def __init__(self):
            super().__init__()
            self.model = cfg.model.deploy()
            self.postprocessor = cfg.postprocessor.deploy()

        def construct(self, images, orig_target_sizes):
            outputs = self.model(images)
            return self.postprocessor(outputs, orig_target_sizes)

    model = Model()
    model.set_train(False)
    print(f'Model ready.')

    # 加载图片
    print('Loading image...')
    im_pil = Image.open(args.im_file).convert('RGB')
    w, h = im_pil.size
    print(f'Image size: {w} x {h}')

    # 预处理
    im_data = preprocess(im_pil, size=(640, 640))
    orig_size = Tensor(np.array([[w, h]], dtype=np.float32), ms.float32)

    # 推理
    print('Running inference...')
    labels, boxes, scores = model(im_data, orig_size)

    labels = labels[0]
    boxes  = boxes[0]
    scores = scores[0]

    scores_np = scores.asnumpy()
    valid_count = int((scores_np > args.threshold).sum())
    print(f'Detected {valid_count} objects (threshold={args.threshold})')

    # 绘制并保存
    result_img = draw_boxes(
        im_pil.copy(), labels, boxes, scores,
        threshold=args.threshold, class_names=CLASS_NAMES
    )
    output_path = args.output if args.output else 'test_result.jpg'
    result_img.save(output_path)
    print(f'Result saved to: {output_path}')

    # 打印统计
    if valid_count > 0:
        labels_np = labels.asnumpy()
        valid_mask = scores_np > args.threshold
        print('\nDetection statistics:')
        for i, name in enumerate(CLASS_NAMES):
            count = int((labels_np[valid_mask] == i).sum())
            if count > 0:
                print(f'  {name}: {count} objects')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='测试训练好的 RT-DETR 模型（MindSpore 原生）')
    parser.add_argument('-c', '--config',    type=str, required=True,  help='配置文件路径')
    parser.add_argument('-r', '--resume',    type=str, required=True,  help='权重文件路径')
    parser.add_argument('-f', '--im-file',   type=str, required=True,  help='测试图片路径')
    parser.add_argument('-d', '--device',    type=str, default='npu',  help='设备: npu / gpu / cpu')
    parser.add_argument('-t', '--threshold', type=float, default=0.5,  help='置信度阈值')
    parser.add_argument('-o', '--output',    type=str, default=None,   help='输出图片路径')
    args = parser.parse_args()
    main(args) 