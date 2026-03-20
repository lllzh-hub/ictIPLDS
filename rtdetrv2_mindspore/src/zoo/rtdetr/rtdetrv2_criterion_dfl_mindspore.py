"""Copyright(c) 2023 lyuwenyu. All Rights Reserved.
RT-DETRv2 Criterion with DFL (Distribution Focal Loss) - MindSpore版本
"""

import copy
import mindspore
import mindspore.mint as torch
import src.nn_compat as nn
import mindspore.mint.nn.functional as F

from .box_ops import box_cxcywh_to_xyxy, box_iou, generalized_box_iou
from ...misc.dist_utils import get_world_size, is_dist_available_and_initialized
from ...core import register


class DistributionFocalLoss(nn.Cell):
    """Distribution Focal Loss for bounding box regression

    pred_dist shape: (N, 4*reg_max)
    Each coordinate is represented as a distribution over reg_max bins,
    where bins are uniformly spaced in [0, 1].
    """
    def __init__(self, reg_max=16, reduction='none'):
        super().__init__()
        self.reg_max = reg_max
        self.reduction = reduction

    def construct(self, pred_dist, target):
        """
        Args:
            pred_dist: (N, 4*reg_max) predicted distribution logits
            target: (N, 4) target box coordinates in [0, 1]

        Returns:
            loss: (N, 4) per-sample per-coord loss
        """
        N = pred_dist.shape[0]
        # Reshape: (N, 4*reg_max) -> (N, 4, reg_max)
        pred_dist = pred_dist.reshape(N, 4, self.reg_max)

        # Scale target from [0,1] to [0, reg_max-1] bin space
        target_scaled = (target * (self.reg_max - 1)).clamp(0, self.reg_max - 1)

        # Get left/right bin indices and their interpolation weights
        left = target_scaled.long()                                   # (N, 4)
        right = (left + 1).clamp(max=self.reg_max - 1)               # (N, 4)
        weight_right = target_scaled - left.float()                   # (N, 4)
        weight_left  = 1.0 - weight_right                            # (N, 4)

        # Build soft label via one_hot + weighted sum: (N, 4, reg_max)
        left_oh  = F.one_hot(left,  self.reg_max).float()            # (N, 4, reg_max)
        right_oh = F.one_hot(right, self.reg_max).float()            # (N, 4, reg_max)
        soft_label = left_oh * weight_left.unsqueeze(-1) + right_oh * weight_right.unsqueeze(-1)

        # Cross-entropy: -sum(soft_label * log_softmax(pred))
        log_probs = F.log_softmax(pred_dist, dim=-1)                  # (N, 4, reg_max)
        loss = -(soft_label * log_probs).sum(dim=-1)                  # (N, 4)

        if self.reduction == 'mean':
            return loss.mean()
        elif self.reduction == 'sum':
            return loss.sum()
        return loss  # (N, 4)


@register()
class RTDETRCriterionv2DFL(nn.Cell):
    """RT-DETRv2 Criterion with DFL Loss

    Replaces L1 loss with Distribution Focal Loss for better AP75 performance.
    """
    __share__ = ['num_classes']
    __inject__ = ['matcher']

    def __init__(self,
                 matcher,
                 weight_dict,
                 losses,
                 alpha=0.2,
                 gamma=2.0,
                 num_classes=80,
                 boxes_weight_format=None,
                 share_matched_indices=False,
                 reg_max=16):
        super().__init__()
        self.num_classes = num_classes
        self.matcher = matcher
        self.weight_dict = weight_dict
        self.losses = losses
        self.boxes_weight_format = boxes_weight_format
        self.share_matched_indices = share_matched_indices
        self.alpha = alpha
        self.gamma = gamma
        self.reg_max = reg_max

        self.dfl_loss = DistributionFocalLoss(reg_max=reg_max, reduction='none')

    @staticmethod
    def _sigmoid_focal_loss(inputs, targets, alpha, gamma):
        """纯 Python 实现 sigmoid focal loss"""
        p = torch.sigmoid(inputs)
        ce_loss = F.binary_cross_entropy_with_logits(inputs, targets, reduction='none')
        p_t = p * targets + (1 - p) * (1 - targets)
        loss = ce_loss * ((1 - p_t) ** gamma)
        if alpha >= 0:
            alpha_t = alpha * targets + (1 - alpha) * (1 - targets)
            loss = alpha_t * loss
        return loss

    def loss_labels_focal(self, outputs, targets, indices, num_boxes):
        assert 'pred_logits' in outputs
        src_logits = outputs['pred_logits']
        idx = self._get_src_permutation_idx(indices)
        target_classes_o = torch.cat([t["labels"][J] for t, (_, J) in zip(targets, indices)])
        target_classes = torch.full(src_logits.shape[:2], self.num_classes,
                                    dtype=mindspore.int64, device=src_logits.device)
        target_classes[idx] = target_classes_o
        target = F.one_hot(target_classes, num_classes=self.num_classes + 1)[..., :-1]
        loss = self._sigmoid_focal_loss(src_logits, target.to(src_logits.dtype), self.alpha, self.gamma)
        loss = loss.mean(1).sum() * src_logits.shape[1] / num_boxes
        return {'loss_focal': loss}

    def loss_boxes_dfl(self, outputs, targets, indices, num_boxes, boxes_weight=None):
        """Compute DFL loss + GIoU loss for bounding box regression."""
        assert 'pred_boxes' in outputs
        idx = self._get_src_permutation_idx(indices)

        src_boxes = outputs['pred_boxes'][idx]
        src_boxes = torch.cat([
            src_boxes[..., :2].clamp(0., 1.),
            src_boxes[..., 2:].clamp(min=1e-4, max=1.),
        ], dim=-1)
        target_boxes = torch.cat([t['boxes'][i] for t, (_, i) in zip(targets, indices)], dim=0)

        losses = {}

        # ---- DFL Loss ----
        has_dfl = (
            'pred_boxes_dfl' in outputs
            and outputs['pred_boxes_dfl'] is not None
            and outputs['pred_boxes_dfl'].shape[-1] == 4 * self.reg_max
        )
        if has_dfl:
            src_boxes_dfl = outputs['pred_boxes_dfl'][idx]            # (N, 4*reg_max)
            loss_dfl = self.dfl_loss(src_boxes_dfl, target_boxes)     # (N, 4)
            loss_dfl = loss_dfl.mean(-1)                              # (N,)
            if boxes_weight is not None:
                loss_dfl = loss_dfl * boxes_weight
            losses['loss_dfl'] = loss_dfl.sum() / num_boxes
        else:
            losses['loss_dfl'] = torch.zeros(1, device=src_boxes.device).squeeze()

        # ---- GIoU Loss ----
        loss_giou = 1 - torch.diag(generalized_box_iou(
            box_cxcywh_to_xyxy(src_boxes), box_cxcywh_to_xyxy(target_boxes)))
        if boxes_weight is not None:
            loss_giou = loss_giou * boxes_weight
        losses['loss_giou'] = loss_giou.sum() / num_boxes

        return losses

    def loss_boxes(self, outputs, targets, indices, num_boxes, boxes_weight=None):
        """Compute the losses related to the bounding boxes with DFL."""
        return self.loss_boxes_dfl(outputs, targets, indices, num_boxes, boxes_weight)

    def _get_src_permutation_idx(self, indices):
        batch_idx = torch.cat([torch.full_like(src, i) for i, (src, _) in enumerate(indices)])
        src_idx = torch.cat([src for (src, _) in indices])
        return batch_idx, src_idx

    def _get_tgt_permutation_idx(self, indices):
        batch_idx = torch.cat([torch.full_like(tgt, i) for i, (_, tgt) in enumerate(indices)])
        tgt_idx = torch.cat([tgt for (_, tgt) in indices])
        return batch_idx, tgt_idx

    def get_loss(self, loss, outputs, targets, indices, num_boxes, **kwargs):
        loss_map = {
            'boxes': self.loss_boxes,
            'focal': self.loss_labels_focal,
        }
        assert loss in loss_map, f'do you really want to compute {loss} loss?'
        return loss_map[loss](outputs, targets, indices, num_boxes, **kwargs)

    def get_loss_meta_info(self, loss, outputs, targets, indices):
        if self.boxes_weight_format is None:
            return {}

        src_boxes = outputs['pred_boxes'][self._get_src_permutation_idx(indices)]
        target_boxes = torch.cat([t['boxes'][j] for t, (_, j) in zip(targets, indices)], dim=0)

        if self.boxes_weight_format == 'iou':
            iou, _ = box_iou(
                box_cxcywh_to_xyxy(src_boxes),
                box_cxcywh_to_xyxy(target_boxes)
            )
            iou = torch.diag(iou)
        elif self.boxes_weight_format == 'giou':
            iou = torch.diag(generalized_box_iou(
                box_cxcywh_to_xyxy(src_boxes),
                box_cxcywh_to_xyxy(target_boxes)
            ))
        else:
            raise AttributeError()

        if loss in ('boxes',):
            meta = {'boxes_weight': iou}
        else:
            meta = {}
        return meta

    def construct(self, outputs, targets, **kwargs):
        """Loss computation."""
        outputs_without_aux = {k: v for k, v in outputs.items() if 'aux' not in k}

        # Compute the average number of target boxes across all nodes
        num_boxes = sum(len(t["labels"]) for t in targets)
        num_boxes = torch.as_tensor([num_boxes], dtype=torch.float, device=next(iter(outputs.values())).device)
        if is_dist_available_and_initialized():
            import mindspore.communication as dist
            dist.all_reduce(num_boxes)
        num_boxes = torch.clamp(num_boxes / get_world_size(), min=1).item()

        # Main matching
        matched = self.matcher(outputs_without_aux, targets)
        indices = matched['indices']

        losses = {}
        for loss in self.losses:
            meta   = self.get_loss_meta_info(loss, outputs, targets, indices)
            l_dict = self.get_loss(loss, outputs, targets, indices, num_boxes, **meta)
            l_dict = {k: l_dict[k] * self.weight_dict[k] for k in l_dict if k in self.weight_dict}
            losses.update(l_dict)

        # Auxiliary decoder losses
        if 'aux_outputs' in outputs:
            for i, aux_outputs in enumerate(outputs['aux_outputs']):
                if not self.share_matched_indices:
                    matched = self.matcher(aux_outputs, targets)
                    indices = matched['indices']
                for loss in self.losses:
                    meta   = self.get_loss_meta_info(loss, aux_outputs, targets, indices)
                    l_dict = self.get_loss(loss, aux_outputs, targets, indices, num_boxes, **meta)
                    l_dict = {k: l_dict[k] * self.weight_dict[k] for k in l_dict if k in self.weight_dict}
                    l_dict = {k + f'_aux_{i}': v for k, v in l_dict.items()}
                    losses.update(l_dict)

        # CDN auxiliary losses
        if 'dn_aux_outputs' in outputs:
            assert 'dn_meta' in outputs, ''
            indices = self.get_cdn_matched_indices(outputs['dn_meta'], targets)
            dn_num_boxes = num_boxes * outputs['dn_meta']['dn_num_group']
            for i, aux_outputs in enumerate(outputs['dn_aux_outputs']):
                for loss in self.losses:
                    meta   = self.get_loss_meta_info(loss, aux_outputs, targets, indices)
                    l_dict = self.get_loss(loss, aux_outputs, targets, indices, dn_num_boxes, **meta)
                    l_dict = {k: l_dict[k] * self.weight_dict[k] for k in l_dict if k in self.weight_dict}
                    l_dict = {k + f'_dn_{i}': v for k, v in l_dict.items()}
                    losses.update(l_dict)

        # Encoder auxiliary losses
        if 'enc_aux_outputs' in outputs:
            assert 'enc_meta' in outputs, ''
            class_agnostic = outputs['enc_meta']['class_agnostic']
            if class_agnostic:
                orig_num_classes = self.num_classes
                self.num_classes = 1
                enc_targets = copy.deepcopy(targets)
                for t in enc_targets:
                    t['labels'] = torch.zeros_like(t["labels"])
            else:
                enc_targets = targets

            for i, aux_outputs in enumerate(outputs['enc_aux_outputs']):
                matched = self.matcher(aux_outputs, targets)
                indices = matched['indices']
                for loss in self.losses:
                    meta   = self.get_loss_meta_info(loss, aux_outputs, enc_targets, indices)
                    l_dict = self.get_loss(loss, aux_outputs, enc_targets, indices, num_boxes, **meta)
                    l_dict = {k: l_dict[k] * self.weight_dict[k] for k in l_dict if k in self.weight_dict}
                    l_dict = {k + f'_enc_{i}': v for k, v in l_dict.items()}
                    losses.update(l_dict)

            if class_agnostic:
                self.num_classes = orig_num_classes

        return losses

    @staticmethod
    def get_cdn_matched_indices(dn_meta, targets):
        """get_cdn_matched_indices"""
        dn_positive_idx, dn_num_group = dn_meta["dn_positive_idx"], dn_meta["dn_num_group"]
        num_gts = [len(t['labels']) for t in targets]
        device = targets[0]['labels'].device

        dn_match_indices = []
        for i, num_gt in enumerate(num_gts):
            if num_gt > 0:
                gt_idx = torch.arange(num_gt, dtype=mindspore.int64, device=device)
                gt_idx = gt_idx.tile(dn_num_group)
                assert len(dn_positive_idx[i]) == len(gt_idx)
                dn_match_indices.append((dn_positive_idx[i], gt_idx))
            else:
                dn_match_indices.append((
                    torch.zeros(0, dtype=mindspore.int64, device=device),
                    torch.zeros(0, dtype=mindspore.int64, device=device),
                ))
        return dn_match_indices
