-- 数据库迁移脚本：添加置信度字段，移除负责人字段
-- 执行时间：2026-03-02

USE power_inspection;

-- 1. 添加置信度字段（confidence）
ALTER TABLE defects 
ADD COLUMN confidence DOUBLE DEFAULT NULL COMMENT '置信度 (0.0-1.0)' 
AFTER status;

-- 2. 删除负责人字段（assigned_to）
ALTER TABLE defects 
DROP COLUMN IF EXISTS assigned_to;

-- 3. 更新现有数据的置信度（可选，根据实际情况调整）
-- 为现有数据设置默认置信度
UPDATE defects 
SET confidence = 0.95 
WHERE confidence IS NULL AND severity = 'critical';

UPDATE defects 
SET confidence = 0.85 
WHERE confidence IS NULL AND severity = 'high';

UPDATE defects 
SET confidence = 0.75 
WHERE confidence IS NULL AND severity = 'medium';

UPDATE defects 
SET confidence = 0.65 
WHERE confidence IS NULL AND severity = 'low';

-- 4. 查看表结构确认
DESCRIBE defects;

-- 5. 查看数据示例
SELECT id, type, severity, confidence, status, created_at 
FROM defects 
LIMIT 5;







