# 远程文件夹导入功能使用指南

## 功能概述

从 MobaXterm 映射的远程服务器文件夹批量导入检测结果，包括：
- 红外热力图 (ir.jpg)
- 检测框图 (rgb.jpg，从RGB转换)
- 检测元数据 (meta.json)

## 文件夹结构

```
captured_subprocess/
├── 20260302_164849_f000000/
│   ├── meta.json          # 检测元数据
│   ├── ir.jpg             # 红外热力图
│   └── rgb.jpg            # 检测框图
├── 20260302_165117_f000001/
│   ├── meta.json
│   ├── ir.jpg
│   └── rgb.jpg
└── ...
```

## 配置步骤

### 1. 在 MobaXterm 中映射远程文件夹

#### 方法 A：使用驱动器映射（推荐）

1. 打开 MobaXterm
2. 连接到远程服务器
3. 右键点击左侧文件浏览器中的文件夹
4. 选择 "Map network drive"
5. 选择一个驱动器号（如 Z:）
6. 映射路径：`/home/ma-user/work/mindyolo-master/captured_subprocess`

#### 方法 B：使用本地路径

MobaXterm 会自动将远程文件同步到本地：
```
C:/Users/你的用户名/Documents/MobaXterm/home/ma-user/work/mindyolo-master/captured_subprocess
```

### 2. 配置后端

编辑 `application.properties`：

```properties
# 方法 A：使用驱动器映射
remote.folder.path=Z:/captured_subprocess

# 方法 B：使用本地路径
# remote.folder.path=C:/Users/你的用户名/Documents/MobaXterm/home/ma-user/work/mindyolo-master/captured_subprocess
```

### 3. 重启后端服务

```bash
cd d:\Desktop\IPLDS\front\backend
java -jar target/power-inspection-backend-1.0.0.jar
```

## 使用方法

### 前端界面操作

1. 打开缺陷管理页面
2. 点击 **"从远程导入"** 按钮（绿色按钮）
3. 选择导入方式：
   - **导入选中文件夹**：只导入选中的一个文件夹
   - **导入全部**：导入所有检测文件夹

### API 接口

#### 1. 获取远程文件夹列表

```bash
GET http://localhost:8080/api/remote-import/folders
```

响应：
```json
{
  "success": true,
  "count": 8,
  "folders": [
    "20260302_164849_f000000",
    "20260302_165117_f000001",
    "20260302_165311_f000002",
    ...
  ]
}
```

#### 2. 导入所有数据

```bash
POST http://localhost:8080/api/remote-import/all
```

响应：
```json
{
  "success": true,
  "count": 15,
  "message": "成功导入 15 条缺陷数据",
  "defects": [...]
}
```

#### 3. 导入指定文件夹

```bash
POST http://localhost:8080/api/remote-import/folder/20260302_164849_f000000
```

响应：
```json
{
  "success": true,
  "count": 2,
  "message": "成功导入 2 条缺陷数据",
  "defects": [...]
}
```

## meta.json 文件格式

```json
{
  "detected": true,
  "defects": [
    {
      "type": "insulator_flashover",
      "confidence": 0.984,
      "bbox": [100, 200, 300, 400],
      "category_id": 1,
      "description": "绝缘子闪络"
    }
  ],
  "location": {
    "latitude": 22.5400,
    "longitude": 114.0500,
    "altitude": 120.5
  },
  "timestamp": "2026-03-02T16:48:49",
  "drone_id": "UAV-12",
  "inference_time_ms": 45.2
}
```

## 数据处理流程

```
1. 扫描远程文件夹
   ↓
2. 读取 meta.json
   ↓
3. 读取 ir.jpg (红外热力图)
   ↓
4. 读取 rgb.jpg (检测框图)
   ↓
5. 转换图片为 Base64
   ↓
6. 创建缺陷记录
   ↓
7. 保存到数据库
   ↓
8. 返回导入结果
```

## 图片处理

### 红外热力图 (ir.jpg)
- 存储到 `thermalImage` 字段
- 格式：`data:image/jpeg;base64,/9j/4AAQ...`

### 检测框图 (rgb.jpg)
- 存储到 `originalImage` 和 `detectionImage` 字段
- 从 RGB 图转换而来
- 格式：`data:image/jpeg;base64,/9j/4AAQ...`

## 前端显示

### 缺陷管理页面
- 卡片缩略图显示检测框图
- 点击卡片查看详情

### 缺陷详情页面
- 原始图片：检测框图 (rgb.jpg)
- 检测框图：检测框图 (rgb.jpg)
- 红外热力图：红外热力图 (ir.jpg)
- 三个图片可以切换查看

## 故障排查

### 问题1：未找到远程文件夹

**原因**：
- MobaXterm 未连接到远程服务器
- 驱动器映射失败
- 路径配置错误

**解决**：
1. 确认 MobaXterm 已连接
2. 检查驱动器映射是否成功
3. 验证 `application.properties` 中的路径

### 问题2：导入失败

**原因**：
- meta.json 格式错误
- 图片文件不存在
- 文件权限问题

**解决**：
1. 检查 meta.json 格式
2. 确认 ir.jpg 和 rgb.jpg 存在
3. 检查文件读取权限

### 问题3：图片不显示

**原因**：
- Base64 转换失败
- 图片格式不支持
- 数据库字段长度限制

**解决**：
1. 检查图片文件是否损坏
2. 确认图片格式为 JPG/PNG
3. 检查数据库 LONGTEXT 字段

## 性能优化

### 批量导入优化
- 使用事务批量提交
- 异步处理大文件
- 进度反馈

### 图片优化
- 压缩图片大小
- 使用缩略图
- 懒加载

## 安全建议

1. **路径验证**：防止路径遍历攻击
2. **文件类型检查**：只允许 JSON 和图片文件
3. **大小限制**：限制单个文件大小
4. **权限控制**：只读取指定目录

## 示例代码

### Python 脚本：生成 meta.json

```python
import json
from datetime import datetime

meta = {
    "detected": True,
    "defects": [
        {
            "type": "insulator_flashover",
            "confidence": 0.984,
            "bbox": [100, 200, 300, 400],
            "category_id": 1,
            "description": "绝缘子闪络"
        }
    ],
    "location": {
        "latitude": 22.5400,
        "longitude": 114.0500,
        "altitude": 120.5
    },
    "timestamp": datetime.now().isoformat(),
    "drone_id": "UAV-12",
    "inference_time_ms": 45.2
}

with open('meta.json', 'w', encoding='utf-8') as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)
```

### Shell 脚本：批量转换 RGB 到 JPG

```bash
#!/bin/bash
for folder in captured_subprocess/*/; do
    if [ -f "$folder/rgb.png" ]; then
        convert "$folder/rgb.png" "$folder/rgb.jpg"
        echo "Converted: $folder"
    fi
done
```

## 总结

远程文件夹导入功能可以：
- ✅ 批量导入检测结果
- ✅ 自动读取红外热力图
- ✅ 自动读取检测框图
- ✅ 解析 JSON 元数据
- ✅ 转换图片为 Base64
- ✅ 保存到数据库
- ✅ 前端实时显示

配置简单，使用方便，适合大批量数据导入！






