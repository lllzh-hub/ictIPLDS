-- 创建摄像头配置表
CREATE TABLE IF NOT EXISTS camera_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uav_id VARCHAR(50) NOT NULL UNIQUE COMMENT '无人机ID',
    camera_url VARCHAR(500) NOT NULL COMMENT '摄像头URL',
    type VARCHAR(20) NOT NULL COMMENT '摄像头类型: rtsp, ws, wss, http',
    description TEXT COMMENT '描述',
    created_at BIGINT COMMENT '创建时间',
    updated_at BIGINT COMMENT '更新时间',
    INDEX idx_uav_id (uav_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='摄像头配置表';
