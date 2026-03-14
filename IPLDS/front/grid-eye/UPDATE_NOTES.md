# 数据库和API更新说明

## 更新时间
2026年3月2日

## 更新内容

### 1. 数据库变更

#### 添加字段
- **confidence** (DOUBLE): 置信度字段，范围 0.0-1.0，表示检测结果的可信度

#### 删除字段
- **assigned_to** (VARCHAR): 负责人字段（已移除）

#### 执行迁移
```bash
# 连接到 MySQL 数据库
mysql -u root -p

# 执行迁移脚本
source /d/Desktop/IPLDS/front/backend/migration_add_confidence.sql
```

### 2. 后端实体类更新

**文件**: `Defect.java`

**变更**:
```java
// 删除
private String assignedTo;

// 添加
@Column
private Double confidence;
```

### 3. 前端接口更新

**文件**: `defectApi.ts`

**变更**:
```typescript
export interface Defect {
  // ... 其他字段
  confidence?: number;     // 新增：置信度 (0-1)
  // assignedTo?: string;  // 已删除
}
```

### 4. 前端页面更新

#### DefectDetailView.tsx
- ✅ 移除红外热力图按钮的图标
- ✅ 移除负责人显示
- ✅ 添加置信度显示
- ✅ 修改按钮文字："派遣维修团队" → "确认处理"

#### DefectManagement.tsx
- ✅ 移除负责人字段
- ✅ 添加置信度显示（卡片底部）
- ✅ 表单中添加置信度输入框
- ✅ 置信度以百分比形式显示

### 5. 数据导入更新

**文件**: `DefectImportService.java`

**变更**:
- 从检测结果中提取 `confidence` 字段
- 自动设置到缺陷记录中
- 置信度范围：0.0-1.0

**示例**:
```java
defect.setConfidence(detection.getConfidence()); // 例如: 0.95
```

### 6. 测试数据更新

**文件**: `test_data.sql`

**变更**:
- 所有测试数据添加 `confidence` 字段
- 移除 `assigned_to` 字段

**示例数据**:
```sql
INSERT INTO defects (..., confidence, ...) VALUES
('绝缘子污秽', 'critical', ..., 0.95, ...),
('变压器油温异常', 'high', ..., 0.88, ...),
('线路覆冰', 'medium', ..., 0.76, ...);
```

## 前端显示效果

### 缺陷管理页面
```
┌─────────────────────────────────────────────────┐
│ [缩略图]  #123 绝缘子破损                        │
│           📍 220kV 输电线路 A段                  │
│           🔴 Critical                            │
│           ⏰ 03-02 14:30                         │
│           📊 置信度: 95.5%                       │
└─────────────────────────────────────────────────┘
```

### 缺陷详情页面
```
缺陷详情
├─ 缺陷类型: 绝缘子破损
├─ 严重程度: Critical
├─ 当前状态: pending
└─ 置信度: 95.5%

[标记为误报]  [确认处理]
```

## API 响应示例

### GET /api/defects
```json
{
  "id": 1,
  "type": "绝缘子破损",
  "severity": "critical",
  "location": "220kV 输电线路 A段",
  "description": "绝缘子表面存在裂纹",
  "status": "pending",
  "confidence": 0.955,
  "createdAt": "2026-03-02T14:30:00",
  "originalImage": "http://...",
  "detectionImage": "http://...",
  "thermalImage": "http://...",
  "aiAnalysis": "...",
  "solution": "..."
}
```

## 重新编译和部署

### 后端
```bash
cd /d/Desktop/IPLDS/front/backend

# 清理并重新编译
mvn clean package

# 运行
java -jar target/power-inspection-backend-1.0.0.jar
```

### 前端
```bash
cd /d/Desktop/IPLDS/front/grid-eye

# 安装依赖（如果需要）
npm install

# 启动开发服务器
npm run dev
```

## 验证步骤

1. **数据库验证**
```sql
-- 检查表结构
DESCRIBE defects;

-- 应该看到 confidence 字段，不应该看到 assigned_to 字段

-- 检查数据
SELECT id, type, confidence FROM defects LIMIT 5;
```

2. **后端验证**
```bash
# 访问 API
curl http://localhost:8080/api/defects

# 检查返回的 JSON 中是否包含 confidence 字段
```

3. **前端验证**
- 打开 http://localhost:5173
- 进入缺陷管理页面
- 检查卡片是否显示置信度
- 点击卡片查看详情
- 确认详情页显示置信度
- 确认红外热力图按钮无图标
- 确认按钮文字为"确认处理"

## 注意事项

1. **置信度格式**
   - 数据库存储：0.0-1.0 (DOUBLE)
   - 前端显示：0-100% (百分比)
   - 转换公式：`显示值 = 数据库值 × 100`

2. **数据迁移**
   - 执行迁移脚本前请备份数据库
   - 迁移脚本会为现有数据设置默认置信度
   - 可根据实际情况调整默认值

3. **兼容性**
   - 旧的检测结果如果没有 confidence 字段，会显示为空
   - 新的检测结果必须包含 confidence 字段

## 完成清单

- [x] 数据库实体类添加 confidence 字段
- [x] 数据库实体类移除 assignedTo 字段
- [x] 前端 API 接口更新
- [x] DefectDetailView 移除红外热力图图标
- [x] DefectDetailView 移除负责人显示
- [x] DefectDetailView 添加置信度显示
- [x] DefectDetailView 修改按钮文字
- [x] DefectManagement 移除负责人字段
- [x] DefectManagement 添加置信度显示
- [x] DefectManagement 表单添加置信度输入
- [x] DefectService 更新方法
- [x] DefectImportService 添加置信度设置
- [x] 创建数据库迁移脚本
- [x] 更新测试数据

## 后续建议

1. 根据置信度自动调整严重程度
2. 添加置信度筛选功能
3. 置信度趋势分析
4. 低置信度缺陷的人工复核流程







