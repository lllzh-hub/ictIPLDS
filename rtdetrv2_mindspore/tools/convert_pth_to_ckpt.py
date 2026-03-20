#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 PyTorch .pth 权重文件转换为 MindSpore .ckpt 格式。

用法:
    python tools/convert_pth_to_ckpt.py -i weights/best.pth -o weights/best.ckpt --no-torch
"""

import os
import argparse
import numpy as np


def load_pth_with_torch(pth_path: str) -> dict:
    """用 PyTorch 加载 .pth，返回 {key: numpy_array} 字典"""
    import torch
    checkpoint = torch.load(pth_path, map_location='cpu')
    if isinstance(checkpoint, dict):
        if 'ema' in checkpoint and isinstance(checkpoint['ema'], dict):
            state = checkpoint['ema'].get('module', checkpoint['ema'])
            print('Using EMA weights')
        elif 'model' in checkpoint:
            state = checkpoint['model']
            print('Using model weights')
        else:
            state = checkpoint
            print('Using direct weights')
    else:
        raise ValueError(f'不支持的 checkpoint 格式: {type(checkpoint)}')
    result = {}
    for k, v in state.items():
        if hasattr(v, 'numpy'):
            result[k] = v.numpy()
        elif isinstance(v, np.ndarray):
            result[k] = v
        else:
            print(f'  [跳过] {k}: 非 Tensor 类型 {type(v)}')
    return result


def load_pth_without_torch(pth_path: str) -> dict:
    """不依赖 PyTorch，用 zipfile + numpy 解析 .pth（zip 格式）"""
    import zipfile
    import pickle
    import io
    import zlib

    print('尝试无 torch 依赖方式加载...')

    dtype_map = {
        'FloatStorage':   np.float32,
        'HalfStorage':    np.float16,
        'DoubleStorage':  np.float64,
        'LongStorage':    np.int64,
        'IntStorage':     np.int32,
        'ShortStorage':   np.int16,
        'ByteStorage':    np.uint8,
        'BoolStorage':    np.bool_,
        'BFloat16Storage': np.float32,  # 近似处理
    }

    class TorchStorage:
        def __init__(self, data, dtype):
            self.data = data
            self.dtype = dtype

    def read_member_safe(zf, name):
        """尝试读取 zip 成员，跳过 CRC 校验失败"""
        # 方法1：直接读
        try:
            return zf.read(name)
        except zipfile.BadZipFile:
            pass
        # 方法2：底层绕过 CRC
        try:
            info = zf.getinfo(name)
            with zf.open(info) as f:
                raw = f._fileobj.read(info.compress_size)
            if info.compress_type == zipfile.ZIP_DEFLATED:
                return zlib.decompress(raw, -15)
            return raw
        except Exception as e:
            print(f'  [警告] 无法读取 {name}: {e}')
            return None

    with zipfile.ZipFile(pth_path, 'r', allowZip64=True) as zf:
        names = zf.namelist()
        print(f'  zip 内文件数量: {len(names)}, 前10个: {names[:10]}')

        # 找 pkl 文件
        pkl_name = next((n for n in names if n.endswith('data.pkl') or n.endswith('.pkl')), None)
        if pkl_name is None:
            raise ValueError('找不到 .pkl 文件，可能不是标准 PyTorch zip 格式')

        # 读取所有 tensor 数据文件，跳过 CRC 失败的
        storage_files = {}
        for n in names:
            parts = n.split('/')
            if len(parts) >= 3 and parts[-2] == 'data':
                data = read_member_safe(zf, n)
                if data is not None:
                    storage_files[parts[-1]] = data
                else:
                    storage_files[parts[-1]] = b''  # 占位，避免 KeyError

        print(f'  已加载 {len(storage_files)} 个 tensor 存储块')

        class PthUnpickler(pickle.Unpickler):
            def find_class(self, module, name):
                if module == 'torch._utils' and name == '_rebuild_tensor_v2':
                    return PthUnpickler._rebuild_tensor
                if module == 'torch' and name in dtype_map:
                    _dtype = dtype_map[name]
                    def make_storage(*args):
                        return TorchStorage(None, _dtype)
                    return make_storage
                if module.startswith('torch'):
                    return lambda *a, **kw: None
                return super().find_class(module, name)

            @staticmethod
            def _rebuild_tensor(storage, offset, shape, stride, *args):
                if not isinstance(storage, TorchStorage) or not storage.data:
                    return None
                arr = np.frombuffer(storage.data, dtype=storage.dtype)
                if len(shape) == 0:
                    return arr[offset:offset + 1].reshape(())
                total = 1
                for s in shape:
                    total *= s
                return np.array(arr[offset:offset + total]).reshape(shape)

        class StorageLoader:
            def persistent_load(self, pid):
                # pid 格式: (storage_type, root_key, location, numel, dtype_str)
                # root_key 可能是整数或字符串，统一转字符串查找
                storage_type = pid[0]
                root_key = str(pid[1])  # 关键修复：整数 key -> 字符串
                _dtype = dtype_map.get(
                    storage_type.__name__ if hasattr(storage_type, '__name__') else '',
                    np.float32
                )
                data = storage_files.get(root_key, None)
                if data is None:
                    print(f'  [警告] storage key {root_key} 未找到')
                    return TorchStorage(b'', _dtype)
                return TorchStorage(data, _dtype)

        pkl_data = read_member_safe(zf, pkl_name)
        if pkl_data is None:
            raise RuntimeError(f'无法读取 {pkl_name}')

        unpickler = PthUnpickler(io.BytesIO(pkl_data))
        unpickler.persistent_load = StorageLoader().persistent_load
        raw = unpickler.load()

    # 提取权重字典
    if isinstance(raw, dict):
        if 'ema' in raw and isinstance(raw.get('ema'), dict):
            sd = raw['ema'].get('module', raw['ema'])
            print('Using EMA weights')
        elif 'model' in raw:
            sd = raw['model']
            print('Using model weights')
        else:
            sd = raw
            print('Using direct weights')
    else:
        sd = raw

    result = {}
    for k, v in sd.items():
        if isinstance(v, np.ndarray):
            result[k] = v
        elif v is None:
            print(f'  [跳过] {k}: None（对应 tensor 块读取失败）')
        else:
            print(f'  [跳过] {k}: {type(v)}')

    print(f'  成功提取 {len(result)} 个参数')
    return result


def save_ckpt(state_dict: dict, ckpt_path: str):
    """将 {key: numpy_array} 保存为 MindSpore .ckpt 或 numpy .npz"""
    if ckpt_path.endswith('.npz'):
        # 本地无 mindspore 时，先保存为 npz，再在服务器上转换
        np.savez(ckpt_path, **{k.replace('/', '_SLASH_'): v for k, v in state_dict.items()})
        print(f'已保存 {len(state_dict)} 个参数到: {ckpt_path} (numpy npz 格式)')
        print('在服务器上执行以下命令转为 .ckpt:')
        print(f'  python tools/convert_pth_to_ckpt.py --from-npz {ckpt_path} -o {ckpt_path.replace(".npz", ".ckpt")}')
        return

    try:
        import mindspore as ms
        param_list = []
        for k, v in state_dict.items():
            if not isinstance(v, np.ndarray):
                v = np.array(v)
            if v.dtype == np.float16:
                v = v.astype(np.float32)
            param_list.append({'name': k, 'data': ms.Tensor(v)})
        ms.save_checkpoint(param_list, ckpt_path)
        print(f'已保存 {len(param_list)} 个参数到: {ckpt_path}')
    except ImportError:
        # 没有 mindspore，自动改存 npz
        npz_path = ckpt_path.replace('.ckpt', '.npz')
        np.savez(npz_path, **{k.replace('/', '_SLASH_'): v for k, v in state_dict.items()})
        print(f'本地无 mindspore，已保存为 numpy 格式: {npz_path}')
        print(f'请将 {npz_path} 上传到服务器，然后运行：')
        print(f'  python tools/convert_pth_to_ckpt.py --from-npz {npz_path} -o weights/best.ckpt')


def main():
    parser = argparse.ArgumentParser(description='PyTorch .pth -> MindSpore .ckpt 转换工具')
    parser.add_argument('-i', '--input',    type=str, default=None, help='输入 .pth 文件路径')
    parser.add_argument('-o', '--output',   type=str, required=True, help='输出 .ckpt 文件路径')
    parser.add_argument('--no-torch', action='store_true',
                        help='不使用 torch 加载（适用于没有安装 torch 的环境）')
    parser.add_argument('--from-npz', type=str, default=None,
                        help='从 numpy .npz 文件转换为 .ckpt（在服务器上执行）')
    args = parser.parse_args()

    # 模式1：从 npz 转 ckpt（在服务器上运行）
    if args.from_npz:
        print(f'从 npz 转换: {args.from_npz} -> {args.output}')
        data = np.load(args.from_npz)
        state_dict = {k.replace('_SLASH_', '/'): data[k] for k in data.files}
        print(f'加载完成，共 {len(state_dict)} 个参数')
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        save_ckpt(state_dict, args.output)
        return

    # 模式2：从 pth 转换
    if args.input is None:
        parser.error('请指定 -i 输入文件，或用 --from-npz 从 npz 转换')

    print(f'输入: {args.input}')
    print(f'输出: {args.output}')

    if args.no_torch:
        state_dict = load_pth_without_torch(args.input)
    else:
        try:
            state_dict = load_pth_with_torch(args.input)
        except ImportError:
            print('未找到 torch，改用无 torch 模式...')
            state_dict = load_pth_without_torch(args.input)

    print(f'\n加载完成，共 {len(state_dict)} 个参数')
    for k in list(state_dict.keys())[:3]:
        print(f'  {k}: shape={state_dict[k].shape}, dtype={state_dict[k].dtype}')

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    save_ckpt(state_dict, args.output)
    print('\n转换完成！推理命令：')
    print(f'  python tools/test_image.py -r {args.output} -c <config> -f <image> -d npu -t 0.3 -o result.jpg')


if __name__ == '__main__':
    main()
