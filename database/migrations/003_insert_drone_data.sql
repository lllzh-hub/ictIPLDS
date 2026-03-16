-- 插入无人机数据
INSERT INTO drones (drone_id, name, model, status, battery_level, latitude, longitude, flight_hours, current_location, created_at, updated_at) VALUES
('UAV-01', '无人机-01', 'DJI Matrice 300', 'IN_FLIGHT', 85.0, 22.54, 114.05, 120, 'Zone-A', NOW(), NOW()),
('UAV-02', '无人机-02', 'DJI Matrice 300', 'AVAILABLE', 92.0, 22.58, 114.01, 95, 'Base Station', NOW(), NOW()),
('UAV-03', '无人机-03', 'DJI Matrice 300', 'AVAILABLE', 78.0, 22.56, 114.03, 110, 'Zone-B', NOW(), NOW()),
('UAV-04', '无人机-04', 'DJI Matrice 300', 'MAINTENANCE', 0.0, 22.50, 114.00, 150, 'Maintenance Bay', NOW(), NOW()),
('UAV-05', '无人机-05', 'DJI Matrice 300', 'IN_FLIGHT', 65.0, 22.52, 114.02, 105, 'Zone-B', NOW(), NOW()),
('UAV-06', '无人机-06', 'DJI Matrice 300', 'OFFLINE', 0.0, 22.60, 114.10, 200, 'Unknown', NOW(), NOW());
