#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检测结果可视化脚本
读取 meta.json，在 RGB 图和红外图上绘制检测框
"""

import json
import cv2
import numpy as np
import sys
import os
from pathlib import Path

# 颜色配置（BGR格式）
COLORS = {
    'rgb': (0, 255, 0),      # 绿色 - RGB检测框
    'ir': (0, 0, 255),       # 红色 - 红外检测框
    'text_bg': (0, 0, 0),    # 黑色 - 文字背景
    'text': (255, 255, 255)  # 白色 - 文字
}

def draw_detections(image_path, detections, output_path, color=(0, 255, 0)):
    """
    在图像上绘制检测框
    
    Args:
        image_path: 输入图像路径
        detections: 检测结果列表
        output_path: 输出图像路径
        color: 检测框颜色 (B, G, R)
    """
    # 读取图像
    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ 无法读取图像: {image_path}")
        return False
    
    # 绘制每个检测框
    for det in detections:
        bbox = det['bbox']
        class_name = det['class_name']
        score = det['score']
        
        # 转换坐标为整数
        x1, y1, x2, y2 = map(int, bbox)
        
        # 绘制矩形框
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        
        # 准备标签文本
        label = f"{class_name}: {score:.2f}"
        
        # 计算文本大小
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        thickness = 1
        (text_width, text_height), baseline = cv2.getTextSize(
            label, font, font_scale, thickness
        )
        
        # 绘制文本背景
        cv2.rectangle(
            img,
            (x1, y1 - text_height - baseline - 5),
            (x1 + text_width, y1),
            COLORS['text_bg'],
            -1
        )
        
        # 绘制文本
        cv2.putText(
            img,
            label,
            (x1, y1 - baseline - 2),
            font,
            font_scale,
            COLORS['text'],
            thickness
        )
    
    # 保存图像
    cv2.imwrite(output_path, img)
    print(f"✅ 已保存检测框图像: {output_path}")
    return True

def process_detection_folder(folder_path):
    """
    处理单个检测文件夹
    
    Args:
        folder_path: 文件夹路径
    
    Returns:
        dict: 处理结果
    """
    folder_path = Path(folder_path)
    
    # 检查文件是否存在
    meta_file = folder_path / 'meta.json'
    rgb_file = folder_path / 'rgb.jpg'
    ir_file = folder_path / 'ir.jpg'
    
    if not meta_file.exists():
        print(f"❌ meta.json 不存在: {meta_file}")
        return None
    
    # 读取 JSON
    with open(meta_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    result = {
        'incident_id': data.get('incident_id'),
        'location': data.get('location'),
        'timestamp': data.get('timestamp_str'),
        'device_id': data.get('device_id'),
        'images': {}
    }
    
    # 处理 RGB 图像
    if rgb_file.exists() and 'rgb' in data:
        rgb_detections = data['rgb'].get('detections', [])
        rgb_output = folder_path / 'rgb_detected.jpg'
        
        if draw_detections(str(rgb_file), rgb_detections, str(rgb_output), COLORS['rgb']):
            result['images']['rgb_original'] = str(rgb_file)
            result['images']['rgb_detected'] = str(rgb_output)
            result['rgb_detections'] = rgb_detections
    
    # 处理红外图像
    if ir_file.exists() and 'ir' in data:
        ir_detections = data['ir'].get('detections', [])
        ir_output = folder_path / 'ir_detected.jpg'
        
        if draw_detections(str(ir_file), ir_detections, str(ir_output), COLORS['ir']):
            result['images']['ir_original'] = str(ir_file)
            result['images']['ir_detected'] = str(ir_output)
            result['ir_detections'] = ir_detections
    
    return result

def main():
    if len(sys.argv) < 2:
        print("用法: python draw_detections.py <文件夹路径>")
        sys.exit(1)
    
    folder_path = sys.argv[1]
    
    print(f"🔄 处理文件夹: {folder_path}")
    result = process_detection_folder(folder_path)
    
    if result:
        print(f"✅ 处理完成!")
        print(f"   事件ID: {result['incident_id']}")
        print(f"   位置: {result['location']}")
        
        # 输出结果为 JSON（供 Java 读取）
        print("\n=== JSON_RESULT_START ===")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("=== JSON_RESULT_END ===")
    else:
        print("❌ 处理失败")
        sys.exit(1)

if __name__ == '__main__':
    main()






