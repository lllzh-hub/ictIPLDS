#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将项目中所有 mindtorch 依赖替换为 mindspore.mint（MindSpore 2.4+ 官方 PyTorch 兼容层）。
mindspore.mint 原生支持 NPU，无需安装额外依赖。

用法:
    python tools/migrate_to_torch.py [--dry-run] [--root /path/to/project]

参数:
    --dry-run   只打印将被修改的文件，不实际写入
    --root      项目根目录，默认为脚本所在目录的上一级
"""

import re
import argparse
import shutil
from pathlib import Path

# -----------------------------------------------------------------------
# 替换规则：mindtorch -> mindspore.mint
# 按顺序应用，顺序很重要（长匹配优先）
# -----------------------------------------------------------------------
REPLACE_RULES = [
    # ---------- torchvision ----------
    (r'import mindtorch\.torchvision as torchvision',
     'import mindspore.mint as torchvision  # [migrated: torchvision -> mint, ops.box_convert 已在各文件中内联替换]'),
    (r'from mindtorch\.torchvision import (transforms as T)',
     r'from mindspore.dataset.transforms import c_transforms as T  # [migrated]'),
    (r'from mindtorch\.torchvision',  'from mindspore.mint'),
    (r'import mindtorch\.torchvision', 'import mindspore.mint'),

    # ---------- torch 子模块（具体，长匹配优先）----------
    (r'import mindtorch\.torch\.nn\.functional as F',
     'import mindspore.mint.nn.functional as F'),
    (r'import mindtorch\.torch\.nn\.init as init',
     'import mindspore.mint.nn.init as init'),
    (r'import mindtorch\.torch\.nn as nn',
     'import mindspore.mint.nn as nn'),
    (r'import mindtorch\.torch\.optim as optim',
     'import mindspore.mint.optim as optim'),
    (r'from mindtorch\.torch\.utils\.data import (DataLoader|Dataset)',
     r'from mindspore.dataset import GeneratorDataset  # [migrated: \1]'),
    (r'from mindtorch\.torch\.utils\.data import',
     'from mindspore.dataset import'),
    (r'from mindtorch\.torch\.optim\.lr_scheduler import',
     'from mindspore.mint.optim.lr_scheduler import'),
    (r'from mindtorch\.torch\.optim import',
     'from mindspore.mint.optim import'),
    (r'from mindtorch\.torch\.cuda\.amp\.grad_scaler import GradScaler',
     'from mindspore.amp import DynamicLossScaler as GradScaler'),
    (r'from mindtorch\.torch\.utils\.tensorboard import SummaryWriter',
     'from mindspore.train.summary import SummaryRecord as SummaryWriter  # [migrated]'),
    (r'from mindtorch\.torch import (.*)',
     r'from mindspore.mint import \1'),
    # import mindtorch.torch as torch -> import mindspore.mint as torch
    (r'import mindtorch\.torch as torch',
     'import mindspore.mint as torch'),

    # ---------- 兜底：剩余前缀 ----------
    (r'mindtorch\.torch\.', 'mindspore.mint.'),
    (r'mindtorch\.torch',   'mindspore.mint'),
    (r'mindtorch\.',        'mindspore.mint.'),

    # ---------- 彻底清理残余（注释掉防止报错）----------
    (r'^(from mindtorch.*)',   r'# [migrated-todo] \1'),
    (r'^(import mindtorch.*)', r'# [migrated-todo] \1'),
]

# 不处理这些目录
EXCLUDE_DIRS = {'__pycache__', '.git', '.venv', 'venv', 'env', 'node_modules'}

# 已经手动修复的文件，跳过自动处理
MANUALLY_FIXED = {
    'src/nn/postprocessor/box_revert.py',
    'src/zoo/rtdetr/rtdetr_postprocessor.py',
    'tools/test_image.py',
}


def collect_py_files(root: Path):
    for path in root.rglob('*.py'):
        if any(part in EXCLUDE_DIRS for part in path.parts):
            continue
        # 跳过已手动修复的文件
        try:
            rel = str(path.relative_to(root)).replace('\\', '/')
            if rel in MANUALLY_FIXED:
                continue
        except ValueError:
            pass
        yield path


def migrate_file(filepath: Path, dry_run: bool = False) -> bool:
    try:
        original = filepath.read_text(encoding='utf-8')
    except Exception as e:
        print(f'  [跳过] 无法读取 {filepath}: {e}')
        return False

    content = original
    for pattern, replacement in REPLACE_RULES:
        flags = re.MULTILINE if pattern.startswith('^') else 0
        content = re.sub(pattern, replacement, content, flags=flags)

    if content == original:
        return False

    if not dry_run:
        backup = filepath.with_suffix(filepath.suffix + '.mindtorch_bak')
        if not backup.exists():
            shutil.copy2(filepath, backup)
        filepath.write_text(content, encoding='utf-8')

    return True


def main():
    parser = argparse.ArgumentParser(description='将 mindtorch 迁移到 mindspore.mint（NPU 原生）')
    parser.add_argument('--dry-run', action='store_true',
                        help='只显示将被修改的文件，不实际写入')
    parser.add_argument('--root', type=str, default=None,
                        help='项目根目录（默认：脚本上一级目录）')
    args = parser.parse_args()

    root = Path(args.root).resolve() if args.root else Path(__file__).resolve().parent.parent

    print(f'项目根目录: {root}')
    print('[DRY-RUN 模式] 不会写入任何文件\n' if args.dry_run
          else '[实际写入模式] 原文件将备份为 .mindtorch_bak\n')
    print(f'已手动修复（跳过）: {sorted(MANUALLY_FIXED)}\n')

    changed_files = []
    for py_file in sorted(collect_py_files(root)):
        if migrate_file(py_file, dry_run=args.dry_run):
            rel = py_file.relative_to(root)
            changed_files.append(rel)
            print(f'  [修改] {rel}')

    print(f'\n完成。共修改 {len(changed_files)} 个文件。')

    if not args.dry_run and changed_files:
        print('\n[注意] 以下 API 需手动检查（grep "migrated-todo"）：')
        print('  - DataLoader: 改用 mindspore.dataset.GeneratorDataset')
        print('  - GradScaler: 改用 mindspore.amp.DynamicLossScaler')
        print('  - SummaryWriter: 改用 mindspore.train.summary.SummaryRecord')
        print('\n推理命令（NPU）：')
        print('  python tools/test_image.py -c <config> -r <weights> -f <image> -d npu -t 0.3 -o result.jpg')


if __name__ == '__main__':
    main()
