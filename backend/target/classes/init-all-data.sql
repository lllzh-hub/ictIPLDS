-- ============================================
-- 电力巡检系统 - 完整数据初始化脚本
-- 字符编码：UTF-8
-- ============================================

SET NAMES utf8;
SET CHARACTER SET utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. 初始化无人机数据 (drones 表)
-- ============================================
TRUNCATE TABLE drones;

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

-- ============================================
-- 2. 验证无人机数据插入
-- ============================================
SELECT COUNT(*) as 无人机总数 FROM drones;
SELECT drone_id, name, status, battery_level FROM drones ORDER BY drone_id;

-- ============================================
-- 3. 初始化维护团队数据 (maintenance_team 表)
-- ============================================
TRUNCATE TABLE maintenance_team;

INSERT INTO maintenance_team (team_id, name, leader, skills, status, workload, created_at, updated_at)
VALUES
('team-001', '线路巡检队', '张明', '线路巡检,缺陷诊断,无人机操控', 'ready', 45, NOW(), NOW()),
('team-002', '设备维修队', '李建国', '设备维修,电气试验,焊接', 'ready', 60, NOW(), NOW()),
('team-003', '高空作业队', '王大伟', '高空作业,绝缘子更换,螺栓紧固', 'ready', 55, NOW(), NOW()),
('team-004', '应急响应队', '刘强', '应急处置,故障排查,24小时值班', 'ready', 70, NOW(), NOW());

-- ============================================
-- 4. 初始化维护任务数据 (maintenance_tasks 表)
-- ============================================
TRUNCATE TABLE maintenance_tasks;

INSERT INTO maintenance_tasks (task_id, title, description, equipment_type, equipment_id, location, priority, status, scheduled_date, estimated_duration, assigned_to, created_at, updated_at)
VALUES
('TASK-MT-001', '110kV XX线定期巡检', '每月定期巡检，检查绝缘子、金具、导线状态', '输电线路', 'LINE-110-001', '区域 A-01', 'MEDIUM', 'SCHEDULED', DATE_ADD(NOW(), INTERVAL 3 DAY), 480, 'team-001', NOW(), NOW()),
('TASK-MT-002', '变压器油样检测', '采集变压器油样进行化学分析', '变压器', 'TRANS-035-001', '区域 B-02', 'HIGH', 'PENDING', DATE_ADD(NOW(), INTERVAL 5 DAY), 240, 'team-002', NOW(), NOW()),
('TASK-MT-003', '接地网完整性检测', '测量接地电阻，检查接地装置', '接地系统', 'GROUND-001', '区域 C-03', 'MEDIUM', 'PENDING', DATE_ADD(NOW(), INTERVAL 7 DAY), 360, 'team-003', NOW(), NOW()),
('TASK-MT-004', '开关柜预防性试验', '进行开关柜的绝缘试验和机械特性试验', '开关设备', 'SWITCH-10-001', '区域 D-04', 'HIGH', 'PENDING', DATE_ADD(NOW(), INTERVAL 10 DAY), 600, 'team-002', NOW(), NOW());

-- ============================================
-- 5. 初始化缺陷数据 (defects 表)
-- ============================================
TRUNCATE TABLE defects;

INSERT INTO defects (type, location, severity, status, description, detected_at, created_at, updated_at, assigned_to)
VALUES
('绝缘子破损', '区域 A-01 / 塔架 #72', 'critical', 'in-progress', '绝缘子表面存在放电痕迹，需无人机近距离复验', NOW(), NOW(), NOW(), 'team-001'),
('设备温度异常', '区域 B-02 / 变压器 #88', 'critical', 'pending', '主变压器温度超过85℃，超出安全阈值', NOW(), NOW(), NOW(), 'team-002'),
('线路弧垂异常', '区域 C-03 / 线路 #102', 'high', 'pending', '导线弧垂超出正常范围，疑似线路松弛', NOW(), NOW(), NOW(), 'team-001'),
('螺栓松动', '区域 D-04 / 杆塔 #145', 'high', 'in-progress', '杆塔螺栓紧固作业进行中', NOW(), NOW(), NOW(), 'team-003'),
('异物缠绕', '龙源线 15km 处', 'high', 'assigned', '大型农业薄膜缠绕，目前天气状况允许清除', NOW(), NOW(), NOW(), 'team-001'),
('防鸟装置脱落', '区域 E-05 / 塔架 #120', 'medium', 'assigned', '防鸟装置部分脱落，需重新安装加固', NOW(), NOW(), NOW(), 'team-003'),
('接地电阻偏高', '区域 F-06 / 接地装置 #178', 'high', 'assigned', '接地装置接地电阻偏高，需检测整改', NOW(), NOW(), NOW(), 'team-003'),
('地基沉降', '西直门 04号 基站', 'medium', 'in-progress', '地基加固作业进行中', NOW(), NOW(), NOW(), 'team-003');

-- ============================================
-- 6. 验证数据插入结果
-- ============================================
SELECT '=== 数据初始化完成 ===' as 状态;
SELECT CONCAT('无人机总数: ', COUNT(*)) FROM drones;
SELECT CONCAT('维护团队数: ', COUNT(*)) FROM maintenance_team;
SELECT CONCAT('维护任务数: ', COUNT(*)) FROM maintenance_tasks;
SELECT CONCAT('缺陷记录数: ', COUNT(*)) FROM defects;

SET FOREIGN_KEY_CHECKS = 1;
