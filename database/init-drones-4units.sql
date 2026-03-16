SET NAMES utf8;
SET CHARACTER SET utf8;
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM drones;

INSERT INTO drones (drone_id, name, model, status, battery_level, latitude, longitude, flight_hours, current_location, created_at, updated_at) 
VALUES 
('UAV-01', '无人机-01', 'DJI M300 RTK', 'IN_FLIGHT', 85, 22.54, 114.05, 120, 'Zone-A', NOW(), NOW()),
('UAV-02', '无人机-02', 'DJI M300 RTK', 'AVAILABLE', 92, 22.58, 114.01, 95, NULL, NOW(), NOW()),
('UAV-03', '无人机-03', 'DJI M300 RTK', 'IN_FLIGHT', 72, 22.56, 114.06, 98, 'Zone-B', NOW(), NOW()),
('UAV-04', '无人机-04', 'DJI M300 RTK', 'AVAILABLE', 88, 22.55, 114.04, 87, NULL, NOW(), NOW());

SELECT COUNT(*) as total FROM drones;
SELECT drone_id, name, status, battery_level FROM drones ORDER BY drone_id;

SET FOREIGN_KEY_CHECKS = 1;
