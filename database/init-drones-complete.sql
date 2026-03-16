-- ============================================
-- 无人机数据初始化脚本
-- 字符编码：UTF-8
-- 执行前请确保已修改 application.properties 中的字符编码为 utf8
-- ============================================

SET NAMES utf8;
SET CHARACTER SET utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- 清空现有数据
DELETE FROM drones;

-- 插入 12 架无人机数据
INSERT INTO drones (drone_id, name, model, status, battery_level, latitude, longitude, flight_hours, current_location, created_at, updated_at) 
VALUES 
('UAV-01', '无人机-01', 'DJI M300 RTK', 'IN_FLIGHT', 85, 22.54, 114.05, 120, 'Zone-A 巡检任务', NOW(), NOW()),
('UAV-02', '无人机-02', 'DJI M300 RTK', 'AVAILABLE', 92, 22.58, 114.01, 95, NULL, NOW(), NOW()),
('UAV-03', '无人机-03', 'DJI M300 RTK', 'AVAILABLE', 78, 22.56, 114.03, 110, NULL, NOW(), NOW()),
('UAV-04', '无人机-04', 'DJI M300 RTK', 'MAINTENANCE', 0, 22.5, 114, 150, NULL, NOW(), NOW()),
('UAV-05', '无人机-05', 'DJI M300 RTK', 'IN_FLIGHT', 65, 22.52, 114.02, 135, 'Zone-B 巡检任务', NOW(), NOW()),
('UAV-06', '无人机-06', 'DJI M300 RTK', 'OFFLINE', 0, 22.6, 114.1, 200, NULL, NOW(), NOW()),
('UAV-07', '无人机-07', 'DJI M300 RTK', 'IN_FLIGHT', 72, 22.56, 114.06, 98, 'Zone-C 缺陷复查', NOW(), NOW()),
('UAV-08', '无人机-08', 'DJI M300 RTK', 'AVAILABLE', 88, 22.55, 114.04, 87, NULL, NOW(), NOW()),
('UAV-09', '无人机-09', 'DJI M300 RTK', 'AVAILABLE', 81, 22.59, 114.09, 76, NULL, NOW(), NOW()),
('UAV-10', '无人机-10', 'DJI M300 RTK', 'AVAILABLE', 95, 22.57, 114.07, 65, NULL, NOW(), NOW()),
('UAV-11', '无人机-11', 'DJI M300 RTK', 'MAINTENANCE', 15, 22.6, 114.1, 180, NULL, NOW(), NOW()),
('UAV-12', '无人机-12', 'DJI M300 RTK', 'IN_FLIGHT', 58, 22.58, 114.08, 142, 'Zone-D 紧急巡检', NOW(), NOW());

-- 验证数据插入
SELECT '=== 无人机数据初始化完成 ===' as 状态;
SELECT COUNT(*) as 无人机总数 FROM drones;
SELECT drone_id, name, status, battery_level FROM drones ORDER BY drone_id;

SET FOREIGN_KEY_CHECKS = 1;
