"""COCO mAP 评估脚本（MindSpore 原生版，支持 NPU）"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

import mindspore, mindspore.mint, mindspore.mint.nn, mindspore.nn as _msnn, contextlib
for _n, _c in {'Module':_msnn.Cell,'ModuleList':_msnn.CellList,'Sequential':_msnn.SequentialCell,
    'Embedding':_msnn.Embedding,'MultiheadAttention':_msnn.MultiheadAttention,'LayerNorm':_msnn.LayerNorm,
    'BatchNorm2d':_msnn.BatchNorm2d,'GroupNorm':_msnn.GroupNorm,'Dropout':_msnn.Dropout,
    'Identity':_msnn.Identity,'ReLU':_msnn.ReLU,'SiLU':_msnn.SiLU,'GELU':_msnn.GELU,
    'LeakyReLU':_msnn.LeakyReLU,'Hardsigmoid':_msnn.HSigmoid,'Conv2d':_msnn.Conv2d,
    'Linear':_msnn.Dense,'AvgPool2d':_msnn.AvgPool2d,'MaxPool2d':_msnn.MaxPool2d}.items():
    if not hasattr(mindspore.mint.nn, _n): setattr(mindspore.mint.nn, _n, _c)
if not hasattr(mindspore.mint, 'no_grad'): mindspore.mint.no_grad = contextlib.nullcontext

import json, argparse, numpy as np
from PIL import Image
from tqdm import tqdm
import mindspore as ms
from mindspore import Tensor
from src.core import YAMLConfig

def preprocess(im_pil, size=(640, 640)):
    im = im_pil.resize(size, Image.BILINEAR)
    im_np = np.array(im, dtype=np.float32) / 255.0
    im_np = im_np.transpose(2, 0, 1)[np.newaxis, ...]
    return Tensor(im_np, ms.float32)

def build_model(args):
    cfg = YAMLConfig(args.config)
    checkpoint = ms.load_checkpoint(args.resume)
    raw = {k: v.asnumpy() for k, v in checkpoint.items()}
    if any(k.startswith('ema.module.') for k in raw):
        state = {k[len('ema.module.'):]: v for k, v in raw.items() if k.startswith('ema.module.')}
        print('Using EMA weights')
    elif any(k.startswith('model.') for k in raw):
        state = {k[len('model.'):]: v for k, v in raw.items() if k.startswith('model.')}
        print('Using model weights')
    else:
        state = raw; print('Using direct weights')
    model_params = {p.name: p for p in cfg.model.get_parameters()}
    param_dict = {}
    loaded = 0
    for k, v in state.items():
        if v is None: continue
        arr = np.array(v, dtype=np.float32) if not isinstance(v, np.ndarray) else v.astype(np.float32)
        ms_param = ms.Parameter(ms.Tensor(arr), name=k)
        if k in model_params and model_params[k].shape == ms_param.shape:
            td = model_params[k].dtype
            if td != ms_param.dtype: ms_param = ms.Parameter(ms_param.data.astype(td), name=k)
            param_dict[k] = ms_param; loaded += 1
    ms.load_param_into_net(cfg.model, param_dict, strict_load=False)
    print(f'Weights: {loaded} matched')
    class Model(ms.nn.Cell):
        def __init__(self):
            super().__init__()
            self.model = cfg.model.deploy()
            self.postprocessor = cfg.postprocessor.deploy()
        def construct(self, images, orig_target_sizes):
            return self.postprocessor(self.model(images), orig_target_sizes)
    m = Model(); m.set_train(False); return m

def evaluate(args):
    if args.device.lower() == 'npu': ms.set_context(mode=ms.PYNATIVE_MODE, device_target='Ascend')
    elif args.device.lower() in ('gpu','cuda'): ms.set_context(mode=ms.PYNATIVE_MODE, device_target='GPU')
    else: ms.set_context(mode=ms.PYNATIVE_MODE, device_target='CPU')

    with open(args.ann_file) as f: coco_gt = json.load(f)
    id2info = {img['id']: img for img in coco_gt['images']}
    cat_ids = [c['id'] for c in coco_gt['categories']]
    print(f'Categories: {[c["name"] for c in coco_gt["categories"]]}')

    model = build_model(args)
    print('Model ready. Starting evaluation...')

    images = coco_gt['images']
    if args.max_images > 0: images = images[:args.max_images]
    print(f'Evaluating {len(images)} images')

    coco_results, img_ids_done = [], []
    for img_info in tqdm(images, desc='Inference'):
        img_id = img_info['id']
        img_file = os.path.join(args.img_dir, img_info['file_name'])
        if not os.path.exists(img_file): continue
        try:
            im_pil = Image.open(img_file).convert('RGB')
            w, h = im_pil.size
            im_data = preprocess(im_pil)
            orig_size = Tensor(np.array([[w, h]], dtype=np.float32), ms.float32)
            labels, boxes, scores = model(im_data, orig_size)
            labels_np = labels[0].asnumpy().astype(int)
            boxes_np  = boxes[0].asnumpy()
            scores_np = scores[0].asnumpy()
            valid = scores_np > args.score_threshold
            labels_np, boxes_np, scores_np = labels_np[valid], boxes_np[valid], scores_np[valid]
            img_ids_done.append(img_id)
            for label, box, score in zip(labels_np, boxes_np, scores_np):
                x1, y1, x2, y2 = float(box[0]), float(box[1]), float(box[2]), float(box[3])
                cat_id = cat_ids[int(label)] if int(label) < len(cat_ids) else int(label)+1
                coco_results.append({'image_id': img_id, 'category_id': cat_id,
                    'bbox': [round(x1,2), round(y1,2), round(x2-x1,2), round(y2-y1,2)],
                    'score': round(float(score), 4)})
        except Exception as e:
            print(f'  [WARN] {img_file}: {e}')

    print(f'Total detections: {len(coco_results)} on {len(img_ids_done)} images')
    result_file = args.result_file or 'coco_results.json'
    with open(result_file, 'w') as f: json.dump(coco_results, f)
    print(f'Results saved: {result_file}')

    try:
        from pycocotools.coco import COCO
        from pycocotools.cocoeval import COCOeval
        coco_gt_api = COCO(args.ann_file)
        coco_dt_api = coco_gt_api.loadRes(result_file)
        ev = COCOeval(coco_gt_api, coco_dt_api, 'bbox')
        if img_ids_done: ev.params.imgIds = img_ids_done
        ev.evaluate(); ev.accumulate(); ev.summarize()
        s = ev.stats
        print(f'\n===== COCO AP =====')
        print(f'AP@0.50:0.95 = {s[0]:.4f}')
        print(f'AP@0.50      = {s[1]:.4f}')
        print(f'AP@0.75      = {s[2]:.4f}')
        print(f'===================')
    except ImportError:
        print('Install pycocotools: pip install pycocotools')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-c', '--config',          required=True)
    parser.add_argument('-r', '--resume',          required=True)
    parser.add_argument('-a', '--ann-file',        required=True)
    parser.add_argument('-i', '--img-dir',         required=True)
    parser.add_argument('-d', '--device',          default='npu')
    parser.add_argument('-t', '--score-threshold', type=float, default=0.01)
    parser.add_argument('-n', '--max-images',      type=int,   default=0)
    parser.add_argument('-o', '--result-file',     default=None)
    args = parser.parse_args()
    evaluate(args)
