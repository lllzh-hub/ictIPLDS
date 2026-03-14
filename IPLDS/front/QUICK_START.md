# 快速开始指南

## 🚀 快速测试数据导入功能

### 第一步：启动服务

```bash
# 终端 1 - 启动后端
cd D:/Desktop/front/backend
mvn spring-boot:run

# 终端 2 - 启动前端
cd D:/Desktop/front/grid-eye
npm run dev
```

### 第二步：导入测试数据

**方法 A - 使用批处理脚本（Windows）**
```bash
cd D:/Desktop/front
test_import.bat
```

**方法 B - 使用 Python 脚本**
```bash
cd D:/Desktop/front
python import_detection_data.py D:/Desktop/example_responses/all_defect_types_example.json
```

**方法 C - 通过前端界面**
1. 访问 http://localhost:5173/defect-management
2. 点击右上角 "导入数据" 按钮
3. 选择 `all_defect_types_example.json` 文件
4. 等待导入完成

### 第三步：查看结果

访问以下页面查看导入的数据：
- 缺陷列表：http://localhost:5173/defect-management
- 缺陷详情：http://localhost:5173/defect/1
- 维护看板：http://localhost:5173/fix-kanban

## 📊 导入的数据内容

导入 `all_defect_types_example.json` 后，你将看到 9 条缺陷记录：

1. **气球异物** - 置信度 88%
2. **电缆损坏** - 置信度 85% (危急)
3. **风筝异物** - 置信度 78%
4. **鸟巢** - 置信度 82%
5. **设备锈蚀** - 置信度 72%
6. **垃圾堆积** - 置信度 68%
7. **植被遮挡** - 置信度 75%
8. **绝缘子外壳损坏** - 置信度 70%
9. **绝缘子闪络** - 置信度 90% (危急)

每条记录都包含：
- ✅ 自动生成的 AI 分析报告
- ✅ 标准化的解决方案
- ✅ GPS 位置信息
- ✅ 检测图片（base64）
- ✅ 风险评估

## 🎯 功能特点

### 1. 智能数据转换
- 英文缺陷类型 → 中文类型
- 置信度 → 严重程度
- 检测框坐标 → 位置描述

### 2. 自动生成内容
- AI 分析报告（包含检测信息、风险评估、环境数据）
- 标准化解决方案（根据缺陷类型匹配）
- 格式化的位置信息

### 3. 完整的 CRUD 操作
- ✅ 创建：导入或手动新增
- ✅ 读取：列表查看、详情查看
- ✅ 更新：编辑状态、负责人等
- ✅ 删除：删除缺陷记录

## 🔧 API 端点

```
POST   /api/defects/import          # 导入检测数据
GET    /api/defects                 # 获取所有缺陷
GET    /api/defects/{id}            # 获取单个缺陷
GET    /api/defects/status/{status} # 按状态筛选
GET    /api/defects/severity/{sev}  # 按严重程度筛选
POST   /api/defects                 # 创建缺陷
PUT    /api/defects/{id}            # 更新缺陷
DELETE /api/defects/{id}            # 删除缺陷
```

## 📝 数据流程

```
JSON 文件 (检测结果)
    ↓
前端上传 / Python 脚本
    ↓
POST /api/defects/import
    ↓
DefectImportService (数据转换)
    ↓
数据库 (MySQL)
    ↓
前端展示 (缺陷管理页面)
```

## 🎨 前端页面

### 1. 缺陷管理页面
- 统计卡片（总数、危急、待处理、已完成）
- 搜索和筛选功能
- 表格展示所有缺陷
- 导入数据按钮
- 新增/编辑/删除操作

### 2. 缺陷详情页面
- 原始图片和检测图片对比
- AI 分析报告
- 解决方案
- 缺陷基本信息
- 状态更新

### 3. 维护看板
- 看板视图（待验证、待派遣、进行中、已完成）
- 拖拽更新状态
- 优先级标识

## 💡 使用建议

1. **首次使用**：先导入示例数据熟悉功能
2. **批量导入**：建议单次不超过 100 条
3. **图片大小**：建议单张图片不超过 5MB
4. **定期备份**：重要数据请定期备份数据库

## 🐛 常见问题

**Q: 导入后看不到数据？**
A: 刷新页面，检查筛选条件

**Q: 图片显示不出来？**
A: 检查 base64 编码是否正确，图片是否过大

**Q: 导入失败？**
A: 检查 JSON 格式，确保包含 defects 数组

**Q: 后端连接失败？**
A: 确保后端服务已启动在 8080 端口

## 📚 相关文档

- [完整导入指南](README_IMPORT.md)
- [如何添加测试数据](HOW_TO_ADD_TEST_DATA.md)
- [图片使用指南](IMAGE_USAGE_GUIDE.md)

## ✨ 下一步

现在你已经成功集成了服务器数据，可以：

1. 自定义缺陷类型映射
2. 添加更多的解决方案模板
3. 集成实时无人机数据流
4. 添加数据导出功能
5. 实现批量操作功能



