"""
实时检测脚本 - 支持视频文件和摄像头两种输入
输入：视频流 / 摄像头
输出：结果 JSON 文件 + 包含缺陷的帧截图

后端选择：
  --backend mindspore  使用 MindSpore 原生推理（支持 NPU/GPU/CPU，推荐）
  --backend onnx       使用 ONNX Runtime 推理（需先导出 ONNX）

用法示例：
  # MindSpore NPU 后端（直接使用 .ckpt 权重）
  python tools/realtime_detect.py \\
      -c configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v4.yml \\
      -r weights/final.ckpt --backend mindspore \\
      --source video --video-path /home/HwHiAiUser/video.mp4 \\
      --output-dir results/ --threshold 0.4 --device npu --no-display

  # ONNX 后端（需先导出）
  python tools/realtime_detect.py \\
      -c configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v4.yml \\
      --onnx-file weights/model.onnx \\
      --source video --video-path /home/HwHiAiUser/video.mp4 \\
      --output-dir results/ --threshold 0.4 --no-display

Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""
import os
import sys
import cv2
import json
import time
import argparse
import datetime
import numpy as np
from multiprocessing import Process, Queue, Event
import queue

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

# -----------------------------------------------------------------------
# ms_mint_patch 必须在所有 mindspore import 之前执行
# （与 test_image.py 保持一致）
# -----------------------------------------------------------------------
try:
    import ms_mint_patch  # noqa: F401
except ImportError:
    pass  # 不在项目根目录时忽略，后面手动打补丁

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
    'MaxPool2d':          _msnn.MaxPool2d,
}
for _patch_name, _patch_cls in _MINT_PATCHES.items():
    if not hasattr(mindspore.mint.nn, _patch_name):
        setattr(mindspore.mint.nn, _patch_name, _patch_cls)
if not hasattr(mindspore.mint, 'no_grad'):
    mindspore.mint.no_grad = contextlib.nullcontext
# -----------------------------------------------------------------------


# -----------------------------------------------------------------------
# 类别定义
# -----------------------------------------------------------------------
# 8类 - rtdetrv2_r50vd_finetune_powerline_v4.yml
CLASS_NAMES_8 = [
    'cable_defectueux',        # 0
    'isolateur_manquant',      # 1
    'rouille',                 # 2
    'Broken shell',            # 3
    'nest',                    # 4
    'Flashover damage shell',  # 5
    'kite',                    # 6
    'trash',                   # 7
]

# 12类 - powerline_coco.yml
CLASS_NAMES_12 = [
    'nest', 'kite', 'trash', 'balloon',
    '电缆破损', '绝缘子破损', '正常电缆', '正常绝缘子',
    '杆塔', '植被遮挡', '绝缘子闪络', '绝缘子外壳破损',
]

# BGR 颜色（OpenCV）
CLASS_COLORS_BGR = [
    (80, 80, 255), (0, 165, 255), (0, 215, 255), (47, 255, 173),
    (60, 20, 220), (226, 43, 138), (100, 200, 100), (200, 200, 100),
    (180, 130, 70), (34, 139, 34), (0, 69, 255), (211, 0, 148),
]

# 运行时全局（由 run_detection 赋值）
CLASS_NAMES = CLASS_NAMES_8
DEFECT_CLASS_IDS = set(range(8))


def resolve_class_names(num_cls):
    """根据 num_classes 返回 (class_names, defect_ids)"""
    if num_cls == 12:
        names = CLASS_NAMES_12
        defect_ids = {i for i, n in enumerate(names) if '正常' not in n}
    elif num_cls == 8:
        names = CLASS_NAMES_8
        defect_ids = set(range(8))
    else:
        names = [f'class_{i}' for i in range(num_cls)]
        defect_ids = set(range(num_cls))
    return names, defect_ids


# -----------------------------------------------------------------------
# 图像预处理（纯 numpy，两种后端共用）
# -----------------------------------------------------------------------
def preprocess_numpy(frame_bgr, size=(640, 640)):
    """BGR numpy -> NCHW float32 numpy [0,1]"""
    img_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img_rgb, size, interpolation=cv2.INTER_LINEAR)
    img = img.astype(np.float32) / 255.0
    return img.transpose(2, 0, 1)[np.newaxis]  # (1,3,H,W)


# -----------------------------------------------------------------------
# 绘制检测框
# -----------------------------------------------------------------------
def draw_boxes_cv2(frame, labels_np, boxes_np, scores_np, threshold=0.5):
    result = frame.copy()
    h, w = result.shape[:2]
    mask = scores_np > threshold
    for lbl, box, scr in zip(labels_np[mask], boxes_np[mask], scores_np[mask]):
        lbl = int(lbl)
        scr = float(scr)
        x1 = max(0, int(box[0]))
        y1 = max(0, int(box[1]))
        x2 = min(w - 1, int(box[2]))
        y2 = min(h - 1, int(box[3]))
        color = CLASS_COLORS_BGR[lbl % len(CLASS_COLORS_BGR)]
        cv2.rectangle(result, (x1, y1), (x2, y2), color, 2)
        name = CLASS_NAMES[lbl] if lbl < len(CLASS_NAMES) else f'cls{lbl}'
        text = f'{name}: {scr:.2f}'
        (tw, th), bl = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        ty = max(y1 - 4, th + bl + 4)
        cv2.rectangle(result, (x1, ty - th - bl - 2), (x1 + tw + 4, ty + 2), color, -1)
        cv2.putText(result, text, (x1 + 2, ty - bl),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    return result


# =======================================================================
# 后端 A：ONNX Runtime（推荐用于 Ascend 310B）
# =======================================================================
class ONNXBackend:
    """
    使用 ONNX Runtime 推理，完全绕开 MindSpore，兼容 Ascend 310B。
    - 若安装了 CANNExecutionProvider 则自动走 NPU
    - 否则走 CPU（310B 上 CPU 推理也足够）
    """
    def __init__(self, onnx_path):
        import onnxruntime as ort
        available = ort.get_available_providers()
        if 'CANNExecutionProvider' in available:
            providers = ['CANNExecutionProvider', 'CPUExecutionProvider']
            print(f'ONNX Runtime: CANNExecutionProvider (NPU)')
        else:
            providers = ['CPUExecutionProvider']
            print(f'ONNX Runtime: CPUExecutionProvider  (available: {available})')
        self.sess = ort.InferenceSession(onnx_path, providers=providers)
        # 检查输入名称（兼容不同导出方式）
        input_names = [i.name for i in self.sess.get_inputs()]
        self.img_key  = 'images'            if 'images'            in input_names else input_names[0]
        self.size_key = 'orig_target_sizes' if 'orig_target_sizes' in input_names else input_names[1]
        print(f'ONNX loaded: {onnx_path}  inputs={input_names}')

    def infer(self, frame_bgr):
        h, w = frame_bgr.shape[:2]
        im_data   = preprocess_numpy(frame_bgr, size=(640, 640))  # (1,3,640,640)
        orig_size = np.array([[w, h]], dtype=np.float32)          # (1,2)
        outputs   = self.sess.run(
            None,
            {self.img_key: im_data, self.size_key: orig_size}
        )
        # outputs: labels(1,300) boxes(1,300,4) scores(1,300)
        labels_np = outputs[0][0].astype(np.int32)
        boxes_np  = outputs[1][0].astype(np.float32)
        scores_np = outputs[2][0].astype(np.float32)
        return labels_np, boxes_np, scores_np


# =======================================================================
# 后端 B：MindSpore 原生（支持 NPU/GPU/CPU，与 test_image.py 完全一致）
# =======================================================================


class MindSporeBackend:
    """
    MindSpore 原生后端，与 test_image.py 完全一致的推理方式。
    支持 NPU (Ascend 310B) / GPU / CPU，直接加载 fp32 权重，无需 fp16 转换。
    """
    def __init__(self, cfg_path, ckpt_path, device='cpu'):
        import mindspore as ms
        from mindspore import Tensor
        from src.core import YAMLConfig

        self.ms = ms
        self.Tensor = Tensor

        # 设备初始化
        dev = device.lower()
        if dev == 'npu':
            # Ascend 310B：使用 PYNATIVE_MODE 避免 GRAPH_MODE 下
            # MaxPool2dFp16 等自定义算子闭包变量无法解析的问题
            ms.set_context(mode=ms.PYNATIVE_MODE, device_target='Ascend')
            print('Using device: Ascend NPU (PYNATIVE_MODE)')
        elif dev in ('gpu', 'cuda'):
            ms.set_context(mode=ms.PYNATIVE_MODE, device_target='GPU')
            print('Using device: GPU')
        else:
            ms.set_context(mode=ms.PYNATIVE_MODE, device_target='CPU')
            print('Using device: CPU')

        print(f'Loading config: {cfg_path}')
        cfg = YAMLConfig(cfg_path)
        self._load_weights(cfg, ckpt_path)

        # 推理封装：PYNATIVE_MODE 下直接传递输出
        class _Model(ms.nn.Cell):
            def __init__(self, cfg):
                super().__init__()
                self.model = cfg.model.deploy()
                self.postprocessor = cfg.postprocessor.deploy()

            def construct(self, images, orig_target_sizes):
                outputs = self.model(images)
                return self.postprocessor(outputs, orig_target_sizes)

        self.model = _Model(cfg)
        self.model.set_train(False)
        # Ascend 310B：卷积通过 Conv2dFp16 内部自动做 fp16 计算，其余层保持 fp32
        # 这里不再整体 to_float(fp16)，避免 Linear / MatMulV2 走不支持的 fp16 FRACTAL_NZ 内核
        print('Model ready.')

    def _load_weights(self, cfg, resume_path):
        """与 test_image.py 完全一致的权重加载逻辑"""
        ms = self.ms
        print(f'Loading checkpoint: {resume_path}')
        if resume_path.endswith('.ckpt'):
            checkpoint = ms.load_checkpoint(resume_path)
            raw = {k: v.asnumpy() for k, v in checkpoint.items()}
        else:
            try:
                from safetensors.numpy import load_file as st_load
                raw = st_load(resume_path)
                print('Loaded as safetensors format')
            except Exception:
                try:
                    ckpt = ms.load_checkpoint(resume_path)
                    raw = {k: v.asnumpy() for k, v in ckpt.items()}
                    print('Loaded as MindSpore ckpt format')
                except Exception:
                    raise RuntimeError(
                        f'无法加载权重文件 {resume_path}。\n'
                        f'请转换格式：\n'
                        f'  python tools/convert_pth_to_ckpt.py -i {resume_path} -o weights/best.ckpt'
                    )

        # 兼容 EMA / model / 直接权重 三种前缀（与 test_image.py 一致）
        if any(k.startswith('ema.module.') for k in raw):
            state = {k[len('ema.module.'):]: v for k, v in raw.items()
                     if k.startswith('ema.module.')}
            print('Using EMA weights')
        elif any(k.startswith('model.') for k in raw):
            state = {k[len('model.'):]: v for k, v in raw.items()
                     if k.startswith('model.')}
            print('Using model weights')
        else:
            state = raw
            print('Using direct weights')

        # 加载权重，跳过 shape 不匹配的参数（与 test_image.py 一致）
        model_params = {p.name: p for p in cfg.model.get_parameters()}

        # 将 ckpt 中 PyTorch 风格的 Norm 参数名映射到 MindSpore 风格
        # LayerNorm / BatchNorm:
        #   weight        -> gamma
        #   bias          -> beta
        #   running_mean  -> moving_mean
        #   running_var   -> moving_variance
        # 其中 num_batches_tracked 在 MindSpore 中不存在，直接跳过
        def _remap_key(k):
            # 1) 跳过 num_batches_tracked（PyTorch BN 的 buffer，在 MindSpore 中没有）
            if k.endswith('.num_batches_tracked'):
                return None

            # 2) 处理 running_mean / running_var -> moving_mean / moving_variance
            for suffix_from, suffix_to in [
                ('.running_mean', 'moving_mean'),
                ('.running_var', 'moving_variance'),
            ]:
                if k.endswith(suffix_from):
                    base = k[:-len(suffix_from)]
                    candidate = base + '.' + suffix_to
                    if candidate in model_params:
                        return candidate

            # 3) 处理 weight / bias -> gamma / beta
            #    仅当映射后的 key 在当前网络参数中存在时才生效，避免误改卷积层
            for suffix_from, suffix_to in [
                ('.weight', '.gamma'),
                ('.bias', '.beta'),
            ]:
                if k.endswith(suffix_from):
                    base = k[:-len(suffix_from)]
                    candidate = base + suffix_to
                    if candidate in model_params:
                        return candidate

            # 默认：不做映射
            return k

        loaded, skipped = 0, []
        param_dict = {}
        for k, v in state.items():
            if v is None:
                skipped.append(k)
                continue
            arr = np.array(v, dtype=np.float32) if not isinstance(v, np.ndarray) else v.astype(np.float32)
            # 尝试原始 key，再尝试重映射 key
            mapped_k = _remap_key(k)
            # 返回 None 表示该参数应被跳过（如 num_batches_tracked）
            if mapped_k is None:
                skipped.append(k)
                continue
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
        print(f'Model weights loaded. Matched: {loaded}, Skipped: {len(skipped)}')
        if skipped:
            print(f'Skipped keys (first 5): {skipped[:5]}')

        # Ascend 310B：整网转 fp16（几乎所有算子只支持 fp16）
        # BN / LayerNorm 保持 fp32（这些算子只支持 fp32）
        import mindspore.nn as _ms_nn
        cfg.model.to_float(ms.float16)
        for _, cell in cfg.model.cells_and_names():
            if isinstance(cell, (_ms_nn.BatchNorm2d, _ms_nn.BatchNorm1d,
                                  _ms_nn.SyncBatchNorm, _ms_nn.LayerNorm,
                                  _ms_nn.GroupNorm)):
                cell.to_float(ms.float32)
        print('Model cast to fp16 (BN/LayerNorm kept fp32).')

    def infer(self, frame_bgr):
        """单帧推理，返回 (labels_np, boxes_np, scores_np)"""
        ms = self.ms
        Tensor = self.Tensor
        h, w = frame_bgr.shape[:2]
        im_np     = preprocess_numpy(frame_bgr, size=(640, 640))
        im_data   = Tensor(im_np, ms.float32)
        orig_size = Tensor(np.array([[w, h]], dtype=np.float32), ms.float32)
        labels, boxes, scores = self.model(im_data, orig_size)
        return (labels[0].asnumpy().astype(np.int32),
                boxes[0].asnumpy().astype(np.float32),
                scores[0].asnumpy().astype(np.float32))


# =======================================================================
# 多进程视频处理函数
# =======================================================================
def video_stream_worker(stream_id, args, output_queue, stop_event):
    """单个视频流处理进程"""
    try:
        global CLASS_NAMES, DEFECT_CLASS_IDS

        # 按 stream_id 选择对应的配置和权重
        # 流1: --config / --resume
        # 流2: --config-2 / --resume-2（未指定时回退到流1的配置）
        if stream_id == 2:
            cfg_path  = getattr(args, 'config_2',  None) or args.config
            ckpt_path = getattr(args, 'resume_2',  None) or args.resume
            num_cls_override = getattr(args, 'num_classes_2', None)
        else:
            cfg_path  = args.config
            ckpt_path = args.resume
            num_cls_override = None

        # 解析当前流的类别数
        _num_cls = num_cls_override or args.num_classes
        if _num_cls is None:
            try:
                from src.core import YAMLConfig as _YC
                _cfg_tmp = _YC(cfg_path)
                _num_cls = int(getattr(_cfg_tmp, 'num_classes',
                               getattr(_cfg_tmp.postprocessor, 'num_classes', 8)))
            except Exception:
                _num_cls = 8
        stream_class_names, stream_defect_ids = resolve_class_names(_num_cls)
        print(f'[流{stream_id}] cfg={cfg_path}  ckpt={ckpt_path}  num_classes={_num_cls}')

        # 初始化后端
        backend_name = args.backend.lower()
        if backend_name == 'onnx':
            if not args.onnx_file:
                raise ValueError('ONNX 后端需要指定 --onnx-file')
            backend = ONNXBackend(args.onnx_file)
        elif backend_name == 'mindspore':
            if not ckpt_path:
                raise ValueError('MindSpore 后端需要指定 -r / --resume')
            backend = MindSporeBackend(cfg_path, ckpt_path, device=args.device)
        else:
            raise ValueError(f'Unknown backend: {args.backend}')
        
        # 打开视频源
        if stream_id == 1:
            if args.source == 'camera':
                cap = cv2.VideoCapture(args.camera_id)
            else:
                cap = cv2.VideoCapture(args.video_path)
        else:  # stream_id == 2
            if args.source == 'camera':
                cap = cv2.VideoCapture(args.camera_id_2 if hasattr(args, 'camera_id_2') else 1)
            else:
                cap = cv2.VideoCapture(args.video_path_2 if hasattr(args, 'video_path_2') else args.video_path)
        
        if not cap.isOpened():
            output_queue.put({
                'stream_id': stream_id,
                'error': f'无法打开视频源'
            })
            return
        
        fps_src = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_idx = 0
        defect_count = 0
        
        while not stop_event.is_set():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_idx += 1
            frame_timestamp = frame_idx / fps_src
            
            # 推理
            labels_np, boxes_np, scores_np = backend.infer(frame)
            
            # 过滤
            mask = scores_np > args.threshold
            labels_valid = labels_np[mask].tolist()
            boxes_valid = boxes_np[mask].tolist()
            scores_valid = scores_np[mask].tolist()
            
            has_defect = any(int(l) in stream_defect_ids for l in labels_valid)
            
            detections = []
            for lbl, box, scr in zip(labels_valid, boxes_valid, scores_valid):
                lbl_int = int(lbl)
                detections.append({
                    'class_id': lbl_int,
                    'class_name': stream_class_names[lbl_int] if lbl_int < len(stream_class_names) else f'cls{lbl_int}',
                    'score': round(float(scr), 4),
                    'bbox_xyxy': [round(float(v), 2) for v in box],
                    'is_defect': lbl_int in stream_defect_ids,
                })
            
            if has_defect:
                defect_count += 1
                
                # 发送结果到主进程
                output_queue.put({
                    'stream_id': stream_id,
                    'frame': frame_idx,
                    'timestamp': frame_timestamp,
                    'detections': detections,
                    'frame_data': frame,
                    'has_defect': True
                })
        
        cap.release()
        output_queue.put({
            'stream_id': stream_id,
            'done': True,
            'total_frames': frame_idx,
            'defect_count': defect_count
        })
    
    except Exception as e:
        output_queue.put({
            'stream_id': stream_id,
            'error': str(e)
        })


def run_detection_multiprocess(args):
    """多进程模式：同时处理两个视频文件"""
    global CLASS_NAMES, DEFECT_CLASS_IDS
    
    # 自动解析类别数
    num_cls = args.num_classes
    if num_cls is None:
        try:
            from src.core import YAMLConfig
            cfg_tmp = YAMLConfig(args.config)
            num_cls = int(getattr(cfg_tmp, 'num_classes',
                          getattr(cfg_tmp.postprocessor, 'num_classes', 8)))
        except Exception:
            num_cls = 8
    CLASS_NAMES, DEFECT_CLASS_IDS = resolve_class_names(num_cls)
    print(f'num_classes={num_cls}, names={CLASS_NAMES}')
    
    # 创建共享目录
    os.makedirs(args.shared_dir, exist_ok=True)
    
    # 创建队列和事件
    output_queue = Queue()
    stop_event = Event()
    
    print(f'\n启动两个处理进程...')
    print(f'视频1: {args.video_path}')
    print(f'视频2: {args.video_path_2}')
    print(f'共享目录: {args.shared_dir}')
    print(f'设备: {args.device}')
    print(f'阈值: {args.threshold}\n')
    
    # 启动两个进程
    p1 = Process(target=video_stream_worker, args=(1, args, output_queue, stop_event))
    p2 = Process(target=video_stream_worker, args=(2, args, output_queue, stop_event))
    
    p1.start()
    p2.start()
    
    # 收集结果
    stream_states = {1: {'has_defect': False, 'frame': 0, 'timestamp': 0}, 
                     2: {'has_defect': False, 'frame': 0, 'timestamp': 0}}
    concurrent_defects = []
    frame_count = 0
    
    try:
        while p1.is_alive() or p2.is_alive():
            try:
                result = output_queue.get(timeout=1)
                
                if 'error' in result:
                    print(f"[流 {result['stream_id']}] 错误: {result['error']}")
                    continue
                
                if 'done' in result:
                    print(f"[流 {result['stream_id']}] 处理完成 - 总帧数: {result['total_frames']}, 缺陷帧: {result['defect_count']}")
                    continue
                
                stream_id = result['stream_id']
                frame_num = result['frame']
                timestamp = result['timestamp']
                detections = result['detections']
                frame_data = result.get('frame_data')
                
                stream_states[stream_id]['has_defect'] = True
                stream_states[stream_id]['frame'] = frame_num
                stream_states[stream_id]['timestamp'] = timestamp
                stream_states[stream_id]['detections'] = detections
                stream_states[stream_id]['frame_data'] = frame_data
                
                # 检查两个流是否同时有缺陷
                if stream_states[1]['has_defect'] and stream_states[2]['has_defect']:
                    time1 = stream_states[1]['timestamp']
                    time2 = stream_states[2]['timestamp']
                    
                    # 时间差在 0.5 秒内认为是同时
                    if abs(time1 - time2) < args.time_window:
                        frame_count += 1
                        
                        # 创建时间戳文件夹
                        timestamp_str = f'{time1:.3f}'.replace('.', '_')
                        event_dir = os.path.join(args.shared_dir, f'timestamp_{timestamp_str}')
                        os.makedirs(event_dir, exist_ok=True)
                        
                        # 保存流1的原始帧和检测结果
                        if stream_states[1].get('frame_data') is not None:
                            frame1_path = os.path.join(event_dir, f'stream1_frame_{stream_states[1]["frame"]}.jpg')
                            cv2.imwrite(frame1_path, stream_states[1]['frame_data'])
                            
                            detection_data1 = {
                                'stream_id': 1,
                                'frame': stream_states[1]['frame'],
                                'video_time': round(time1, 4),
                                'detection_timestamp': datetime.datetime.now().isoformat(),
                                'detections': stream_states[1]['detections'],
                            }
                            json_path1 = os.path.join(event_dir, 'stream1_detections.json')
                            with open(json_path1, 'w', encoding='utf-8') as f:
                                json.dump(detection_data1, f, ensure_ascii=False, indent=2)
                        
                        # 保存流2的原始帧和检测结果
                        if stream_states[2].get('frame_data') is not None:
                            frame2_path = os.path.join(event_dir, f'stream2_frame_{stream_states[2]["frame"]}.jpg')
                            cv2.imwrite(frame2_path, stream_states[2]['frame_data'])
                            
                            detection_data2 = {
                                'stream_id': 2,
                                'frame': stream_states[2]['frame'],
                                'video_time': round(time2, 4),
                                'detection_timestamp': datetime.datetime.now().isoformat(),
                                'detections': stream_states[2]['detections'],
                            }
                            json_path2 = os.path.join(event_dir, 'stream2_detections.json')
                            with open(json_path2, 'w', encoding='utf-8') as f:
                                json.dump(detection_data2, f, ensure_ascii=False, indent=2)
                        
                        print(f'\n[同时缺陷检测 #{frame_count}]')
                        print(f'  流1 - 帧: {stream_states[1]["frame"]}, 时间: {time1:.2f}s, 缺陷数: {len(stream_states[1]["detections"])}')
                        print(f'  流2 - 帧: {stream_states[2]["frame"]}, 时间: {time2:.2f}s, 缺陷数: {len(stream_states[2]["detections"])}')
                        print(f'  保存到: {event_dir}')
                        
                        # 重置状态
                        stream_states[1]['has_defect'] = False
                        stream_states[2]['has_defect'] = False
            
            except queue.Empty:
                continue
    
    except KeyboardInterrupt:
        print('\n\n停止处理...')
    
    finally:
        stop_event.set()
        p1.join(timeout=5)
        p2.join(timeout=5)
        
        if p1.is_alive():
            p1.terminate()
        if p2.is_alive():
            p2.terminate()
    
    print(f'\n======== 多进程检测完成 ========')
    print(f'同时缺陷事件数: {frame_count}')
    print(f'结果保存到: {args.shared_dir}')
    print(f'====================================')


# =======================================================================
# 双缓冲帧同步检测模式
# 原理：两路视频流各用一个线程持续向共享缓冲区写入最新帧（只保留最新1帧），
#       推理线程每次同时从缓冲区取两路最新帧进行推理，天然实现时间对齐，
#       同时避免队列积压、缓解输入压力。
# =======================================================================
import threading

class LatestFrameBuffer:
    """
    单帧双通道缓冲区。
    两路视频流线程各自调用 put(channel, frame) 写入最新帧；
    推理线程调用 get_pair() 同时获取两路最新帧（若任一路尚无帧则返回 None）。
    内部使用 RLock 保证线程安全，写入操作直接覆盖旧帧，永远只保存最新一帧。
    """
    def __init__(self):
        self._lock = threading.RLock()
        self._frames = {1: None, 2: None}   # channel -> (frame_idx, timestamp, frame_bgr)

    def put(self, channel: int, frame_idx: int, timestamp: float, frame_bgr):
        """视频流线程调用：写入最新帧，直接覆盖旧帧"""
        with self._lock:
            self._frames[channel] = (frame_idx, timestamp, frame_bgr.copy())

    def get_pair(self):
        """
        推理线程调用：同时取出两路最新帧。
        返回 ((idx1, ts1, frame1), (idx2, ts2, frame2)) 或 None（任一路尚无帧）。
        注意：此操作不清除缓冲区，推理线程可反复调用；
              重复取到相同帧时由调用方通过 frame_idx 去重。
        """
        with self._lock:
            f1 = self._frames[1]
            f2 = self._frames[2]
        if f1 is None or f2 is None:
            return None
        return f1, f2


def _stream_reader(channel: int, video_path: str,
                   buffer: LatestFrameBuffer, stop_event: threading.Event,
                   fps_ref: list):
    """
    视频流读取线程：以原始帧率持续读取视频帧，
    每读到一帧就写入 LatestFrameBuffer（直接覆盖）。
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f'[Buffer][流{channel}] 无法打开视频: {video_path}')
        stop_event.set()
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    fps_ref[0] = fps          # 回传 fps 供主线程使用
    frame_idx = 0
    interval = 1.0 / fps      # 模拟真实帧率节奏（离线视频场景）

    print(f'[Buffer][流{channel}] 已打开: {video_path}  FPS={fps:.1f}')

    while not stop_event.is_set():
        t_read = time.time()
        ret, frame = cap.read()
        if not ret:
            print(f'[Buffer][流{channel}] 视频读取完毕')
            break
        frame_idx += 1
        timestamp = frame_idx / fps
        buffer.put(channel, frame_idx, timestamp, frame)

        # 控制读取节奏，避免瞬间把视频全部读完撑满内存
        elapsed = time.time() - t_read
        sleep_t = interval - elapsed
        if sleep_t > 0:
            time.sleep(sleep_t)

    cap.release()
    # 通知主线程该路流已结束
    stop_event.set()


def run_detection_dualbuffer(args):
    """
    双缓冲帧同步检测模式主函数。
    - 两个读取线程分别将两路视频的最新帧写入 LatestFrameBuffer
    - 主线程（推理线程）循环调用 get_pair() 同时取两路帧推理
    - 通过记录上次推理的 frame_idx 避免重复推理同一帧对
    """
    global CLASS_NAMES, DEFECT_CLASS_IDS

    # ---- 解析类别 ----
    num_cls = args.num_classes
    if num_cls is None:
        try:
            from src.core import YAMLConfig
            cfg_tmp = YAMLConfig(args.config)
            num_cls = int(getattr(cfg_tmp, 'num_classes',
                          getattr(cfg_tmp.postprocessor, 'num_classes', 8)))
        except Exception:
            num_cls = 8
    CLASS_NAMES, DEFECT_CLASS_IDS = resolve_class_names(num_cls)
    print(f'[DualBuffer] num_classes={num_cls}, names={CLASS_NAMES}')

    # ---- 初始化推理后端（在主进程/线程中加载，避免多进程权重重复加载） ----
    backend_name = args.backend.lower()
    if backend_name == 'onnx':
        if not args.onnx_file:
            raise ValueError('ONNX 后端需要指定 --onnx-file')
        backend1 = ONNXBackend(args.onnx_file)
        # 双路可共享同一 ONNX session（onnxruntime 线程安全）
        backend2 = backend1
    elif backend_name == 'mindspore':
        if not args.resume:
            raise ValueError('MindSpore 后端需要指定 -r / --resume')
        backend1 = MindSporeBackend(args.config, args.resume, device=args.device)
        # 第二路若有独立配置则单独加载，否则复用
        cfg2  = getattr(args, 'config_2',  None) or args.config
        ckpt2 = getattr(args, 'resume_2',  None) or args.resume
        if cfg2 == args.config and ckpt2 == args.resume:
            backend2 = backend1   # 同一模型，直接复用（MindSpore Cell 无状态推理安全）
        else:
            backend2 = MindSporeBackend(cfg2, ckpt2, device=args.device)
    else:
        raise ValueError(f'Unknown backend: {args.backend}')

    # ---- 输出目录 ----
    out_dir   = args.output_dir
    os.makedirs(out_dir, exist_ok=True)
    ts_str    = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    json_path = os.path.join(out_dir, f'dualbuffer_results_{ts_str}.json')

    print('=' * 70)
    print('双缓冲帧同步模式')
    print(f'  视频1 (可见光): {args.video_path}')
    print(f'  视频2 (红外):   {getattr(args, "video_path_2", "未指定")}')
    print(f'  输出目录:       {out_dir}')
    print(f'  阈值:           {args.threshold}')
    print('=' * 70)

    # ---- 构建共享缓冲区 ----
    buffer     = LatestFrameBuffer()
    stop_event = threading.Event()
    fps_ref1   = [25.0]   # 用列表传引用
    fps_ref2   = [25.0]

    video_path_2 = getattr(args, 'video_path_2', None) or args.video_path

    t1 = threading.Thread(
        target=_stream_reader,
        args=(1, args.video_path, buffer, stop_event, fps_ref1),
        daemon=True, name='StreamReader-1'
    )
    t2 = threading.Thread(
        target=_stream_reader,
        args=(2, video_path_2, buffer, stop_event, fps_ref2),
        daemon=True, name='StreamReader-2'
    )

    t1.start()
    t2.start()

    # 等待两路流各自至少写入一帧后再开始推理
    print('[DualBuffer] 等待两路流就绪...')
    while not stop_event.is_set():
        if buffer.get_pair() is not None:
            break
        time.sleep(0.02)
    print('[DualBuffer] 缓冲区就绪，开始推理\n')

    # ---- 推理主循环 ----
    all_results   = []
    infer_idx     = 0
    defect_count  = 0
    last_pair_ids = (-1, -1)   # 记录上次推理的 (idx1, idx2)，用于去重

    try:
        while not stop_event.is_set():
            pair = buffer.get_pair()
            if pair is None:
                time.sleep(0.005)
                continue

            (idx1, ts1, frame1), (idx2, ts2, frame2) = pair

            # 去重：若两路帧号与上次完全相同，说明缓冲区尚未更新，跳过
            if (idx1, idx2) == last_pair_ids:
                time.sleep(0.005)
                continue
            last_pair_ids = (idx1, idx2)

            infer_idx += 1
            t0 = time.time()

            # 对两路帧分别推理
            labels1, boxes1, scores1 = backend1.infer(frame1)
            labels2, boxes2, scores2 = backend2.infer(frame2)

            infer_fps = 1.0 / max(time.time() - t0, 1e-6)

            # ---- 过滤 & 整理检测结果 ----
            def _filter(labels_np, boxes_np, scores_np):
                mask = scores_np > args.threshold
                dets = []
                for lbl, box, scr in zip(labels_np[mask], boxes_np[mask], scores_np[mask]):
                    lbl_int = int(lbl)
                    dets.append({
                        'class_id':   lbl_int,
                        'class_name': CLASS_NAMES[lbl_int] if lbl_int < len(CLASS_NAMES) else f'cls{lbl_int}',
                        'score':      round(float(scr), 4),
                        'bbox_xyxy':  [round(float(v), 2) for v in box],
                        'is_defect':  lbl_int in DEFECT_CLASS_IDS,
                    })
                return dets

            dets1 = _filter(labels1, boxes1, scores1)
            dets2 = _filter(labels2, boxes2, scores2)

            has_defect1 = any(d['is_defect'] for d in dets1)
            has_defect2 = any(d['is_defect'] for d in dets2)
            has_defect  = has_defect1 or has_defect2

            frame_result = {
                'infer_index': infer_idx,
                'stream1': {'frame_idx': idx1, 'timestamp_sec': round(ts1, 4),
                            'has_defect': has_defect1, 'detections': dets1},
                'stream2': {'frame_idx': idx2, 'timestamp_sec': round(ts2, 4),
                            'has_defect': has_defect2, 'detections': dets2},
                'location': {
                    'latitude':  args.lat       if args.lat       is not None else None,
                    'longitude': args.lon       if args.lon       is not None else None,
                    'altitude':  args.altitude  if args.altitude  is not None else None,
                    'drone_id':  args.drone_id  if args.drone_id  is not None else None,
                },
            }

            if has_defect:
                defect_count += 1
                all_results.append(frame_result)

                # 使用 stream1 视频时间戳命名目录，与多进程模式保持一致
                # 格式：timestamp_X_XXX（小数点替换为下划线）
                timestamp_str = f'{ts1:.3f}'.replace('.', '_')
                ev_dir = os.path.join(out_dir, f'timestamp_{timestamp_str}')
                os.makedirs(ev_dir, exist_ok=True)

                # stream1：原始帧（命名与多进程模式一致）
                cv2.imwrite(os.path.join(ev_dir, f'stream1_frame_{idx1}.jpg'), frame1)

                # stream1：检测结果 JSON
                detection_data1 = {
                    'stream_id': 1,
                    'frame': idx1,
                    'video_time': round(ts1, 4),
                    'detection_timestamp': datetime.datetime.now().isoformat(),
                    'detections': dets1,
                }
                with open(os.path.join(ev_dir, 'stream1_detections.json'), 'w', encoding='utf-8') as jf:
                    json.dump(detection_data1, jf, ensure_ascii=False, indent=2)

                # stream2：原始帧
                cv2.imwrite(os.path.join(ev_dir, f'stream2_frame_{idx2}.jpg'), frame2)

                # stream2：检测结果 JSON
                detection_data2 = {
                    'stream_id': 2,
                    'frame': idx2,
                    'video_time': round(ts2, 4),
                    'detection_timestamp': datetime.datetime.now().isoformat(),
                    'detections': dets2,
                }
                with open(os.path.join(ev_dir, 'stream2_detections.json'), 'w', encoding='utf-8') as jf:
                    json.dump(detection_data2, jf, ensure_ascii=False, indent=2)

                frame_result['saved_dir'] = ev_dir

                print(f'[推理#{infer_idx:5d}] '
                      f'S1帧{idx1}({ts1:.2f}s) S2帧{idx2}({ts2:.2f}s) '
                      f'缺陷[{"1" if has_defect1 else "-"}{"2" if has_defect2 else "-"}] '
                      f'fps={infer_fps:.1f} -> {ev_dir}')
            else:
                if infer_idx % 100 == 0:
                    print(f'[推理#{infer_idx:5d}] '
                          f'S1帧{idx1}({ts1:.2f}s) S2帧{idx2}({ts2:.2f}s) '
                          f'无缺陷  fps={infer_fps:.1f}')

            # 可选实时预览
            if not args.no_display:
                ann1 = draw_boxes_cv2(frame1, labels1, boxes1, scores1, args.threshold)
                ann2 = draw_boxes_cv2(frame2, labels2, boxes2, scores2, args.threshold)
                cv2.putText(ann1, f'Stream1 FPS:{infer_fps:.1f}',
                            (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.putText(ann2, f'Stream2 FPS:{infer_fps:.1f}',
                            (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.imshow('DualBuffer - Stream1 (Visible)', ann1)
                cv2.imshow('DualBuffer - Stream2 (IR)', ann2)
                key = cv2.waitKey(1) & 0xFF
                if key in (ord('q'), 27):
                    print('\n[DualBuffer] 用户中断')
                    break

    except KeyboardInterrupt:
        print('\n[DualBuffer] 用户中断')
    finally:
        stop_event.set()
        t1.join(timeout=3)
        t2.join(timeout=3)
        if not args.no_display:
            cv2.destroyAllWindows()

    # ---- 写汇总 JSON ----
    summary = {
        'mode':                  'dual_buffer',
        'video1':                args.video_path,
        'video2':                video_path_2,
        'backend':               backend_name,
        'threshold':             args.threshold,
        'total_infer_pairs':     infer_idx,
        'defect_pair_count':     defect_count,
        'class_names':           CLASS_NAMES,
        'defect_class_ids':      sorted(DEFECT_CLASS_IDS),
        'created_at':            datetime.datetime.now().isoformat(),
        'frames':                all_results,
    }
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f'\n======== 双缓冲检测完成 ========')
    print(f'推理帧对总数 : {infer_idx}')
    print(f'缺陷帧对数   : {defect_count}')
    print(f'JSON 结果    : {json_path}')
    print(f'缺陷截图目录 : {frames_dir}')
    print(f'=================================')


# =======================================================================
# 主检测循环
# =======================================================================
def run_detection(args):
    global CLASS_NAMES, DEFECT_CLASS_IDS

    # ---- 优先判断双缓冲模式 ----
    use_dualbuffer = getattr(args, 'dual_buffer', False)
    if use_dualbuffer:
        run_detection_dualbuffer(args)
        return

    # ---- 检查是否为多进程模式 ----
    use_multiprocess = (args.shared_dir is not None and
                        hasattr(args, 'video_path_2') and args.video_path_2 is not None)
    if use_multiprocess:
        print('=' * 70)
        print('多进程模式：处理两个视频文件')
        print('=' * 70)
        run_detection_multiprocess(args)
        return

    # ---- 原有的单进程模式 ----
    print('=' * 70)
    print('单进程模式：处理单个视频文件')
    print('=' * 70)
    backend_name = args.backend.lower()
    if backend_name == 'onnx':
        if not args.onnx_file:
            raise ValueError('ONNX 后端需要指定 --onnx-file')
        if not os.path.isfile(args.onnx_file):
            raise FileNotFoundError(
                f'ONNX 文件不存在: {args.onnx_file}\n'
                f'请先在支持 mindtorch 的机器上执行：\n'
                f'  python tools/export_onnx.py -c {args.config} '
                f'-r <ckpt> -o {args.onnx_file}'
            )
        backend = ONNXBackend(args.onnx_file)
    elif backend_name == 'mindspore':
        if not args.resume:
            raise ValueError('MindSpore 后端需要指定 -r / --resume')
        backend = MindSporeBackend(args.config, args.resume, device=args.device)
    else:
        raise ValueError(f'Unknown backend: {args.backend}')

    # ---- 自动解析类别数 ----
    num_cls = args.num_classes
    if num_cls is None:
        try:
            from src.core import YAMLConfig
            cfg_tmp = YAMLConfig(args.config)
            num_cls = int(getattr(cfg_tmp, 'num_classes',
                          getattr(cfg_tmp.postprocessor, 'num_classes', 8)))
        except Exception:
            num_cls = 8
    CLASS_NAMES, DEFECT_CLASS_IDS = resolve_class_names(num_cls)
    print(f'num_classes={num_cls}, names={CLASS_NAMES}')

    # ---- 输出目录 ----
    # 如果指定了 shared_dir 和 stream_id，使用多流模式（按时间戳保存）
    use_shared_mode = args.shared_dir is not None and args.stream_id is not None
    
    if use_shared_mode:
        # 多流模式：结果保存到共享目录，按时间戳组织
        os.makedirs(args.shared_dir, exist_ok=True)
        output_base = args.shared_dir
        print(f'Multi-stream mode: stream_id={args.stream_id}, shared_dir={args.shared_dir}')
    else:
        # 单流模式：结果保存到 output_dir
        os.makedirs(args.output_dir, exist_ok=True)
        frames_dir = os.path.join(args.output_dir, 'defect_frames')
        os.makedirs(frames_dir, exist_ok=True)
        output_base = args.output_dir
    
    ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    json_path = os.path.join(output_base, f'detection_results_{ts}.json')

    # ---- 打开视频源 ----
    if args.source == 'camera':
        cap = cv2.VideoCapture(args.camera_id)
        source_label = f'camera_{args.camera_id}'
        print(f'Opening camera id={args.camera_id}')
    else:
        if not args.video_path or not os.path.isfile(args.video_path):
            raise FileNotFoundError(f'视频文件不存在: {args.video_path}')
        cap = cv2.VideoCapture(args.video_path)
        source_label = os.path.basename(args.video_path)
        print(f'Opening video: {args.video_path}')

    if not cap.isOpened():
        raise RuntimeError('无法打开视频源，请检查路径或摄像头 ID')

    fps_src      = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f'Source FPS : {fps_src:.1f}  '
          f'Total frames: {total_frames if total_frames > 0 else "N/A (live)"}')
    print(f'Output dir : {args.output_dir}')
    print(f'JSON path  : {json_path}')
    print(f'Threshold  : {args.threshold}')
    print(f'Skip frames: {args.skip_frames}')
    print(f'Backend    : {backend_name}')
    print(f'Show window: {not args.no_display}\n')
    print('Press  q  or  ESC  to quit.\n')

    # ---- 可选：输出视频 ----
    video_writer = None
    if args.save_video:
        vout_path = os.path.join(args.output_dir, f'output_{ts}.mp4')
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        fw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        fh = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        video_writer = cv2.VideoWriter(vout_path, fourcc, fps_src, (fw, fh))
        print(f'Video output: {vout_path}')

    # ---- 主循环 ----
    all_results  = []
    frame_idx    = 0
    infer_idx    = 0
    defect_count = 0
    fps_display  = 0.0
    t_start      = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            print('\nVideo ended or camera disconnected.')
            break

        frame_idx += 1
        if (frame_idx - 1) % (args.skip_frames + 1) != 0:
            continue

        infer_idx += 1
        t0 = time.time()
        labels_np, boxes_np, scores_np = backend.infer(frame)
        fps_display = 1.0 / max(time.time() - t0, 1e-6)

        # 过滤
        mask         = scores_np > args.threshold
        labels_valid = labels_np[mask].tolist()
        boxes_valid  = boxes_np[mask].tolist()
        scores_valid = scores_np[mask].tolist()

        has_defect      = any(int(l) in DEFECT_CLASS_IDS for l in labels_valid)
        frame_timestamp = frame_idx / fps_src

        detections = []
        for lbl, box, scr in zip(labels_valid, boxes_valid, scores_valid):
            lbl_int = int(lbl)
            detections.append({
                'class_id':   lbl_int,
                'class_name': CLASS_NAMES[lbl_int] if lbl_int < len(CLASS_NAMES) else f'cls{lbl_int}',
                'score':      round(float(scr), 4),
                'bbox_xyxy':  [round(float(v), 2) for v in box],
                'is_defect':  lbl_int in DEFECT_CLASS_IDS,
            })

        frame_result = {
            'frame_index':     frame_idx,
            'infer_index':     infer_idx,
            'timestamp_sec':   round(frame_timestamp, 4),
            'has_defect':      has_defect,
            'detection_count': len(detections),
            'detections':      detections,
            'location': {
                'latitude':  args.lat       if args.lat       is not None else None,
                'longitude': args.lon       if args.lon       is not None else None,
                'altitude':  args.altitude  if args.altitude  is not None else None,
                'drone_id':  args.drone_id  if args.drone_id  is not None else None,
            },
        }
        if detections:
            all_results.append(frame_result)

        # 有缺陷 -> 保存原图 + 标注图 + 该帧独立 JSON 到同一子文件夹
        if has_defect:
            defect_count += 1
            
            if use_shared_mode:
                # 多流模式：按时间戳保存到共享目录
                timestamp_str = f'{frame_timestamp:.3f}'.replace('.', '_')
                event_dir = os.path.join(args.shared_dir, f'timestamp_{timestamp_str}')
                os.makedirs(event_dir, exist_ok=True)
                
                # 保存原始帧
                raw_name = f'stream{args.stream_id}_frame_{frame_idx}.jpg'
                raw_path = os.path.join(event_dir, raw_name)
                cv2.imwrite(raw_path, frame)
                
                # 保存检测结果 JSON
                detection_data = {
                    'stream_id': args.stream_id,
                    'frame': frame_idx,
                    'video_time': round(frame_timestamp, 4),
                    'detection_timestamp': datetime.datetime.now().isoformat(),
                    'detections': detections,
                }
                json_name = f'stream{args.stream_id}_detections.json'
                json_file = os.path.join(event_dir, json_name)
                with open(json_file, 'w', encoding='utf-8') as jf:
                    json.dump(detection_data, jf, ensure_ascii=False, indent=2)
                
                print(f'[Frame {frame_idx:6d} | {frame_timestamp:7.2f}s] '
                      f'DEFECT x{len(detections)} -> {event_dir}')
            else:
                # 单流模式：原有逻辑
                base_name   = f'frame_{frame_idx:08d}_t{frame_timestamp:.2f}s'
                frame_dir   = os.path.join(frames_dir, base_name)
                os.makedirs(frame_dir, exist_ok=True)

                # 1) 原始图像
                raw_name    = 'raw.jpg'
                raw_path    = os.path.join(frame_dir, raw_name)
                cv2.imwrite(raw_path, frame)
                # 2) 带检测框的图像
                annotated   = draw_boxes_cv2(frame, labels_np, boxes_np, scores_np,
                                             threshold=args.threshold)
                vis_name    = 'vis.jpg'
                vis_path    = os.path.join(frame_dir, vis_name)
                cv2.imwrite(vis_path, annotated)
                # 3) 当前帧的 JSON
                frame_json_name = 'meta.json'
                frame_json_path = os.path.join(frame_dir, frame_json_name)
                # 记录路径到结果中
                frame_result['image_raw']   = raw_path
                frame_result['image_vis']   = vis_path
                frame_result['json_path']   = frame_json_path
                frame_result['screenshot']  = vis_path
                with open(frame_json_path, 'w', encoding='utf-8') as jf:
                    json.dump(frame_result, jf, ensure_ascii=False, indent=2)
                print(f'[Frame {frame_idx:6d} | {frame_timestamp:7.2f}s] '
                      f'DEFECT x{len(detections)} -> {vis_name}')

        # 写出视频帧
        if video_writer is not None:
            vis = draw_boxes_cv2(frame, labels_np, boxes_np, scores_np,
                                 threshold=args.threshold)
            cv2.putText(vis,
                        f'FPS:{fps_display:.1f} Frame:{frame_idx} Defects:{defect_count}',
                        (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            video_writer.write(vis)

        # 实时预览
        if not args.no_display:
            vis = draw_boxes_cv2(frame, labels_np, boxes_np, scores_np,
                                 threshold=args.threshold)
            cv2.putText(vis,
                        f'FPS:{fps_display:.1f} Frame:{frame_idx} Defects:{defect_count}',
                        (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.imshow('RT-DETR Detection', vis)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord('q'), 27):
                print('\nUser interrupted.')
                break

        if infer_idx % 50 == 0:
            elapsed  = time.time() - t_start
            avg_fps  = infer_idx / max(elapsed, 1e-6)
            print(f'[Progress] frame={frame_idx}  infer={infer_idx}  '
                  f'defects={defect_count}  avg_fps={avg_fps:.1f}')

    # ---- 收尾 ----
    cap.release()
    if video_writer is not None:
        video_writer.release()
    if not args.no_display:
        cv2.destroyAllWindows()

    # ---- 写 JSON ----
    summary = {
        'source':                source_label,
        'config':                args.config,
        'backend':               backend_name,
        'threshold':             args.threshold,
        'skip_frames':           args.skip_frames,
        'total_frames_read':     frame_idx,
        'total_frames_inferred': infer_idx,
        'defect_frame_count':    defect_count,
        'frames_with_detection': len(all_results),
        'class_names':           CLASS_NAMES,
        'defect_class_ids':      sorted(DEFECT_CLASS_IDS),
        'created_at':            datetime.datetime.now().isoformat(),
        'frames':                all_results,
    }
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f'\n======== Detection Complete ========')
    print(f'Total frames read    : {frame_idx}')
    print(f'Total frames inferred: {infer_idx}')
    print(f'Defect frames saved  : {defect_count}')
    print(f'JSON results         : {json_path}')
    print(f'Defect screenshots   : {frames_dir}')
    print(f'====================================')


# =======================================================================
# CLI
# =======================================================================
def parse_args():
    parser = argparse.ArgumentParser(
        description='RT-DETR 实时检测 - 支持视频文件和摄像头',
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument('-c', '--config',      type=str, required=True,
                        help='YML 配置文件路径')
    parser.add_argument('-r', '--resume',      type=str, default=None,
                        help='权重文件路径（MindSpore 后端必填）')
    parser.add_argument('--onnx-file',         type=str, default=None,
                        dest='onnx_file',
                        help='ONNX 模型路径（ONNX 后端必填）')
    parser.add_argument('--backend',           type=str, default='mindspore',
                        choices=['onnx', 'mindspore'],
                        help='推理后端：mindspore（推荐，支持 NPU）或 onnx')
    parser.add_argument('--source',            type=str, default='video',
                        choices=['video', 'camera'],
                        help='输入源：video 或 camera')
    parser.add_argument('--video-path',        type=str, default=None,
                        dest='video_path',
                        help='视频文件路径（source=video 时必填）')
    parser.add_argument('--camera-id',         type=int, default=0,
                        dest='camera_id',
                        help='摄像头设备 ID（source=camera 时使用）')
    parser.add_argument('-d', '--device',      type=str, default='cpu',
                        choices=['cpu', 'gpu', 'npu'],
                        help='设备（MindSpore 后端使用）')
    parser.add_argument('-t', '--threshold',   type=float, default=0.5,
                        help='置信度阈值，默认 0.5')
    parser.add_argument('--skip-frames',       type=int, default=0,
                        dest='skip_frames',
                        help='跳帧数，0=逐帧推理')
    parser.add_argument('--num-classes',       type=int, default=None,
                        dest='num_classes',
                        help='类别数（默认自动从 config 读取）')
    parser.add_argument('--output-dir',        type=str, default='detection_output',
                        dest='output_dir',
                        help='输出目录，默认 detection_output')
    parser.add_argument('--save-video',        action='store_true',
                        dest='save_video',
                        help='将检测结果写入输出视频')
    parser.add_argument('--no-display',        action='store_true',
                        dest='no_display',
                        help='禁用实时预览窗口（服务器/无 GUI 环境）')
    parser.add_argument('--stream-id',         type=int, default=None,
                        dest='stream_id',
                        help='流ID（1或2），用于多流模式下按时间戳组织结果')
    parser.add_argument('--shared-dir',        type=str, default=None,
                        dest='shared_dir',
                        help='共享结果目录（多流模式），结果按时间戳保存到此目录')
    parser.add_argument('--video-path-2',      type=str, default=None,
                        dest='video_path_2',
                        help='第二个视频文件路径（多进程模式）')
    parser.add_argument('--camera-id-2',       type=int, default=1,
                        dest='camera_id_2',
                        help='第二个摄像头设备 ID（多进程模式）')
    parser.add_argument('--config-2',          type=str, default=None,
                        dest='config_2',
                        help='第二个视频流的 YML 配置文件路径（不填则使用 -c 的配置）')
    parser.add_argument('--resume-2',          type=str, default=None,
                        dest='resume_2',
                        help='第二个视频流的权重文件路径（不填则使用 -r 的权重）')
    parser.add_argument('--num-classes-2',     type=int, default=None,
                        dest='num_classes_2',
                        help='第二个视频流的类别数（默认自动从 --config-2 读取）')
    parser.add_argument('-w', '--time-window', type=float, default=0.5,
                        dest='time_window',
                        help='同时检测时间窗口（秒），默认 0.5')
    parser.add_argument('--dual-buffer',   action='store_true',
                        dest='dual_buffer',
                        help=(
                            '启用双缓冲帧同步模式：两路视频流各用独立线程持续写入\n'
                            '共享缓冲区（每路只保留最新1帧），推理线程每次同时取\n'
                            '两路最新帧推理，实现低延迟时间对齐并缓解输入压力。\n'
                            '需同时指定 --video-path（可见光）和 --video-path-2（红外）。'
                        ))
    # ---- 位置信息参数（附加到输出 JSON） ----
    parser.add_argument('--lat',       type=float, default=None,
                        dest='lat',
                        help='无人机当前纬度（度），写入输出 JSON 的 location 字段')
    parser.add_argument('--lon',       type=float, default=None,
                        dest='lon',
                        help='无人机当前经度（度），写入输出 JSON 的 location 字段')
    parser.add_argument('--altitude',  type=float, default=None,
                        dest='altitude',
                        help='无人机当前飞行高度（米），写入输出 JSON 的 location 字段')
    parser.add_argument('--drone-id',  type=str, default=None,
                        dest='drone_id',
                        help='无人机 ID，写入输出 JSON，便于后端关联')
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_args()
    run_detection(args)
 