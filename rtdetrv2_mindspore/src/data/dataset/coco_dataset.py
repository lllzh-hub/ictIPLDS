import mindspore
"""
Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved
Mostly copy-paste from https://github.com/pytorch/vision/blob/13b35ff/references/detection/coco_utils.py

Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import mindspore.mint as torch
from mindspore import Tensor
try:  # pragma: no cover
from faster_coco_eval.utils.pytorch import FasterCocoDetection
    from faster_coco_eval.core import mask as coco_mask
    _FASTER_COCO_EVAL_AVAILABLE = True
except Exception:  # pragma: no cover
    FasterCocoDetection = None  # type: ignore
    coco_mask = None  # type: ignore
    _FASTER_COCO_EVAL_AVAILABLE = False
import mindspore.mint as torch
# torchvision not needed for inference  # [migrated: torchvision -> mint, ops.box_convert 已在各文件中内联替换]

from PIL import Image 
# 增加PIL图片大小限制，避免DecompressionBombError
Image.MAX_IMAGE_PIXELS = None  # 移除图片大小限制

from ._dataset import DetDataset
from .._misc import convert_to_tv_tensor
from ...core import register

__all__ = ['CocoDetection']

if hasattr(torchvision, "disable_beta_transforms_warning"):
torchvision.disable_beta_transforms_warning()

if _FASTER_COCO_EVAL_AVAILABLE:
@register()
class CocoDetection(FasterCocoDetection, DetDataset):
    __inject__ = ['transforms', ]
    __share__ = ['remap_mscoco_category']
    
    def __init__(self, img_folder, ann_file, transforms, return_masks=False, remap_mscoco_category=False):
        super(FasterCocoDetection, self).__init__(img_folder, ann_file)
        self._transforms = transforms
        self.prepare = ConvertCocoPolysToMask(return_masks)
        self.img_folder = img_folder
        self.ann_file = ann_file
        self.return_masks = return_masks
        self.remap_mscoco_category = remap_mscoco_category
else:
    @register()
    class CocoDetection(DetDataset):
        """Stub CocoDetection when `faster_coco_eval` is not installed."""
        __inject__ = ['transforms', ]
        __share__ = ['remap_mscoco_category']

        def __init__(self, *args, **kwargs):
            raise ModuleNotFoundError(
                "Missing optional dependency `faster_coco_eval`. "
                "Please `pip install faster_coco_eval` to use CocoDetection."
            )

    def __getitem__(self, idx):
        img, target = self.load_item(idx)
        if self._transforms is not None:
            img, target, _ = self._transforms(img, target, self)
        return img, target

    def load_item(self, idx):
        image, target = super(FasterCocoDetection, self).__getitem__(idx)
        image_id = self.ids[idx]
        target = {'image_id': image_id, 'annotations': target}

        if self.remap_mscoco_category:
            image, target = self.prepare(image, target, category2label=mscoco_category2label)
            # image, target = self.prepare(image, target, category2label=self.category2label)
        else:
            # 即使不使用MS COCO映射，也需要将类别ID映射到0-based索引
            image, target = self.prepare(image, target, category2label=self.category2label)

        target['idx'] = mindspore.Tensor([idx])

        if 'boxes' in target:
            target['boxes'] = convert_to_tv_tensor(target['boxes'], key='boxes', spatial_size=image.size[::-1])

        if 'masks' in target:
            target['masks'] = convert_to_tv_tensor(target['masks'], key='masks')
        
        return image, target

    def extra_repr(self) -> str:
        s = f' img_folder: {self.img_folder}\n ann_file: {self.ann_file}\n'
        s += f' return_masks: {self.return_masks}\n'
        if hasattr(self, '_transforms') and self._transforms is not None:
            s += f' transforms:\n   {repr(self._transforms)}'
        if hasattr(self, '_preset') and self._preset is not None:
            s += f' preset:\n   {repr(self._preset)}'
        return s 

    @property
    def categories(self, ):
        return self.coco.dataset['categories']

    @property
    def category2name(self, ):
        return {cat['id']: cat['name'] for cat in self.categories}

    @property
    def category2label(self, ):
        # 确保按类别ID排序，生成正确的0-based索引映射
        sorted_cats = sorted(self.categories, key=lambda x: x['id'])
        return {cat['id']: i for i, cat in enumerate(sorted_cats)}

    @property
    def label2category(self, ):
        return {i: cat['id'] for i, cat in enumerate(self.categories)}


def convert_coco_poly_to_mask(segmentations, height, width):
    if coco_mask is None:
        raise ModuleNotFoundError(
            "Missing optional dependency `faster_coco_eval`. "
            "Please `pip install faster_coco_eval` to use COCO mask utilities."
        )
    masks = []
    for polygons in segmentations:
        rles = coco_mask.frPyObjects(polygons, height, width)
        mask = coco_mask.decode(rles)
        if len(mask.shape) < 3:
            mask = mask[..., None]
        mask = torch.as_tensor(mask, dtype=mindspore.uint8)
        mask = mask.any(dim=2)
        masks.append(mask)
    if masks:
        masks = torch.stack(masks, dim=0)
    else:
        masks = torch.zeros((0, height, width), dtype=mindspore.uint8)
    return masks


class ConvertCocoPolysToMask(object):
    def __init__(self, return_masks=False):
        self.return_masks = return_masks

    def __call__(self, image: Image.Image, target, **kwargs):
        w, h = image.size

        image_id = target["image_id"]
        image_id = mindspore.Tensor([image_id])

        anno = target["annotations"]

        anno = [obj for obj in anno if 'iscrowd' not in obj or obj['iscrowd'] == 0]

        category2label = kwargs.get('category2label', None)
        # 如果提供了category2label，过滤掉不在映射中的标注
        if category2label is not None:
            valid_anno = []
            for obj in anno:
                cat_id = obj["category_id"]
                if cat_id in category2label:
                    valid_anno.append(obj)
                else:
                    # 如果类别ID不在映射中，打印警告并跳过
                    print(f"Warning: category_id {cat_id} not found in category2label mapping. Available IDs: {sorted(category2label.keys())}")
            anno = valid_anno

        boxes = [obj["bbox"] for obj in anno]
        # guard against no boxes via resizing
        boxes = torch.as_tensor(boxes, dtype=mindspore.float32).reshape(-1, 4)
        boxes[:, 2:] += boxes[:, :2]
        boxes[:, 0::2].clamp_(min=0, max=w)
        boxes[:, 1::2].clamp_(min=0, max=h)

        if category2label is not None:
            labels = [category2label[obj["category_id"]] for obj in anno]
        else:
            labels = [obj["category_id"] for obj in anno]
            
        labels = mindspore.Tensor(labels, dtype=mindspore.int64)

        if self.return_masks:
            segmentations = [obj["segmentation"] for obj in anno]
            masks = convert_coco_poly_to_mask(segmentations, h, w)

        keypoints = None
        if anno and "keypoints" in anno[0]:
            keypoints = [obj["keypoints"] for obj in anno]
            keypoints = torch.as_tensor(keypoints, dtype=mindspore.float32)
            num_keypoints = keypoints.shape[0]
            if num_keypoints:
                keypoints = keypoints.view(num_keypoints, -1, 3)

        keep = (boxes[:, 3] > boxes[:, 1]) & (boxes[:, 2] > boxes[:, 0])
        boxes = boxes[keep]
        labels = labels[keep]
        if self.return_masks:
            masks = masks[keep]
        if keypoints is not None:
            keypoints = keypoints[keep]

        target = {}
        target["boxes"] = boxes
        target["labels"] = labels
        if self.return_masks:
            target["masks"] = masks
        target["image_id"] = image_id
        if keypoints is not None:
            target["keypoints"] = keypoints

        # for conversion to coco api
        area = mindspore.Tensor([obj["area"] for obj in anno])
        iscrowd = mindspore.Tensor([obj["iscrowd"] if "iscrowd" in obj else 0 for obj in anno])
        target["area"] = area[keep]
        target["iscrowd"] = iscrowd[keep]

        target["orig_size"] = torch.as_tensor([int(w), int(h)])
        # target["size"] = torch.as_tensor([int(w), int(h)])
    
        return image, target


mscoco_category2name = {
    1: 'person',
    2: 'bicycle',
    3: 'car',
    4: 'motorcycle',
    5: 'airplane',
    6: 'bus',
    7: 'train',
    8: 'truck',
    9: 'boat',
    10: 'traffic light',
    11: 'fire hydrant',
    13: 'stop sign',
    14: 'parking meter',
    15: 'bench',
    16: 'bird',
    17: 'cat',
    18: 'dog',
    19: 'horse',
    20: 'sheep',
    21: 'cow',
    22: 'elephant',
    23: 'bear',
    24: 'zebra',
    25: 'giraffe',
    27: 'backpack',
    28: 'umbrella',
    31: 'handbag',
    32: 'tie',
    33: 'suitcase',
    34: 'frisbee',
    35: 'skis',
    36: 'snowboard',
    37: 'sports ball',
    38: 'kite',
    39: 'baseball bat',
    40: 'baseball glove',
    41: 'skateboard',
    42: 'surfboard',
    43: 'tennis racket',
    44: 'bottle',
    46: 'wine glass',
    47: 'cup',
    48: 'fork',
    49: 'knife',
    50: 'spoon',
    51: 'bowl',
    52: 'banana',
    53: 'apple',
    54: 'sandwich',
    55: 'orange',
    56: 'broccoli',
    57: 'carrot',
    58: 'hot dog',
    59: 'pizza',
    60: 'donut',
    61: 'cake',
    62: 'chair',
    63: 'couch',
    64: 'potted plant',
    65: 'bed',
    67: 'dining table',
    70: 'toilet',
    72: 'tv',
    73: 'laptop',
    74: 'mouse',
    75: 'remote',
    76: 'keyboard',
    77: 'cell phone',
    78: 'microwave',
    79: 'oven',
    80: 'toaster',
    81: 'sink',
    82: 'refrigerator',
    84: 'book',
    85: 'clock',
    86: 'vase',
    87: 'scissors',
    88: 'teddy bear',
    89: 'hair drier',
    90: 'toothbrush'
}

mscoco_category2label = {k: i for i, k in enumerate(mscoco_category2name.keys())}
mscoco_label2category = {v: k for k, v in mscoco_category2label.items()}
