# 🚀 远程数据导入快速开始

## 📋 前置条件

1. ✅ MobaXterm 已安装并连接到远程服务器
2. ✅ 远程服务器路径：`/home/ma-user/work/mindyolo-master/captured_subprocess/`
3. ✅ 文件夹包含：`20260302_164849_f000000/` 等检测结果

## 🔧 配置步骤（3步）

### 步骤 1：映射远程文件夹

在 MobaXterm 中：
1. 连接到远程服务器
2. 右键点击 `captured_subprocess` 文件夹
3. 选择 "Map network drive"
4. 选择驱动器号（如 **Z:**）

### 步骤 2：修改后端配置

编辑 `application.properties`：

```properties
# 修改这一行，使用你映射的驱动器号
remote.folder.path=Z:/captured_subprocess
```

### 步骤 3：重启服务

```bash
# 后端
cd d:\Desktop\IPLDS\front\backend
java -jar target/power-inspection-backend-1.0.0.jar

# 前端（另一个终端）
cd d:\Desktop\IPLDS\front\grid-eye
npm run dev
```

## 🎯 使用方法

### 方法 1：前端界面（推荐）

1. 打开浏览器：http://localhost:5173
2. 进入 **缺陷管理** 页面
3. 点击 **"从远程导入"** 按钮（绿色）
4. 选择要导入的文件夹或点击 **"导入全部"**
5. 等待导入完成 ✅

### 方法 2：API 接口

```bash
# 查看可用文件夹
curl http://localhost:8080/api/remote-import/folders

# 导入所有数据
curl -X POST http://localhost:8080/api/remote-import/all

# 导入指定文件夹
curl -X POST http://localhost:8080/api/remote-import/folder/20260302_164849_f000000
```

## 📁 文件夹结构要求

每个检测文件夹必须包含：

```
20260302_164849_f000000/
├── meta.json    ✅ 必需：检测元数据
├── ir.jpg       ✅ 必需：红外热力图
└── rgb.jpg      ✅ 必需：检测框图
```

## 🎨 前端显示效果

导入后，在缺陷管理页面可以看到：

```
┌────────────────────────────────────────┐
│ [缩略图]  #1 绝缘子闪络                 │
│ 128x128   📍 经度: 114.05, 纬度: 22.54 │
│           🔴 Critical                   │
│           📊 置信度: 98.4%              │
│           ⏰ 03-02 16:48                │
└────────────────────────────────────────┘
```

点击卡片查看详情，可以切换查看：
- 原始图片（rgb.jpg）
- 检测框图（rgb.jpg）
- 红外热力图（ir.jpg）

## ⚠️ 常见问题

### Q1: 提示"未找到远程文件夹"

**解决**：
1. 检查 MobaXterm 是否已连接
2. 确认驱动器映射成功（在资源管理器中能看到 Z: 盘）
3. 验证 `application.properties` 中的路径

### Q2: 导入失败

**解决**：
1. 检查文件夹中是否包含 `meta.json`
2. 确认 `ir.jpg` 和 `rgb.jpg` 存在
3. 查看后端日志获取详细错误信息

### Q3: 图片不显示

**解决**：
1. 检查图片文件是否损坏
2. 确认图片格式为 JPG
3. 查看浏览器控制台是否有错误

## 📊 导入数据示例

### meta.json 格式

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
  "drone_id": "UAV-12"
}
```

## 🎉 完成！

现在你可以：
- ✅ 批量导入远程检测数据
- ✅ 查看红外热力图
- ✅ 查看检测框图
- ✅ 查看缺陷详情
- ✅ 管理所有缺陷

## 📚 更多信息

详细文档请查看：
- `REMOTE_IMPORT_GUIDE.md` - 完整使用指南
- `COMPLETED_UPDATES.md` - 更新说明
- `UPDATE_NOTES.md` - 技术文档

---

**提示**：首次导入可能需要一些时间，请耐心等待。导入完成后会显示成功消息。






