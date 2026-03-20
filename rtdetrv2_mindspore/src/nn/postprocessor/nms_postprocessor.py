"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
"""

import mindspore.mint as torch
from mindspore import Tensor
import mindspore.mint.nn.functional as F
# import mindspore.mint.distributed  # not available as dist
import mindspore.mint as torch
# torchvision not needed for inference  # [migrated: torchvision -> mint, ops.box_convert 已在各文件中内联替换]
from mindspore.mint import Tensor 

from ...core import register

from typing import Dict 


__all__ = ['DetNMSPostProcessor', ]


@register()
class DetNMSPostProcessor(torch.nn.Cell):
    def __init__(self, \
                iou_threshold=0.7, 
                score_threshold=0.01, 
                keep_topk=300, 
                box_fmt='cxcywh',
                logit_fmt='sigmoid') -> None:
        super().__init__()
        self.iou_threshold = iou_threshold
        self.score_threshold = score_threshold
        self.keep_topk = keep_topk
        self.box_fmt = box_fmt.lower()
        self.logit_fmt = logit_fmt.lower()
        self.logit_func = getattr(F, self.logit_fmt, None)
        self.deploy_mode = False 
    
    def construct(self, outputs: Dict[str, Tensor], orig_target_sizes: Tensor):
        logits, boxes = outputs['pred_logits'], outputs['pred_boxes']
        pred_boxes = _box_convert(boxes, in_fmt=self.box_fmt, out_fmt='xyxy')
        pred_boxes *= orig_target_sizes.repeat(1, 2).unsqueeze(1)

        values, pred_labels = torch.max(logits, dim=-1)
        
        if self.logit_func:
            pred_scores = self.logit_func(values)
        else:
            pred_scores = values

        # TODO for onnx export
        if self.deploy_mode:
            blobs = {
                'pred_labels': pred_labels, 
                'pred_boxes': pred_boxes,
                'pred_scores': pred_scores
            }
            return blobs

        results = []
        for i in range(logits.shape[0]):
            score_keep = pred_scores[i] > self.score_threshold
            pred_box = pred_boxes[i][score_keep]
            pred_label = pred_labels[i][score_keep]
            pred_score = pred_scores[i][score_keep]

            keep = torchvision.ops.batched_nms(pred_box, pred_score, pred_label, self.iou_threshold)            
            keep = keep[:self.keep_topk]

            blob = {
                'labels': pred_label[keep],
                'boxes': pred_box[keep],
                'scores': pred_score[keep],
            }

            results.append(blob)
            
        return results

    def deploy(self, ):
        self.set_train(False)
        self.deploy_mode = True
        return self 
