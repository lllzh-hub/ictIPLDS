# 数据库设计文档

## 数据库概览

**数据库名称**: `power_inspection`  
**字符集**: UTF-8MB4  
**排序规则**: utf8mb4_unicode_ci

---

## 核心表设计

### 1. drones (无人机表)

存储无人机的基本信息和状态。

```sql
CREATE TABLE drones (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  drone_id VARCHAR(50) UNIQUE NOT NULL COMMENT '无人机编号',
  name VARCHAR(100) NOT NULL COMMENT '无人机名称',
  model VARCHAR(100) NOT NULL COMMENT '无人机型号',
  status ENUM('AVAILABLE', 'IN_FLIGHT', 'CHARGING', 'MAINTENANCE', 'OFFLINE') 
    DEFAULT 'AVAILABLE' COMMENT '无人机状态',
  battery_level DOUBLE COMMENT '电池电量百分比 (0-100)',
  current_location VARCHAR(200) COMMENT '当前位置描述',
  latitude DOUBLE COMMENT '纬度',
  longitude DOUBLE COMMENT '经度',
  flight_hours INT DEFAULT 0 COMMENT '累计飞行小时数',
  last_maintenance_date DATETIME COMMENT '最后维护日期',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_drone_id (drone_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='无人机表';
```

**字段说明**:
- `drone_id`: 唯一标识，如 UAV-01, UAV-02
- `status`: 无人机状态枚举值
- `battery_level`: 0-100 的百分比值
- `latitude/longitude`: GPS 坐标

---

### 2. defects (缺陷表)

存储检测到的缺陷信息。

```sql
CREATE TABLE defects (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  type VARCHAR(100) NOT NULL COMMENT '缺陷类型',
  severity ENUM('critical', 'high', 'medium', 'low') 
    DEFAULT 'medium' COMMENT '严重程度',
  location VARCHAR(200) NOT NULL COMMENT '缺陷位置',
  description TEXT COMMENT '缺陷描述',
  status ENUM('pending', 'in-progress', 'review', 'completed') 
    DEFAULT 'pending' COMMENT '处理状态',
  confidence DOUBLE COMMENT '置信度 (0-1)',
  detected_at DATETIME COMMENT '检测时间',
  original_image LONGBLOB COMMENT '原始图像 (Base64)',
  detection_image LONGBLOB COMMENT '检测框图 (Base64)',
  thermal_image LONGBLOB COMMENT '红外热力图 (Base64)',
  ai_analysis TEXT COMMENT 'AI 分析结果',
  solution TEXT COMMENT '解决方案',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_type (type),
  INDEX idx_severity (severity),
  INDEX idx_status (status),
  INDEX idx_confidence (confidence),
  INDEX idx_created_at (created_at),
  FULLTEXT INDEX ft_description (description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='缺陷表';
```

**字段说明**:
- `type`: 缺陷类型，如 "绝缘子污秽", "导线断裂" 等
- `severity`: 严重程度，critical > high > medium > low
- `confidence`: AI 置信度，范围 0-1
- `*_image`: 使用 LONGBLOB 存储 Base64 编码的图像
- `ai_analysis`: 存储 AI 分析的结构化文本
- `solution`: 维修方案建议

---

### 3. maintenance_tasks (维护任务表)

记录缺陷的维护任务。

```sql
CREATE TABLE maintenance_tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
  drone_id BIGINT NOT NULL COMMENT '无人机 ID',
  defect_id BIGINT NOT NULL COMMENT '缺陷 ID',
  task_type VARCHAR(50) COMMENT '任务类型',
  status ENUM('pending', 'in-progress', 'completed', 'cancelled') 
    DEFAULT 'pending' COMMENT '任务状态',
  assigned_to VARCHAR(100) COMMENT '分配给',
  priority ENUM('low', 'medium', 'high', 'critical') 
    DEFAULT 'medium' COMMENT '优先级',
  estimated_hours INT COMMENT '预计工时',
  actual_hours INT COMMENT '实际工时',
  notes TEXT COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  completed_at DATETIME COMMENT '完成时间',
  
  FOREIGN KEY (drone_id) REFERENCES drones(id) ON DELETE CASCADE,
  FOREIGN KEY (defect_id) REFERENCES defects(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='维护任务表';
```

---

## 数据关系图

```
drones (无人机)
  ↓ 1:N
maintenance_tasks (维护任务)
  ↓ N:1
defects (缺陷)
```

---

## 索引策略

### 主要索引

| 表名 | 索引名 | 字段 | 用途 |
|------|--------|------|------|
| drones | idx_drone_id | drone_id | 快速查询特定无人机 |
| drones | idx_status | status | 按状态筛选 |
| defects | idx_severity | severity | 按严重程度筛选 |
| defects | idx_status | status | 按处理状态筛选 |
| defects | ft_description | description | 全文搜索 |
| maintenance_tasks | idx_status | status | 按任务状态筛选 |

---

## 数据类型选择

| 字段类型 | 选择原因 |
|---------|---------|
| BIGINT | 支持大数据量，自增 ID |
| VARCHAR(100) | 固定长度字符串，性能好 |
| TEXT | 可变长度文本 |
| LONGBLOB | 存储大型二进制数据（图像） |
| DOUBLE | 浮点数，用于坐标和置信度 |
| ENUM | 固定值集合，节省空间 |
| DATETIME | 时间戳，支持时区 |

---

## 查询优化建议

### 常见查询

```sql
-- 查询所有可用无人机
SELECT * FROM drones WHERE status = 'AVAILABLE';

-- 查询危急缺陷
SELECT * FROM defects 
WHERE severity = 'critical' AND status != 'completed'
ORDER BY created_at DESC;

-- 查询待处理维护任务
SELECT mt.*, d.name as drone_name, df.type as defect_type
FROM maintenance_tasks mt
JOIN drones d ON mt.drone_id = d.id
JOIN defects df ON mt.defect_id = df.id
WHERE mt.status = 'pending'
ORDER BY mt.priority DESC, mt.created_at ASC;

-- 统计缺陷分布
SELECT severity, COUNT(*) as count
FROM defects
GROUP BY severity;

-- 查询高置信度缺陷
SELECT * FROM defects
WHERE confidence > 0.9
ORDER BY confidence DESC;
```

---

## 备份和恢复

### 备份

```bash
# 完整备份
mysqldump -u root -p power_inspection > backup_$(date +%Y%m%d_%H%M%S).sql

# 仅备份结构
mysqldump -u root -p --no-data power_inspection > schema_backup.sql

# 仅备份数据
mysqldump -u root -p --no-create-info power_inspection > data_backup.sql
```

### 恢复

```bash
# 恢复完整备份
mysql -u root -p power_inspection < backup_20260315_120000.sql

# 恢复到新数据库
mysql -u root -p -e "CREATE DATABASE power_inspection_restore;"
mysql -u root -p power_inspection_restore < backup_20260315_120000.sql
```

---

## 性能优化

### 1. 连接池配置

在 `application.properties` 中配置：

```properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
```

### 2. 查询优化

- 使用索引加速查询
- 避免 SELECT *，只查询需要的字段
- 使用 LIMIT 分页
- 使用 JOIN 代替子查询

### 3. 表分区

对于大数据量表，可考虑按时间分区：

```sql
ALTER TABLE defects PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p2027 VALUES LESS THAN (2028),
  PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

---

## 数据安全

### 1. 用户权限

```sql
-- 创建应用用户
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'strong_password';

-- 授予权限
GRANT SELECT, INSERT, UPDATE, DELETE ON power_inspection.* TO 'app_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;
```

### 2. 定期备份

建议每天自动备份：

```bash
# crontab 配置
0 2 * * * mysqldump -u root -p'password' power_inspection > /backup/power_inspection_$(date +\%Y\%m\%d).sql
```

---

**最后更新**: 2026-03-15
