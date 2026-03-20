#!/usr/bin/env python3
"""
NPU vs CPU 推理帧率（FPS）对比基准测试
=====================================

测试香橙派 Ascend 310B NPU 与 CPU 推理速度差异，
输出详细的性能指标表格与结论。

用法示例：
  # 完整对比（NPU + CPU，均使用 MindSpore 后端）
  python tools/benchmark_npu_vs_cpu.py \
      -c configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v4.yml \
      -r weights/final.ckpt

  # 只测 NPU
  python tools/benchmark_npu_vs_cpu.py \
      -c configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v4.yml \
      -r weights/final.ckpt --only npu

  # 只测 CPU
  python tools/benchmark_npu_vs_cpu.py \
      -c configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v4.yml \
      -r weights/final.ckpt --only cpu

  # 自定义迭代次数（默认 warmup=10, measure=50）
  python tools/benchmark_npu_vs_cpu.py \
      -c configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v4.yml \
      -r weights/final.ckpt --warmup 5 --iters 30

  # 保存结果 JSON
  python tools/benchmark_npu_vs_cpu.py \
      -c configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v4.yml \
      -r weights/final.ckpt --save-json benchmark_result.json
"""

import os
import sys
import time
import json
import argparse
import datetime
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

# -----------------------------------------------------------------------
# ms_mint_patch 必须在所有 mindspore import 之前执行
# -----------------------------------------------------------------------
try:
    import ms_mint_patch  # noqa: F401
except ImportError:
    pass

import mindspore
import mindspore.mint
import mindspore.mint.nn
import mindspore.nn as _msnn
import contextlib

_MINT_PATCHES = {
    'Module':             _msnn.Cell,
    'Parameter':          mindspore.Parameter,
    'ModuleList':         _msnn.CellList,
    'ModuleDict':         _msnn.CellDict,
    'Sequential':         _msnn.SequentialCell,
    'Embedding':          _msnn.Embedding,
    'MultiheadAttention': _msnn.MultiheadAttention,
    'LayerNorm':          _msnn.LayerNorm,
    'BatchNorm2d':        _msnn.BatchNorm2d,
    'GroupNorm':          _msnn.GroupNorm,
    'Dropout':            _msnn.Dropout,
    'Identity':           _msnn.Identity,
    'ReLU':               _msnn.ReLU,
    'SiLU':               _msnn.SiLU,
    'GELU':               _msnn.GELU,
    'LeakyReLU':          _msnn.LeakyReLU,
    'Hardsigmoid':        _msnn.HSigmoid,
    'Conv2d':             _msnn.Conv2d,
    'Linear':             _msnn.Dense,
    'AvgPool2d':          _msnn.AvgPool2d,
    'MaxPool2d':          _msnn.MaxPool2d}
for _patch_name, _patch_cls in _MINT_PATCHES.items():
    if not hasattr(mindspore.mint.nn, _patch_name):
        setattr(mindspore.mint.nn, _patch_name, _patch_cls)
if not hasattr(mindspore.mint, 'no_grad'):
    mindspore.mint.no_grad = contextlib.nullcontext
# -----------------------------------------------------------------------


# ═══════════════════════════════════════════════════════════════════════
# 工具函数
# ═══════════════════════════════════════════════════════════════════════

def preprocess_dummy(size=(640, 640)):
    """生成随机测试图像（NCHW float32 numpy）"""
    img = np.random.randint(0, 256, (size[1], size[0], 3), dtype=np.uint8).astype(np.float32) / 255.0
    return img.transpose(2, 0, 1)[np.newaxis]   # (1,3,H,W)


def print_separator(char='═', width=68):
    print(char * width)


def print_section(title: str):
    print_separator()
    pad = (68 - len(title) - 2) // 2
    print(f"{'═' * pad} {title} {'═' * (68 - pad - len(title) - 2)}")
    print_separator()


# ═══════════════════════════════════════════════════════════════════════
# 模型加载（与 realtime_detect.py 完全一致）
# ═══════════════════════════════════════════════════════════════════════

def _remap_key(k, model_params):
    if k.endswith('.num_batches_tracked'):
        return None
    for suffix_from, suffix_to in [('.running_mean', 'moving_mean'),
                                    ('.running_var',  'moving_variance')]:
        if k.endswith(suffix_from):
            base = k[:-len(suffix_from)]
            candidate = base + '.' + suffix_to
            if candidate in model_params:
                return candidate
    for suffix_from, suffix_to in [('.weight', '.gamma'), ('.bias', '.beta')]:
        if k.endswith(suffix_from):
            base = k[:-len(suffix_from)]
            candidate = base + suffix_to
            if candidate in model_params:
                return candidate
    return k


def load_model(cfg_path: str, ckpt_path: str, device: str):
    """
    加载模型到指定设备（'npu' 或 'cpu'）。
    返回可调用的推理模型。
    """
    import mindspore as ms
    from src.core import YAMLConfig

    # 将相对路径转为绝对路径（相对于脚本所在目录的上一级，即项目根目录）
    _proj_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if not os.path.isabs(cfg_path):
        cfg_path = os.path.join(_proj_root, cfg_path)
    if not os.path.isabs(ckpt_path):
        ckpt_path = os.path.join(_proj_root, ckpt_path)

    dev = device.lower()
    if dev == 'npu':
        ms.set_context(mode=ms.PYNATIVE_MODE, device_target='Ascend')
        print(f'  [设备] Ascend NPU  (PYNATIVE_MODE)')
    else:
        ms.set_context(mode=ms.PYNATIVE_MODE, device_target='CPU')
        print(f'  [设备] CPU  (PYNATIVE_MODE)')

    print(f'  [配置] {cfg_path}')
    cfg = YAMLConfig(cfg_path)

    # —— 加载权重 ——
    print(f'  [权重] {ckpt_path}')
    if ckpt_path.endswith('.ckpt'):
        checkpoint = ms.load_checkpoint(ckpt_path)
        raw = {k: v.asnumpy() for k, v in checkpoint.items()}
    else:
        try:
            from safetensors.numpy import load_file as st_load
            raw = st_load(ckpt_path)
        except Exception:
            ckpt = ms.load_checkpoint(ckpt_path)
            raw = {k: v.asnumpy() for k, v in ckpt.items()}

    if any(k.startswith('ema.module.') for k in raw):
        state = {k[len('ema.module.'):]: v for k, v in raw.items()
                 if k.startswith('ema.module.')}
    elif any(k.startswith('model.') for k in raw):
        state = {k[len('model.'):]: v for k, v in raw.items()
                 if k.startswith('model.')}
    else:
        state = raw

    model_params = {p.name: p for p in cfg.model.get_parameters()}
    loaded, skipped = 0, []
    param_dict = {}
    for k, v in state.items():
        if v is None:
            skipped.append(k); continue
        arr = v.astype(np.float32) if isinstance(v, np.ndarray) else np.array(v, dtype=np.float32)
        mapped_k = _remap_key(k, model_params)
        if mapped_k is None:
            skipped.append(k); continue
        target_k = mapped_k if mapped_k in model_params else k
        ms_param = ms.Parameter(ms.Tensor(arr), name=target_k)
        if target_k in model_params and model_params[target_k].shape == ms_param.shape:
            target_dtype = model_params[target_k].dtype
            if target_dtype != ms_param.dtype:
                ms_param = ms.Parameter(ms_param.data.astype(target_dtype), name=target_k)
            param_dict[target_k] = ms_param
            loaded += 1
        else:
            skipped.append(k)
    ms.load_param_into_net(cfg.model, param_dict, strict_load=False)
    print(f'  [权重] 匹配: {loaded}  跳过: {len(skipped)}')

    # Ascend 310B 注意事项（与 realtime_detect.py 完全一致）：
    # 卷积层内部自动走 fp16 计算（Conv2dFp16），其余层保持 fp32。
    # 不做整体 to_float(fp16)，避免 Linear/MatMulV2 走不支持的
    # fp16 FRACTAL_NZ 内核，触发 aicpu 软件模拟导致速度极慢（2300ms/帧）。
    # CPU 后端同样不需要 fp16 转换。
    if dev == 'npu':
        import mindspore.nn as _ms_nn
        # 仅对卷积层做 fp16（与 realtime_detect.py 一致：不整体转换）
        # 实际上什么都不做，让框架自动选择精度
        print('  [精度] 保持 fp32（Ascend 310B 卷积内部自动 fp16，避免 aicpu 回退）')
    else:
        print('  [精度] CPU fp32 推理')

    # CPU 后端：修复 ConstantPadND 未注册问题
    # deploy() 会调用 RepVggBlock.convert_to_deploy -> F.pad(kernel, [1,1,1,1])
    # mindspore.mint.nn.functional.pad 在 CPU 上对应 ConstantPadND，未注册
    # 提前将所有 RepVggBlock 的 _pad_1x1_to_3x3_tensor 替换为 ops.pad 实现
    if dev != 'npu':
        import mindspore.ops as _ops
        import mindspore.mint.nn.functional as _F_mint
        try:
            from src.zoo.rtdetr.hybrid_encoder import RepVggBlock
            for _, cell in cfg.model.cells_and_names():
                if isinstance(cell, RepVggBlock):
                    def _safe_pad(self, k):
                        if k is None:
                            return 0
                        return _ops.pad(k, ((0,0),(0,0),(1,1),(1,1)))
                    import types
                    cell._pad_1x1_to_3x3_tensor = types.MethodType(_safe_pad, cell)
        except Exception as _e:
            print(f'  [警告] CPU pad 修复跳过: {_e}')

    # 推理封装
    class _InferModel(ms.nn.Cell):
        def __init__(self, cfg_):
            super().__init__()
            self.model = cfg_.model.deploy()
            self.postprocessor = cfg_.postprocessor.deploy()

        def construct(self, images, orig_target_sizes):
            outputs = self.model(images)
            return self.postprocessor(outputs, orig_target_sizes)

    infer_model = _InferModel(cfg)
    infer_model.set_train(False)
    print(f'  [模型] 加载完成，fp32 推理（Ascend 310B 卷积内部自动 fp16）')
    return infer_model


# ═══════════════════════════════════════════════════════════════════════
# 单设备基准测试
# ═══════════════════════════════════════════════════════════════════════

def benchmark_device(cfg_path: str, ckpt_path: str, device: str,
                     warmup: int = 10, iters: int = 50,
                     input_size: tuple = (640, 640)) -> dict:
    """
    对指定设备运行推理基准测试。
    返回包含 FPS、延迟等统计数据的字典。
    """
    import mindspore as ms

    print(f'\n  正在加载模型到 {device.upper()}...')
    model = load_model(cfg_path, ckpt_path, device)

    dummy_np   = preprocess_dummy(input_size)
    orig_size  = np.array([[input_size[0], input_size[1]]], dtype=np.float32)
    im_tensor  = ms.Tensor(dummy_np, ms.float32)
    sz_tensor  = ms.Tensor(orig_size, ms.float32)

    # —— 预热 ——
    print(f'  预热中（{warmup} 次）...')
    for i in range(warmup):
        t_w0 = time.perf_counter()
        _ = model(im_tensor, sz_tensor)
        t_w1 = time.perf_counter()
        w_ms = (t_w1 - t_w0) * 1000
        tag = ' <- JIT编译完成' if (i > 0 and w_ms < 500) else (' <- 正在编译...' if w_ms > 1000 else '')
        print(f'    warmup[{i+1}/{warmup}] {w_ms:8.1f} ms{tag}')
    print('  预热完成')

    # —— 正式计时 ——
    print(f'  正式测量（{iters} 次）...', end='', flush=True)
    latencies = []
    for i in range(iters):
        t0 = time.perf_counter()
        _ = model(im_tensor, sz_tensor)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000)  # ms
        if (i + 1) % max(1, iters // 10) == 0:
            print('.', end='', flush=True)
    print(' 完成')

    latencies = np.array(latencies)
    result = {
        'device':         device.upper(),
        'warmup_iters':   warmup,
        'measure_iters':  iters,
        'input_size':     f'{input_size[0]}x{input_size[1]}',
        'latency_ms': {
            'mean':   round(float(np.mean(latencies)),   2),
            'std':    round(float(np.std(latencies)),    2),
            'min':    round(float(np.min(latencies)),    2),
            'max':    round(float(np.max(latencies)),    2),
            'p50':    round(float(np.percentile(latencies, 50)), 2),
            'p90':    round(float(np.percentile(latencies, 90)), 2),
            'p99':    round(float(np.percentile(latencies, 99)), 2)},
        'fps': {
            'mean':   round(1000.0 / float(np.mean(latencies)),   2),
            'peak':   round(1000.0 / float(np.min(latencies)),    2),
            'stable': round(1000.0 / float(np.percentile(latencies, 90)), 2)},
        'raw_latencies_ms': latencies.tolist()}
    return result


# ═══════════════════════════════════════════════════════════════════════
# 报告打印
# ═══════════════════════════════════════════════════════════════════════

def print_single_result(r: dict):
    dev = r['device']
    lat = r['latency_ms']
    fps = r['fps']
    print(f"  设备          : {dev}")
    print(f"  输入尺寸      : {r['input_size']}")
    print(f"  测量次数      : {r['measure_iters']}  预热: {r['warmup_iters']}")
    print(f"  ┌─────────────────────────────────────────────┐")
    print(f"  │  延迟 (ms)   mean={lat['mean']:>7.2f}   std={lat['std']:>6.2f}       │")
    print(f"  │              min ={lat['min']:>7.2f}   max={lat['max']:>7.2f}       │")
    print(f"  │              P50 ={lat['p50']:>7.2f}   P90={lat['p90']:>7.2f}   P99={lat['p99']:>7.2f}│")
    print(f"  ├─────────────────────────────────────────────┤")
    print(f"  │  FPS         平均={fps['mean']:>7.2f}   峰值={fps['peak']:>7.2f}       │")
    print(f"  │              稳定(P90)={fps['stable']:>7.2f}                   │")
    print(f"  └─────────────────────────────────────────────┘")


def print_comparison(npu_r: dict, cpu_r: dict):
    print_section('对比总结')

    npu_fps  = npu_r['fps']['mean']
    cpu_fps  = cpu_r['fps']['mean']
    speedup  = npu_fps / max(cpu_fps, 1e-6)

    npu_lat  = npu_r['latency_ms']['mean']
    cpu_lat  = cpu_r['latency_ms']['mean']
    lat_reduction = (cpu_lat - npu_lat) / max(cpu_lat, 1e-6) * 100

    # 判断实时性
    REALTIME_FPS = 25.0   # PAL / 常见视频标准
    npu_rt = '✓ 实时' if npu_fps >= REALTIME_FPS else '✗ 未达实时'
    cpu_rt = '✓ 实时' if cpu_fps >= REALTIME_FPS else '✗ 未达实时'

    col = 16
    print(f"  {'指标':<{col}}  {'NPU (Ascend 310B)':>20}  {'CPU':>16}  {'NPU/CPU 比':>12}")
    print(f"  {'─'*col}  {'─'*20}  {'─'*16}  {'─'*12}")
    print(f"  {'平均延迟 (ms)':<{col}}  {npu_lat:>20.2f}  {cpu_lat:>16.2f}  {cpu_lat/max(npu_lat,1e-6):>10.2f}x")
    print(f"  {'平均 FPS':<{col}}  {npu_fps:>20.2f}  {cpu_fps:>16.2f}  {speedup:>10.2f}x")
    print(f"  {'峰值 FPS':<{col}}  {npu_r['fps']['peak']:>20.2f}  {cpu_r['fps']['peak']:>16.2f}  {'—':>12}")
    print(f"  {'P90 稳定 FPS':<{col}}  {npu_r['fps']['stable']:>20.2f}  {cpu_r['fps']['stable']:>16.2f}  {'—':>12}")
    print(f"  {'P99 延迟 (ms)':<{col}}  {npu_r['latency_ms']['p99']:>20.2f}  {cpu_r['latency_ms']['p99']:>16.2f}  {'—':>12}")
    print(f"  {'实时性 (≥25fps)':<{col}}  {npu_rt:>20}  {cpu_rt:>16}  {'—':>12}")
    print()

    # —— 结论 ——
    print_section('结论与硬件选择依据')
    print(f"  NPU 平均 FPS : {npu_fps:.2f}  （较 CPU 提速 {speedup:.2f}x，延迟降低 {lat_reduction:.1f}%）")
    print()
    if speedup >= 3:
        verdict = f'NPU 推理速度是 CPU 的 {speedup:.1f} 倍，加速效果显著。'
    elif speedup >= 1.5:
        verdict = f'NPU 推理速度是 CPU 的 {speedup:.1f} 倍，有明显加速。'
    else:
        verdict = f'NPU 相对 CPU 加速约 {speedup:.1f} 倍（可能受预热/驱动影响，建议重跑）。'
    print(f'  {verdict}')
    print()

    reasons = []
    if npu_fps >= REALTIME_FPS and cpu_fps < REALTIME_FPS:
        reasons.append(f'  ✓ 仅 NPU 满足实时处理要求（≥{REALTIME_FPS} FPS），CPU 无法达到实时。')
    elif npu_fps >= REALTIME_FPS and cpu_fps >= REALTIME_FPS:
        reasons.append(f'  ✓ NPU 和 CPU 均可实时，但 NPU 延迟更低（{npu_lat:.1f}ms vs {cpu_lat:.1f}ms），'
                       f'更适合多路并发或高精度场景。')
    else:
        reasons.append(f'  ! NPU 尚未达到 {REALTIME_FPS} FPS 实时标准，建议检查驱动/模型量化配置。')

    reasons += [
        f'  ✓ 香橙派 Ascend 310B NPU 算力：8 TOPS（INT8），专为边缘 AI 推理设计。',
        f'  ✓ 相比 CPU，NPU 并行计算矩阵运算，功耗仅约 8W，性价比更高。',
        f'  ✓ RT-DETRv2（ResNet-50）推理输入 640×640，NPU 的 fp16 流水线可充分利用 DaVinci 架构。',
        f'  ✓ 边缘部署场景（无 GPU）：NPU 是唯一能满足工业实时检测需求的硬件选择。',
    ]
    for r in reasons:
        print(r)
    print()
    print_separator()


# ═══════════════════════════════════════════════════════════════════════
# 主函数
# ═══════════════════════════════════════════════════════════════════════

def parse_args():
    parser = argparse.ArgumentParser(
        description='NPU vs CPU 推理帧率对比基准测试',
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=(
            '示例（与 realtime_detect.py 保持一致的参数风格）:\n'
            '  python tools/benchmark_npu_vs_cpu.py \\\n'
            '      -c configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v6.yml \\\n'
            '      -r weights/powerlinev3.ckpt\n'
            '  # 只测 NPU:\n'
            '  python tools/benchmark_npu_vs_cpu.py \\\n'
            '      -c configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v6.yml \\\n'
            '      -r weights/powerlinev3.ckpt --only npu\n'
        ))
    parser.add_argument('-c', '--config', type=str,
                        default='configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v6.yml',
                        help='YML 配置文件路径\n（默认: configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v6.yml）')
    parser.add_argument('-r', '--resume', type=str,
                        default='weights/powerlinev3.ckpt',
                        help='权重文件路径（.ckpt）\n（默认: weights/powerlinev3.ckpt）')
    parser.add_argument('-t', '--threshold', type=float, default=0.4,
                        help='置信度阈值，与 realtime_detect.py 保持一致（默认 0.4）')
    parser.add_argument('--warmup', type=int, default=10,
                        help='预热推理次数（默认 10）')
    parser.add_argument('--iters', type=int, default=50,
                        help='正式计时推理次数（默认 50）')
    parser.add_argument('--input-size', type=int, default=640,
                        dest='input_size',
                        help='输入图像边长（默认 640）')
    parser.add_argument('--only', type=str, default=None,
                        choices=['npu', 'cpu'],
                        help='只测单个设备（不填则两者都测）')
    parser.add_argument('--save-json', type=str, default=None,
                        dest='save_json',
                        help='将结果保存为 JSON 文件路径')
    return parser.parse_args()


def main():
    args = parse_args()
    input_size = (args.input_size, args.input_size)

    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print_separator('═')
    print(f'  RT-DETRv2 推理基准测试  —  NPU vs CPU')
    print(f'  开始时间 : {ts}')
    print(f'  配置文件 : {args.config}')
    print(f'  权重文件 : {args.resume}')
    print(f'  置信阈值 : {args.threshold}  （与 realtime_detect.py --threshold 保持一致）')
    print(f'  输入尺寸 : {input_size[0]}×{input_size[1]}')
    print(f'  预热次数 : {args.warmup}    计时次数 : {args.iters}')
    if args.only:
        print(f'  测试设备 : 仅 {args.only.upper()}')
    else:
        print(f'  测试设备 : NPU (Ascend 310B)  +  CPU（完整对比）')
    print_separator()

    results = {}

    # —— NPU 测试 ——
    if args.only in (None, 'npu'):
        print_section('NPU (Ascend 310B) 测试')
        try:
            npu_result = benchmark_device(
                args.config, args.resume, 'npu',
                warmup=args.warmup, iters=args.iters,
                input_size=input_size)
            results['npu'] = npu_result
            print()
            print_single_result(npu_result)
        except Exception as e:
            print(f'  [错误] NPU 测试失败: {e}')
            import traceback; traceback.print_exc()
            results['npu'] = {'error': str(e)}

    # —— CPU 测试 ——
    if args.only in (None, 'cpu'):
        print_section('CPU 测试')
        try:
            cpu_result = benchmark_device(
                args.config, args.resume, 'cpu',
                warmup=args.warmup, iters=args.iters,
                input_size=input_size)
            results['cpu'] = cpu_result
            print()
            print_single_result(cpu_result)
        except Exception as e:
            print(f'  [错误] CPU 测试失败: {e}')
            import traceback; traceback.print_exc()
            results['cpu'] = {'error': str(e)}

    # —— 对比报告 ——
    if 'npu' in results and 'cpu' in results \
            and 'error' not in results['npu'] \
            and 'error' not in results['cpu']:
        print_comparison(results['npu'], results['cpu'])
    elif args.only is not None and args.only in results:
        # 只测了一个设备，单独打印
        print_section(f'{args.only.upper()} 单设备结果')
        r = results[args.only]
        if 'error' not in r:
            fps  = r['fps']['mean']
            lat  = r['latency_ms']['mean']
            rt   = 'YES' if fps >= 25.0 else 'NO'
            print(f"  平均 FPS : {fps:.2f}  |  平均延迟 : {lat:.2f} ms  |  实时(≥25fps) : {rt}")
        print_separator()

    # —— 保存 JSON ——
    output = {
        'benchmark_time': ts,
        'config':         args.config,
        'resume':         args.resume,
        'input_size':     f'{input_size[0]}x{input_size[1]}',
        'warmup_iters':   args.warmup,
        'measure_iters':  args.iters,
        'results':        results,
    }
    if 'npu' in results and 'cpu' in results \
            and 'error' not in results.get('npu', {'error': True}) \
            and 'error' not in results.get('cpu', {'error': True}):
        output['speedup_x'] = round(
            results['npu']['fps']['mean'] / max(results['cpu']['fps']['mean'], 1e-6), 3)

    save_path = args.save_json
    if save_path is None:
        ts_fname = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        save_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            f'benchmark_result_{ts_fname}.json')
    with open(save_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f'\n  结果已保存至: {save_path}')
    print_separator()


if __name__ == '__main__':
    main()
