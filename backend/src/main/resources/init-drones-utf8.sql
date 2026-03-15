-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 清空现有数据
DELETE FROM drones;

-- 插入无人机数据
INSERT INTO drones (drone_id, name, model, status, battery_level, latitude, longitude, flight_hours, created_at, updated_at) 
VALUES 
('UAV-01', '无人机1', 'DJI M300 RTK', 'IN_FLIGHT', 85, 22.54, 114.05, 120, NOW(), NOW()),
('UAV-02', '无人机2', 'DJI M300 RTK', 'AVAILABLE', 92, 22.58, 114.01, 95, NOW(), NOW());

-- 验证数据
SELECT drone_id, name, status, battery_level FROM drones;
