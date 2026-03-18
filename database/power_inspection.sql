/*
 Navicat Premium Dump SQL

 Source Server         : edu
 Source Server Type    : MySQL
 Source Server Version : 80040 (8.0.40)
 Source Host           : localhost:3306
 Source Schema         : power_inspection

 Target Server Type    : MySQL
 Target Server Version : 80040 (8.0.40)
 File Encoding         : 65001

 Date: 17/03/2026 00:49:25
*/

-- ============================================
-- 字符编码配置（必须在最前面）
-- ============================================
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET SESSION collation_connection = utf8mb4_unicode_ci;

-- 删除旧数据库
DROP DATABASE IF EXISTS power_inspection;

-- 创建新数据库（使用正确的字符集）
CREATE DATABASE power_inspection CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用新数据库
USE power_inspection;

-- 再次设置连接字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET SESSION collation_connection = utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for ai_chat_history
-- ----------------------------
DROP TABLE IF EXISTS `ai_chat_history`;
CREATE TABLE `ai_chat_history`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ai_response` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` datetime(6) NOT NULL,
  `message_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 44 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of ai_chat_history
-- ----------------------------

-- ----------------------------
-- Table structure for alarm
-- ----------------------------
DROP TABLE IF EXISTS `alarm`;
CREATE TABLE `alarm`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `alarm_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `alarm_time` datetime(6) NOT NULL,
  `confirmed` bit(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `description` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `handled` bit(1) NOT NULL,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `latitude` double NULL DEFAULT NULL,
  `level` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `longitude` double NULL DEFAULT NULL,
  `source_uav_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `type` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `confidence` double NULL DEFAULT NULL,
  `location` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `message` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `UK_8uyb2t7p00t7k4r3m4rotj7hx`(`alarm_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 16 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of alarm
-- ----------------------------
INSERT INTO `alarm` VALUES (1, 'ALARM-001', '2026-02-07 20:31:05.000000', b'1', '2026-02-07 20:46:05.000000', '检测到绝缘子破损，存在闪络风险', b'1', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/6dd7f5830af34c16ba43f7f073b6ec51.jpg', 22.54, 'critical', 114.05, 'UAV-12', '绝缘子闪络/破损', '2026-02-08 00:21:01.935176', NULL, NULL, '');
INSERT INTO `alarm` VALUES (2, 'ALARM-003', '2026-02-07 20:16:05.000000', b'1', '2026-02-07 20:46:05.000000', '变压器温度超过85°C，超出安全阈值', b'0', NULL, 22.56, 'critical', 114.06, 'UAV-07', '设备温度异常', '2026-02-08 00:25:48.554049', NULL, NULL, '');
INSERT INTO `alarm` VALUES (3, 'ALARM-005', '2026-02-07 19:46:05.000000', b'0', '2026-02-07 20:46:05.000000', '导线弧垂超出正常范围，疑似线路松弛', b'0', NULL, 22.52, 'critical', 114.02, 'UAV-05', '线路弧垂异常', '2026-02-07 20:46:05.000000', NULL, NULL, '');
INSERT INTO `alarm` VALUES (4, 'ALARM-002', '2026-02-07 20:01:05.000000', b'1', '2026-02-07 20:46:05.000000', '发现疑似鸟巢，可能影响线路安全', b'0', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/5b403634afe248b19ac6885c6f05b282.jpg', 22.58, 'warning', 114.01, 'UAV-05', '疑似鸟巢异物', '2026-02-08 04:02:45.809606', NULL, NULL, '');
INSERT INTO `alarm` VALUES (5, 'ALARM-004', '2026-02-07 18:46:05.000000', b'0', '2026-02-07 20:46:05.000000', '杆塔横担连接螺栓松动', b'0', NULL, 22.54, 'warning', 114.05, 'UAV-01', '螺栓松动', '2026-02-07 20:46:05.000000', NULL, NULL, '');
INSERT INTO `alarm` VALUES (6, 'ALARM-006', '2026-02-07 17:46:05.000000', b'0', '2026-02-07 20:46:05.000000', '防护网出现轻微变形', b'0', NULL, 22.56, 'warning', 114.03, 'UAV-03', '防护网变形', '2026-02-07 20:46:05.000000', NULL, NULL, '');
INSERT INTO `alarm` VALUES (7, 'ALARM-008', '2026-02-07 15:46:05.000000', b'0', '2026-02-07 20:46:05.000000', '接地装置接地电阻测试值偏高', b'0', NULL, 22.56, 'warning', 114.06, 'UAV-07', '接地电阻偏高', '2026-02-07 20:46:05.000000', NULL, NULL, '');
INSERT INTO `alarm` VALUES (8, 'ALARM-007', '2026-02-07 16:46:05.000000', b'0', '2026-02-07 20:46:05.000000', '设备表面积尘较多，建议清洁', b'0', NULL, 22.58, 'info', 114.08, 'UAV-12', '设备表面积尘', '2026-02-07 20:46:05.000000', NULL, NULL, '');
INSERT INTO `alarm` VALUES (9, 'ALARM-009', '2026-02-07 14:46:05.000000', b'0', '2026-02-07 20:46:05.000000', '线路下方植被生长过快，需要清理', b'0', NULL, 22.54, 'info', 114.05, 'UAV-01', '植被生长过快', '2026-02-07 20:46:05.000000', NULL, NULL, '');
INSERT INTO `alarm` VALUES (10, 'ALARM-010', '2026-02-07 12:46:05.000000', b'1', '2026-02-07 20:46:05.000000', '避雷针表面锈蚀严重', b'0', NULL, 22.52, 'warning', 114.02, 'UAV-05', '避雷针锈蚀', '2026-02-07 20:46:05.000000', NULL, NULL, '');
INSERT INTO `alarm` VALUES (11, 'ALARM-011', '2026-02-07 10:46:05.000000', b'1', '2026-02-07 20:46:05.000000', '电缆沟内有积水', b'0', NULL, 22.56, 'info', 114.03, 'UAV-03', '电缆沟积水', '2026-02-07 20:46:05.000000', NULL, NULL, '');
INSERT INTO `alarm` VALUES (12, 'ALARM-012', '2026-02-06 20:46:05.000000', b'1', '2026-02-07 20:46:05.000000', '导线上缠绕塑料薄膜', b'1', NULL, 22.56, 'warning', 114.06, 'UAV-07', '异物缠绕', '2026-02-07 20:46:05.000000', NULL, NULL, '');
INSERT INTO `alarm` VALUES (13, 'ALARM-013', '2026-02-05 20:46:05.000000', b'1', '2026-02-07 20:46:05.000000', '开关柜运行时有异常声响', b'1', NULL, 22.58, 'warning', 114.08, 'UAV-12', '开关柜异响', '2026-02-07 20:46:05.000000', NULL, NULL, '');
INSERT INTO `alarm` VALUES (14, 'ALARM-014', '2026-02-04 20:46:05.000000', b'1', '2026-02-07 20:46:05.000000', '绝缘子表面污秽度较高', b'1', NULL, 22.54, 'info', 114.05, 'UAV-01', '绝缘子污秽', '2026-02-07 20:46:05.000000', NULL, NULL, '');
INSERT INTO `alarm` VALUES (15, 'ALARM-015', '2026-02-03 20:46:05.000000', b'1', '2026-02-07 20:46:05.000000', '设备标识牌部分脱落', b'1', NULL, 22.52, 'info', 114.02, 'UAV-05', '标识牌脱落', '2026-02-07 20:46:05.000000', NULL, NULL, '');

-- ----------------------------
-- Table structure for camera_config
-- ----------------------------
DROP TABLE IF EXISTS `camera_config`;
CREATE TABLE `camera_config`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `camera_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` bigint NULL DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `uav_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` bigint NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `UK_4jwrpmj39nsbrkxjta9g6c9vr`(`uav_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of camera_config
-- ----------------------------

-- ----------------------------
-- Table structure for defect
-- ----------------------------
DROP TABLE IF EXISTS `defect`;
CREATE TABLE `defect`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `altitude` double NULL DEFAULT NULL,
  `chart_color` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `chart_data` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `confidence` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `defect_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `diagnosis` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `handled` bit(1) NOT NULL,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `latitude` double NULL DEFAULT NULL,
  `location` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `longitude` double NULL DEFAULT NULL,
  `risk` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `UK_s8cheyhs2air2ph9i122gc4x3`(`defect_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 16 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of defect
-- ----------------------------
INSERT INTO `defect` VALUES (1, 125.5, 'rgba(239, 68, 68, 1)', '[10,15,25,20,45,60,85]', '98.4%', '2026-02-07 20:46:05.000000', 'DT-2026-001', '主承重框架北侧', '严重锈蚀 (C4)', b'0', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/c501fb158eeb416ab718aaa6581be81d.jpg', 22.54, '区域 B-04 / 节点 72', 114.05, '极高', 'critical', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (2, 135.2, 'rgba(239, 68, 68, 1)', '[8,12,18,25,40,65,92]', '96.7%', '2026-02-07 20:46:05.000000', 'DT-2026-002', '高压线缆接口处', '绝缘子破损 (I3)', b'0', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/e80e685f888c4c34b6a1b08f43f1bd5e.jpg', 22.58, '区域 A-12 / 支架 10', 114.01, '极高', 'critical', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (3, 98.3, 'rgba(239, 68, 68, 1)', '[5,12,10,30,45,75,95]', '94.7%', '2026-02-07 20:46:05.000000', 'DT-2026-003', '基座水位线附近', '漆面脱落 (C2)', b'0', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/516713827b404ebf96e0177334d0a4bb.jpg', 22.56, '区域 D-01 / 桥墩 03', 114.03, '高', 'critical', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (4, 142.8, 'rgba(239, 68, 68, 1)', '[15,20,28,35,50,70,88]', '97.2%', '2026-02-07 20:46:05.000000', 'DT-2026-004', '东侧绝缘子串', '闪络痕迹 (I2)', b'0', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/6dd7f5830af34c16ba43f7f073b6ec51.jpg', 22.55, '区域 C-08 / 塔架 45', 114.06, '极高', 'critical', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (5, 115.6, 'rgba(245, 158, 11, 1)', '[20,22,18,25,24,28,30]', '82.1%', '2026-02-07 20:46:05.000000', 'DT-2026-005', '液压传输管线 A', '表面裂纹 (L2)', b'0', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/3f20dbb84aa543f48964c2890c9e2f23.jpg', 22.58, '区域 A-12 / 支架 10', 114.01, '中等', 'warning', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (6, 128.4, 'rgba(245, 158, 11, 1)', '[12,15,18,22,25,30,35]', '88.5%', '2026-02-07 20:46:05.000000', 'DT-2026-006', '导线悬挂点', '鸟巢异物 (F1)', b'0', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/5b403634afe248b19ac6885c6f05b282.jpg', 22.52, '区域 E-15 / 线路 88', 114.08, '中等', 'warning', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (7, 105.9, 'rgba(245, 158, 11, 1)', '[10,12,15,18,20,25,28]', '79.3%', '2026-02-07 20:46:05.000000', 'DT-2026-007', '横担连接处', '螺栓松动 (M1)', b'0', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/030f0c7af66c43c69f97b39fcabe0e31.jpg', 22.57, '区域 F-20 / 杆塔 102', 114.04, '中等', 'warning', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (8, 92.1, 'rgba(245, 158, 11, 1)', '[8,10,12,15,18,22,26]', '85.6%', '2026-02-07 20:46:05.000000', 'DT-2026-008', '地基沉降区域', '轻微沉降 (S1)', b'0', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/c772d8709ad14bd5b4ab30276713cef8.jpg', 22.53, '区域 G-25 / 基站 04', 114.07, '中等', 'warning', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (9, 88.7, 'rgba(59, 130, 246, 1)', '[5,6,7,8,9,10,12]', '72.4%', '2026-02-07 20:46:05.000000', 'DT-2026-009', '外墙涂层', '轻微褪色 (C1)', b'0', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/7bbd2b8439a340e491379a2c48f36c4d.jpg', 22.59, '区域 H-30 / 变电站 B-12', 114.02, '低', 'normal', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (10, 95.3, 'rgba(59, 130, 246, 1)', '[3,4,5,6,7,8,10]', '68.9%', '2026-02-07 20:46:05.000000', 'DT-2026-010', '防护网', '轻微变形 (D1)', b'0', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/911f08f59bd34ac8985cc8c6bd527b48.jpg', 22.6, '区域 I-35 / 线路 120', 114.09, '低', 'normal', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (11, 110.2, 'rgba(245, 158, 11, 1)', '[15,18,20,22,25,28,30]', '91.2%', '2026-02-05 20:46:05.000000', 'DT-2026-011', '接地装置', '接地电阻偏高 (E2)', b'1', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/3f0d0eb1ecbe4fa2b41293e895f4e0d1.jpg', 22.51, '区域 J-40 / 塔架 150', 114.05, '中等', 'warning', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (12, 132.6, 'rgba(59, 130, 246, 1)', '[8,9,10,11,12,13,15]', '76.8%', '2026-02-02 20:46:05.000000', 'DT-2026-012', '防雷设施', '避雷针锈蚀 (L1)', b'1', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/90e8ce33dd0c422a87c5c3330d35735e.jpg', 22.61, '区域 K-45 / 支架 200', 114.1, '低', 'normal', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (13, 102.8, 'rgba(245, 158, 11, 1)', '[12,14,16,18,20,22,24]', '83.5%', '2026-02-06 20:46:05.000000', 'DT-2026-013', '冷却系统', '散热片积尘 (M2)', b'1', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/c501fb158eeb416ab718aaa6581be81d.jpg', 22.56, '区域 L-50 / 变压器 T-08', 114.06, '中等', 'warning', '2026-02-07 20:46:05.000000');
INSERT INTO `defect` VALUES (14, 96.4, 'rgba(59, 130, 246, 1)', '[5,6,7,8,9,10,11]', '69.7%', '2026-02-04 20:46:05.000000', 'DT-2026-014', '操作机构', '润滑不足 (O1)', b'1', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/e80e685f888c4c34b6a1b08f43f1bd5e.jpg', 22.54, '区域 M-55 / 开关站 S-12', 114.08, '低', 'normal', '2026-02-07 20:46:05.000000');

-- ----------------------------
-- Table structure for defects
-- ----------------------------
DROP TABLE IF EXISTS `defects`;
CREATE TABLE `defects`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `assigned_to` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime(6) NULL DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `detected_at` datetime(6) NULL DEFAULT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime(6) NULL DEFAULT NULL,
  `ai_analysis` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `detection_image` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `original_image` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `solution` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `thermal_image` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `confidence` double NULL DEFAULT NULL,
  `scene_category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `image_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ai_text_analysis` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `ai_text_solution` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 256 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of defects
-- ----------------------------
INSERT INTO `defects` VALUES (220, NULL, '2026-03-16 23:53:54.376627', '', '2026-03-16 23:53:54.376627', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:01:07.435132', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.8555,\"bbox_xyxy\":[269.5,243.25,653.0,350.5],\"is_defect\":true}]', '/api/images/stream1_frame_4.jpg', '/api/images/stream1_frame_4.jpg', '[{\"class_id\":7,\"class_name\":\"trash\",\"score\":0.5498,\"bbox_xyxy\":[43.44,84.06,157.75,177.62],\"is_defect\":true},{\"class_id\":7,\"class_name\":\"trash\",\"score\":0.4902,\"bbox_xyxy\":[43.12,84.25,220.25,387.0],\"is_defect\":true}]', '/api/images/stream2_frame_5.jpg', 0.8555, NULL, 'D:/Desktop/example_responses/stream1_frame_4.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (221, NULL, '2026-03-16 23:53:54.649791', '', '2026-03-16 23:53:54.649791', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:53:54.649791', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.9121,\"bbox_xyxy\":[375.0,145.0,652.0,318.75],\"is_defect\":true}]', '/api/images/stream1_frame_8.jpg', '/api/images/stream1_frame_8.jpg', '[{\"class_id\":1,\"class_name\":\"isolateur_manquant\",\"score\":0.5234,\"bbox_xyxy\":[262.0,78.44,343.75,207.75],\"is_defect\":true}]', '/api/images/stream2_frame_10.jpg', 0.9121, NULL, 'D:/Desktop/example_responses/stream1_frame_8.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (222, NULL, '2026-03-16 23:53:54.963954', '', '2026-03-16 23:53:54.963954', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:53:54.963954', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.8838,\"bbox_xyxy\":[101.75,327.5,542.5,407.5],\"is_defect\":true}]', '/api/images/stream1_frame_2.jpg', '/api/images/stream1_frame_2.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.916,\"bbox_xyxy\":[36.56,173.5,587.0,494.0],\"is_defect\":true}]', '/api/images/stream2_frame_3.jpg', 0.8838, NULL, 'D:/Desktop/example_responses/stream1_frame_2.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (223, NULL, '2026-03-16 23:53:55.251015', '', '2026-03-16 23:53:55.251015', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:53:55.251015', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.9121,\"bbox_xyxy\":[12.81,289.75,576.5,411.25],\"is_defect\":true}]', '/api/images/stream1_frame_3.jpg', '/api/images/stream1_frame_3.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.9121,\"bbox_xyxy\":[11.25,178.12,605.0,527.0],\"is_defect\":true}]', '/api/images/stream2_frame_4.jpg', 0.9121, NULL, 'D:/Desktop/example_responses/stream1_frame_3.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (224, NULL, '2026-03-16 23:53:55.541404', '', '2026-03-16 23:53:55.541404', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:53:55.541404', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.917,\"bbox_xyxy\":[180.25,155.25,551.5,356.0],\"is_defect\":true}]', '/api/images/stream1_frame_1.jpg', '/api/images/stream1_frame_1.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.9023,\"bbox_xyxy\":[53.75,124.5,627.5,465.5],\"is_defect\":true},{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.8379,\"bbox_xyxy\":[52.34,133.5,625.0,273.0],\"is_defect\":true}]', '/api/images/stream2_frame_2.jpg', 0.917, NULL, 'D:/Desktop/example_responses/stream1_frame_1.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (225, NULL, '2026-03-16 23:53:55.869138', '', '2026-03-16 23:53:55.869138', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:53:55.869138', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.6602,\"bbox_xyxy\":[160.25,121.25,402.75,644.5],\"is_defect\":true}]', '/api/images/stream1_frame_10.jpg', '/api/images/stream1_frame_10.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.6162,\"bbox_xyxy\":[408.75,50.62,549.0,573.0],\"is_defect\":true},{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.6089,\"bbox_xyxy\":[404.0,48.12,548.5,575.5],\"is_defect\":true}]', '/api/images/stream2_frame_12.jpg', 0.6602, NULL, 'D:/Desktop/example_responses/stream1_frame_10.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (226, NULL, '2026-03-16 23:57:00.941922', '', '2026-03-16 23:57:00.941922', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:57:00.941922', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.8555,\"bbox_xyxy\":[269.5,243.25,653.0,350.5],\"is_defect\":true}]', '/api/images/stream1_frame_4.jpg', '/api/images/stream1_frame_4.jpg', '[{\"class_id\":7,\"class_name\":\"trash\",\"score\":0.5498,\"bbox_xyxy\":[43.44,84.06,157.75,177.62],\"is_defect\":true},{\"class_id\":7,\"class_name\":\"trash\",\"score\":0.4902,\"bbox_xyxy\":[43.12,84.25,220.25,387.0],\"is_defect\":true}]', '/api/images/stream2_frame_5.jpg', 0.8555, NULL, 'D:/Desktop/example_responses/stream1_frame_4.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (227, NULL, '2026-03-16 23:57:01.162133', '', '2026-03-16 23:57:01.162133', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:57:01.162133', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.9121,\"bbox_xyxy\":[375.0,145.0,652.0,318.75],\"is_defect\":true}]', '/api/images/stream1_frame_8.jpg', '/api/images/stream1_frame_8.jpg', '[{\"class_id\":1,\"class_name\":\"isolateur_manquant\",\"score\":0.5234,\"bbox_xyxy\":[262.0,78.44,343.75,207.75],\"is_defect\":true}]', '/api/images/stream2_frame_10.jpg', 0.9121, NULL, 'D:/Desktop/example_responses/stream1_frame_8.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (228, NULL, '2026-03-16 23:57:01.450737', '', '2026-03-16 23:57:01.450737', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:57:01.450737', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.8838,\"bbox_xyxy\":[101.75,327.5,542.5,407.5],\"is_defect\":true}]', '/api/images/stream1_frame_2.jpg', '/api/images/stream1_frame_2.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.916,\"bbox_xyxy\":[36.56,173.5,587.0,494.0],\"is_defect\":true}]', '/api/images/stream2_frame_3.jpg', 0.8838, NULL, 'D:/Desktop/example_responses/stream1_frame_2.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (229, NULL, '2026-03-16 23:57:01.700286', '', '2026-03-16 23:57:01.700286', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:57:01.700286', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.9121,\"bbox_xyxy\":[12.81,289.75,576.5,411.25],\"is_defect\":true}]', '/api/images/stream1_frame_3.jpg', '/api/images/stream1_frame_3.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.9121,\"bbox_xyxy\":[11.25,178.12,605.0,527.0],\"is_defect\":true}]', '/api/images/stream2_frame_4.jpg', 0.9121, NULL, 'D:/Desktop/example_responses/stream1_frame_3.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (230, NULL, '2026-03-16 23:57:01.954652', '', '2026-03-16 23:57:01.954652', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:57:01.954652', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.917,\"bbox_xyxy\":[180.25,155.25,551.5,356.0],\"is_defect\":true}]', '/api/images/stream1_frame_1.jpg', '/api/images/stream1_frame_1.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.9023,\"bbox_xyxy\":[53.75,124.5,627.5,465.5],\"is_defect\":true},{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.8379,\"bbox_xyxy\":[52.34,133.5,625.0,273.0],\"is_defect\":true}]', '/api/images/stream2_frame_2.jpg', 0.917, NULL, 'D:/Desktop/example_responses/stream1_frame_1.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (231, NULL, '2026-03-16 23:57:02.204114', '', '2026-03-16 23:57:02.204114', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:57:02.204114', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.6602,\"bbox_xyxy\":[160.25,121.25,402.75,644.5],\"is_defect\":true}]', '/api/images/stream1_frame_10.jpg', '/api/images/stream1_frame_10.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.6162,\"bbox_xyxy\":[408.75,50.62,549.0,573.0],\"is_defect\":true},{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.6089,\"bbox_xyxy\":[404.0,48.12,548.5,575.5],\"is_defect\":true}]', '/api/images/stream2_frame_12.jpg', 0.6602, NULL, 'D:/Desktop/example_responses/stream1_frame_10.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (232, NULL, '2026-03-16 23:57:45.949314', '', '2026-03-16 23:57:45.949314', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:57:45.949314', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.8555,\"bbox_xyxy\":[269.5,243.25,653.0,350.5],\"is_defect\":true}]', '/api/images/stream1_frame_4.jpg', '/api/images/stream1_frame_4.jpg', '[{\"class_id\":7,\"class_name\":\"trash\",\"score\":0.5498,\"bbox_xyxy\":[43.44,84.06,157.75,177.62],\"is_defect\":true},{\"class_id\":7,\"class_name\":\"trash\",\"score\":0.4902,\"bbox_xyxy\":[43.12,84.25,220.25,387.0],\"is_defect\":true}]', '/api/images/stream2_frame_5.jpg', 0.8555, NULL, 'D:/Desktop/example_responses/stream1_frame_4.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (233, NULL, '2026-03-16 23:57:46.215209', '', '2026-03-16 23:57:46.215209', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:57:46.215209', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.9121,\"bbox_xyxy\":[375.0,145.0,652.0,318.75],\"is_defect\":true}]', '/api/images/stream1_frame_8.jpg', '/api/images/stream1_frame_8.jpg', '[{\"class_id\":1,\"class_name\":\"isolateur_manquant\",\"score\":0.5234,\"bbox_xyxy\":[262.0,78.44,343.75,207.75],\"is_defect\":true}]', '/api/images/stream2_frame_10.jpg', 0.9121, NULL, 'D:/Desktop/example_responses/stream1_frame_8.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (234, NULL, '2026-03-16 23:57:46.506408', '', '2026-03-16 23:57:46.506408', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:57:46.506408', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.8838,\"bbox_xyxy\":[101.75,327.5,542.5,407.5],\"is_defect\":true}]', '/api/images/stream1_frame_2.jpg', '/api/images/stream1_frame_2.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.916,\"bbox_xyxy\":[36.56,173.5,587.0,494.0],\"is_defect\":true}]', '/api/images/stream2_frame_3.jpg', 0.8838, NULL, 'D:/Desktop/example_responses/stream1_frame_2.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (235, NULL, '2026-03-16 23:57:46.779835', '', '2026-03-16 23:57:46.779835', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:57:46.779835', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.9121,\"bbox_xyxy\":[12.81,289.75,576.5,411.25],\"is_defect\":true}]', '/api/images/stream1_frame_3.jpg', '/api/images/stream1_frame_3.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.9121,\"bbox_xyxy\":[11.25,178.12,605.0,527.0],\"is_defect\":true}]', '/api/images/stream2_frame_4.jpg', 0.9121, NULL, 'D:/Desktop/example_responses/stream1_frame_3.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (236, NULL, '2026-03-16 23:57:47.046022', '', '2026-03-16 23:57:47.046022', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:57:47.046022', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.917,\"bbox_xyxy\":[180.25,155.25,551.5,356.0],\"is_defect\":true}]', '/api/images/stream1_frame_1.jpg', '/api/images/stream1_frame_1.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.9023,\"bbox_xyxy\":[53.75,124.5,627.5,465.5],\"is_defect\":true},{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.8379,\"bbox_xyxy\":[52.34,133.5,625.0,273.0],\"is_defect\":true}]', '/api/images/stream2_frame_2.jpg', 0.917, NULL, 'D:/Desktop/example_responses/stream1_frame_1.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (237, NULL, '2026-03-16 23:57:47.325724', '', '2026-03-16 23:57:47.325724', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:57:47.325724', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.6602,\"bbox_xyxy\":[160.25,121.25,402.75,644.5],\"is_defect\":true}]', '/api/images/stream1_frame_10.jpg', '/api/images/stream1_frame_10.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.6162,\"bbox_xyxy\":[408.75,50.62,549.0,573.0],\"is_defect\":true},{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.6089,\"bbox_xyxy\":[404.0,48.12,548.5,575.5],\"is_defect\":true}]', '/api/images/stream2_frame_12.jpg', 0.6602, NULL, 'D:/Desktop/example_responses/stream1_frame_10.jpg', NULL, NULL);
INSERT INTO `defects` VALUES (238, NULL, '2026-03-16 23:59:57.801184', '', '2026-03-16 23:59:57.801184', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:59:57.801184', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.8555,\"bbox_xyxy\":[269.5,243.25,653.0,350.5],\"is_defect\":true}]', '/api/images/stream1_frame_4.jpg', '/api/images/stream1_frame_4.jpg', '[{\"class_id\":7,\"class_name\":\"trash\",\"score\":0.5498,\"bbox_xyxy\":[43.44,84.06,157.75,177.62],\"is_defect\":true},{\"class_id\":7,\"class_name\":\"trash\",\"score\":0.4902,\"bbox_xyxy\":[43.12,84.25,220.25,387.0],\"is_defect\":true}]', '/api/images/stream2_frame_5.jpg', 0.8555, NULL, 'D:/Desktop/example_responses/stream1_frame_4.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (239, NULL, '2026-03-16 23:59:58.102167', '', '2026-03-16 23:59:58.102167', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:59:58.102167', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.9121,\"bbox_xyxy\":[375.0,145.0,652.0,318.75],\"is_defect\":true}]', '/api/images/stream1_frame_8.jpg', '/api/images/stream1_frame_8.jpg', '[{\"class_id\":1,\"class_name\":\"isolateur_manquant\",\"score\":0.5234,\"bbox_xyxy\":[262.0,78.44,343.75,207.75],\"is_defect\":true}]', '/api/images/stream2_frame_10.jpg', 0.9121, NULL, 'D:/Desktop/example_responses/stream1_frame_8.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (240, NULL, '2026-03-16 23:59:58.404385', '', '2026-03-16 23:59:58.404385', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:59:58.404385', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.8838,\"bbox_xyxy\":[101.75,327.5,542.5,407.5],\"is_defect\":true}]', '/api/images/stream1_frame_2.jpg', '/api/images/stream1_frame_2.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.916,\"bbox_xyxy\":[36.56,173.5,587.0,494.0],\"is_defect\":true}]', '/api/images/stream2_frame_3.jpg', 0.8838, NULL, 'D:/Desktop/example_responses/stream1_frame_2.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (241, NULL, '2026-03-16 23:59:58.679912', '', '2026-03-16 23:59:58.679912', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:59:58.679912', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.9121,\"bbox_xyxy\":[12.81,289.75,576.5,411.25],\"is_defect\":true}]', '/api/images/stream1_frame_3.jpg', '/api/images/stream1_frame_3.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.9121,\"bbox_xyxy\":[11.25,178.12,605.0,527.0],\"is_defect\":true}]', '/api/images/stream2_frame_4.jpg', 0.9121, NULL, 'D:/Desktop/example_responses/stream1_frame_3.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (242, NULL, '2026-03-16 23:59:58.971551', '', '2026-03-16 23:59:58.971551', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:59:58.971551', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.917,\"bbox_xyxy\":[180.25,155.25,551.5,356.0],\"is_defect\":true}]', '/api/images/stream1_frame_1.jpg', '/api/images/stream1_frame_1.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.9023,\"bbox_xyxy\":[53.75,124.5,627.5,465.5],\"is_defect\":true},{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.8379,\"bbox_xyxy\":[52.34,133.5,625.0,273.0],\"is_defect\":true}]', '/api/images/stream2_frame_2.jpg', 0.917, NULL, 'D:/Desktop/example_responses/stream1_frame_1.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (243, NULL, '2026-03-16 23:59:59.258635', '', '2026-03-16 23:59:59.258635', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-16 23:59:59.258635', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.6602,\"bbox_xyxy\":[160.25,121.25,402.75,644.5],\"is_defect\":true}]', '/api/images/stream1_frame_10.jpg', '/api/images/stream1_frame_10.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.6162,\"bbox_xyxy\":[408.75,50.62,549.0,573.0],\"is_defect\":true},{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.6089,\"bbox_xyxy\":[404.0,48.12,548.5,575.5],\"is_defect\":true}]', '/api/images/stream2_frame_12.jpg', 0.6602, NULL, 'D:/Desktop/example_responses/stream1_frame_10.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (244, NULL, '2026-03-17 00:01:39.984714', '', '2026-03-17 00:01:39.984714', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:01:39.984714', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.8555,\"bbox_xyxy\":[269.5,243.25,653.0,350.5],\"is_defect\":true}]', '/api/images/stream1_frame_4.jpg', '/api/images/stream1_frame_4.jpg', '[{\"class_id\":7,\"class_name\":\"trash\",\"score\":0.5498,\"bbox_xyxy\":[43.44,84.06,157.75,177.62],\"is_defect\":true},{\"class_id\":7,\"class_name\":\"trash\",\"score\":0.4902,\"bbox_xyxy\":[43.12,84.25,220.25,387.0],\"is_defect\":true}]', '/api/images/stream2_frame_5.jpg', 0.8555, NULL, 'D:/Desktop/example_responses/stream1_frame_4.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (245, NULL, '2026-03-17 00:01:40.232967', '', '2026-03-17 00:01:40.232967', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:01:40.232967', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.9121,\"bbox_xyxy\":[375.0,145.0,652.0,318.75],\"is_defect\":true}]', '/api/images/stream1_frame_8.jpg', '/api/images/stream1_frame_8.jpg', '[{\"class_id\":1,\"class_name\":\"isolateur_manquant\",\"score\":0.5234,\"bbox_xyxy\":[262.0,78.44,343.75,207.75],\"is_defect\":true}]', '/api/images/stream2_frame_10.jpg', 0.9121, NULL, 'D:/Desktop/example_responses/stream1_frame_8.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (246, NULL, '2026-03-17 00:01:40.488011', '', '2026-03-17 00:01:40.488011', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:01:40.488011', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.8838,\"bbox_xyxy\":[101.75,327.5,542.5,407.5],\"is_defect\":true}]', '/api/images/stream1_frame_2.jpg', '/api/images/stream1_frame_2.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.916,\"bbox_xyxy\":[36.56,173.5,587.0,494.0],\"is_defect\":true}]', '/api/images/stream2_frame_3.jpg', 0.8838, NULL, 'D:/Desktop/example_responses/stream1_frame_2.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (247, NULL, '2026-03-17 00:01:40.734514', '', '2026-03-17 00:01:40.734514', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:01:40.734514', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.9121,\"bbox_xyxy\":[12.81,289.75,576.5,411.25],\"is_defect\":true}]', '/api/images/stream1_frame_3.jpg', '/api/images/stream1_frame_3.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.9121,\"bbox_xyxy\":[11.25,178.12,605.0,527.0],\"is_defect\":true}]', '/api/images/stream2_frame_4.jpg', 0.9121, NULL, 'D:/Desktop/example_responses/stream1_frame_3.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (248, NULL, '2026-03-17 00:01:40.975419', '', '2026-03-17 00:01:40.975419', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:01:40.975419', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.917,\"bbox_xyxy\":[180.25,155.25,551.5,356.0],\"is_defect\":true}]', '/api/images/stream1_frame_1.jpg', '/api/images/stream1_frame_1.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.9023,\"bbox_xyxy\":[53.75,124.5,627.5,465.5],\"is_defect\":true},{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.8379,\"bbox_xyxy\":[52.34,133.5,625.0,273.0],\"is_defect\":true}]', '/api/images/stream2_frame_2.jpg', 0.917, NULL, 'D:/Desktop/example_responses/stream1_frame_1.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (249, NULL, '2026-03-17 00:01:41.273042', '', '2026-03-17 00:01:41.273042', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:01:41.273042', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.6602,\"bbox_xyxy\":[160.25,121.25,402.75,644.5],\"is_defect\":true}]', '/api/images/stream1_frame_10.jpg', '/api/images/stream1_frame_10.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.6162,\"bbox_xyxy\":[408.75,50.62,549.0,573.0],\"is_defect\":true},{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.6089,\"bbox_xyxy\":[404.0,48.12,548.5,575.5],\"is_defect\":true}]', '/api/images/stream2_frame_12.jpg', 0.6602, NULL, 'D:/Desktop/example_responses/stream1_frame_10.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (250, NULL, '2026-03-17 00:39:38.231866', '', '2026-03-17 00:39:38.231866', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:39:38.231866', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.8555,\"bbox_xyxy\":[269.5,243.25,653.0,350.5],\"is_defect\":true}]', '/api/images/stream1_frame_4.jpg', '/api/images/stream1_frame_4.jpg', '[{\"class_id\":7,\"class_name\":\"trash\",\"score\":0.5498,\"bbox_xyxy\":[43.44,84.06,157.75,177.62],\"is_defect\":true},{\"class_id\":7,\"class_name\":\"trash\",\"score\":0.4902,\"bbox_xyxy\":[43.12,84.25,220.25,387.0],\"is_defect\":true}]', '/api/images/stream2_frame_5.jpg', 0.8555, NULL, 'D:/Desktop/example_responses/stream1_frame_4.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (251, NULL, '2026-03-17 00:39:38.494885', '', '2026-03-17 00:39:38.494885', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:39:38.494885', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.9121,\"bbox_xyxy\":[375.0,145.0,652.0,318.75],\"is_defect\":true}]', '/api/images/stream1_frame_8.jpg', '/api/images/stream1_frame_8.jpg', '[{\"class_id\":1,\"class_name\":\"isolateur_manquant\",\"score\":0.5234,\"bbox_xyxy\":[262.0,78.44,343.75,207.75],\"is_defect\":true}]', '/api/images/stream2_frame_10.jpg', 0.9121, NULL, 'D:/Desktop/example_responses/stream1_frame_8.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (252, NULL, '2026-03-17 00:39:38.775577', '', '2026-03-17 00:39:38.776594', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:39:38.776594', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.8838,\"bbox_xyxy\":[101.75,327.5,542.5,407.5],\"is_defect\":true}]', '/api/images/stream1_frame_2.jpg', '/api/images/stream1_frame_2.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.916,\"bbox_xyxy\":[36.56,173.5,587.0,494.0],\"is_defect\":true}]', '/api/images/stream2_frame_3.jpg', 0.8838, NULL, 'D:/Desktop/example_responses/stream1_frame_2.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (253, NULL, '2026-03-17 00:39:39.072440', '', '2026-03-17 00:39:39.072440', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:39:39.072440', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.9121,\"bbox_xyxy\":[12.81,289.75,576.5,411.25],\"is_defect\":true}]', '/api/images/stream1_frame_3.jpg', '/api/images/stream1_frame_3.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.9121,\"bbox_xyxy\":[11.25,178.12,605.0,527.0],\"is_defect\":true}]', '/api/images/stream2_frame_4.jpg', 0.9121, NULL, 'D:/Desktop/example_responses/stream1_frame_3.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (254, NULL, '2026-03-17 00:39:39.375833', '', '2026-03-17 00:39:39.375833', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:39:39.375833', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.917,\"bbox_xyxy\":[180.25,155.25,551.5,356.0],\"is_defect\":true}]', '/api/images/stream1_frame_1.jpg', '/api/images/stream1_frame_1.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.9023,\"bbox_xyxy\":[53.75,124.5,627.5,465.5],\"is_defect\":true},{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.8379,\"bbox_xyxy\":[52.34,133.5,625.0,273.0],\"is_defect\":true}]', '/api/images/stream2_frame_2.jpg', 0.917, NULL, 'D:/Desktop/example_responses/stream1_frame_1.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');
INSERT INTO `defects` VALUES (255, NULL, '2026-03-17 00:39:39.652629', '', '2026-03-17 00:39:39.652629', '未知位置', 'medium', 'pending', 'cable_defectueux', '2026-03-17 00:39:39.652629', '[{\"class_id\":0,\"class_name\":\"cable_defectueux\",\"score\":0.6602,\"bbox_xyxy\":[160.25,121.25,402.75,644.5],\"is_defect\":true}]', '/api/images/stream1_frame_10.jpg', '/api/images/stream1_frame_10.jpg', '[{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.6162,\"bbox_xyxy\":[408.75,50.62,549.0,573.0],\"is_defect\":true},{\"class_id\":6,\"class_name\":\"kite\",\"score\":0.6089,\"bbox_xyxy\":[404.0,48.12,548.5,575.5],\"is_defect\":true}]', '/api/images/stream2_frame_12.jpg', 0.6602, NULL, 'D:/Desktop/example_responses/stream1_frame_10.jpg', '1. 缺陷原因分析\n• 设备长期运行导致的自然老化\n• 环境因素影响（温度、湿度、污染）\n• 维护保养周期可能需要调整\n\n2. 风险评估\n• 中等风险：需要及时处理避免恶化\n• 可能影响设备正常运行和供电稳定性\n\n3. 处理建议\n• 安排专业人员现场检查确认\n• 根据检查结果制定维修方案\n• 准备必要的备件和工具', '4. 维修方案\n• 更换老化部件或进行必要的维修\n• 清洁设备表面，消除污染源\n• 进行功能测试，确保设备正常运行\n\n5. 预防措施\n• 加强后续监控和定期巡检\n• 建立设备健康档案\n• 优化维护保养计划\n\n? 提示：当前为演示模式');

-- ----------------------------
-- Table structure for drones
-- ----------------------------
DROP TABLE IF EXISTS `drones`;
CREATE TABLE `drones`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `battery_level` double NULL DEFAULT NULL,
  `created_at` datetime(6) NULL DEFAULT NULL,
  `current_location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `drone_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `flight_hours` int NULL DEFAULT NULL,
  `last_maintenance_date` datetime(6) NULL DEFAULT NULL,
  `latitude` double NULL DEFAULT NULL,
  `longitude` double NULL DEFAULT NULL,
  `model` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('AVAILABLE','IN_FLIGHT','CHARGING','MAINTENANCE','OFFLINE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime(6) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `UK_knignsy4k037l19uyfl2ksd5m`(`drone_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of drones
-- ----------------------------
INSERT INTO `drones` VALUES (1, 85, '2026-03-16 23:51:08.000000', 'Zone-A', 'UAV-01', 120, NULL, 22.54, 114.05, 'DJI M300 RTK', '无人机-01', 'IN_FLIGHT', '2026-03-16 23:51:08.000000');
INSERT INTO `drones` VALUES (2, 92, '2026-03-16 23:51:08.000000', NULL, 'UAV-02', 95, NULL, 22.58, 114.01, 'DJI M300 RTK', '无人机-02', 'AVAILABLE', '2026-03-16 23:51:08.000000');
INSERT INTO `drones` VALUES (3, 72, '2026-03-16 23:51:08.000000', 'Zone-B', 'UAV-03', 98, NULL, 22.56, 114.06, 'DJI M300 RTK', '无人机-03', 'IN_FLIGHT', '2026-03-16 23:51:08.000000');
INSERT INTO `drones` VALUES (4, 88, '2026-03-16 23:51:08.000000', NULL, 'UAV-04', 87, NULL, 22.55, 114.04, 'DJI M300 RTK', '无人机-04', 'AVAILABLE', '2026-03-16 23:51:08.000000');

-- ----------------------------
-- Table structure for flight_paths
-- ----------------------------
DROP TABLE IF EXISTS `flight_paths`;
CREATE TABLE `flight_paths`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NULL DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `direction` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `drone_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `end_lat` double NULL DEFAULT NULL,
  `end_lon` double NULL DEFAULT NULL,
  `flight_height` int NULL DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `path_data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `spacing` int NULL DEFAULT NULL,
  `start_lat` double NULL DEFAULT NULL,
  `start_lon` double NULL DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','COMPLETED','ARCHIVED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `total_length` double NULL DEFAULT NULL,
  `updated_at` datetime(6) NULL DEFAULT NULL,
  `waypoint_count` int NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of flight_paths
-- ----------------------------

-- ----------------------------
-- Table structure for maintenance_tasks
-- ----------------------------
DROP TABLE IF EXISTS `maintenance_tasks`;
CREATE TABLE `maintenance_tasks`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `assigned_to` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `completed_date` datetime(6) NULL DEFAULT NULL,
  `created_at` datetime(6) NULL DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `equipment_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `equipment_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `estimated_duration` int NULL DEFAULT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `scheduled_date` datetime(6) NULL DEFAULT NULL,
  `status` enum('PENDING','SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime(6) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `UK_dnrqt24400fa275lnt3f5vkot`(`task_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of maintenance_tasks
-- ----------------------------

-- ----------------------------
-- Table structure for maintenance_team
-- ----------------------------
DROP TABLE IF EXISTS `maintenance_team`;
CREATE TABLE `maintenance_team`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `avatar` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `leader` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `skills` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `workload` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `UK_e61umq87olwrcnvmyd6xp2th8`(`team_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of maintenance_team
-- ----------------------------
INSERT INTO `maintenance_team` VALUES (1, 'https://via.placeholder.com/40', '2026-02-08 03:47:58.495335', 'member1', 'test1', 'HVAC', 'ready', 'team-1770493678470', '2026-02-08 03:47:58.495335', 50);

-- ----------------------------
-- Table structure for task
-- ----------------------------
DROP TABLE IF EXISTS `task`;
CREATE TABLE `task`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ai_suggestion` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `assignee` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `completed_at` datetime(6) NULL DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `description` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `priority` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `progress` int NULL DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `UK_c6xnair9r4ivxrbuq6vkgf1g7`(`task_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 21 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of task
-- ----------------------------
INSERT INTO `task` VALUES (1, 'AI: 建议紧急核实', 'test1', NULL, '2026-02-07 20:46:05.000000', '绝缘子表面存在放电痕迹', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/90e8ce33dd0c422a87c5c3330d35735e.jpg', 'critical', 0, 'in-progress', 'TASK-001', '#72 塔架绝缘子表面存在放电痕迹，需无人机近距离复验。', '绝缘子缺陷', '2026-02-09 20:56:56.234162');
INSERT INTO `task` VALUES (2, 'AI: 建议立即派遣维修团队', NULL, NULL, '2026-02-07 20:46:05.000000', '主变压器温度超过阈值', NULL, 'critical', NULL, 'pending', 'TASK-005', '#88 变电站主变压器温度异常，需立即检查冷却系统。', '设备异常', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (3, 'AI: 建议尽快现场勘查', NULL, NULL, '2026-02-07 20:46:05.000000', '导线弧垂超出正常范围', NULL, 'high', NULL, 'pending', 'TASK-006', '#102 高压线路导线弧垂异常，疑似线路松弛。', '线路缺陷', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (4, 'AI: 建议安排定期维护', NULL, NULL, '2026-02-07 20:46:05.000000', '操作机构响应时间过长', NULL, 'medium', NULL, 'pending', 'TASK-009', '#156 开关站操作机构动作异常，需检修。', '设备检修', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (5, 'AI: 建议下午14点前执行', NULL, NULL, '2026-02-07 20:46:05.000000', '大型农业薄膜缠绕', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/030f0c7af66c43c69f97b39fcabe0e31.jpg', 'high', NULL, 'assigned', 'TASK-002', '龙源线 15km 处存在大型农业薄膜缠绕，目前天气状况允许清除。', '异物缠绕', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (6, 'AI: 建议本周内完成', NULL, NULL, '2026-02-07 20:46:05.000000', '防鸟刺脱落3处', NULL, 'medium', NULL, 'assigned', 'TASK-007', '#120 防鸟装置部分脱落，需重新安装加固。', '防鸟装置', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (7, 'AI: 建议雨季前完成整改', NULL, NULL, '2026-02-07 20:46:05.000000', '接地电阻超标', NULL, 'high', NULL, 'assigned', 'TASK-010', '#178 接地装置接地电阻偏高，需检测整改。', '接地系统', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (8, NULL, '李建国', NULL, '2026-02-07 20:46:05.000000', '地基加固作业', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/c772d8709ad14bd5b4ab30276713cef8.jpg', 'medium', 65, 'review', 'TASK-003', '西直门 04号 基站地基加固作业。', '基础沉降', '2026-02-08 01:26:37.635096');
INSERT INTO `task` VALUES (9, '', '王大伟', NULL, '2026-02-07 20:46:05.000000', '螺栓松动处理', NULL, 'high', 45, 'in-progress', 'TASK-008', '#145 杆塔螺栓紧固作业进行中。', '紧固作业', '2026-02-08 00:31:41.942719');
INSERT INTO `task` VALUES (10, NULL, '张明', NULL, '2026-02-07 20:46:05.000000', '更换破损绝缘子', NULL, 'high', 80, 'in-progress', 'TASK-011', '#189 绝缘子更换作业。', '绝缘子更换', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (11, NULL, '刘强', NULL, '2026-02-07 20:46:05.000000', '清除树木遮挡', NULL, 'medium', 30, 'in-progress', 'TASK-012', '#201 线路清障作业。', '线路清障', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (12, NULL, '陈浩', NULL, '2026-02-07 20:46:05.000000', '油样采集与分析', NULL, 'low', 55, 'in-progress', 'TASK-015', '#245 变压器油样检测。', '设备检测', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (13, NULL, '赵磊', '2026-02-06 20:46:05.000000', '2026-02-04 20:46:05.000000', '防鸟刺更换安装', NULL, 'low', 100, 'completed', 'TASK-004', '东郊变电站 2号 进线口防鸟刺更换安装完毕。', '防鸟装置安装', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (14, NULL, '孙伟', '2026-02-05 20:46:05.000000', '2026-02-02 20:46:05.000000', '避雷针除锈防腐', NULL, 'medium', 100, 'completed', 'TASK-013', '#215 避雷针锈蚀处理完成。', '防雷设施', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (15, NULL, '周杰', '2026-02-04 20:46:05.000000', '2026-01-31 20:46:05.000000', '电缆沟积水清理', NULL, 'low', 100, 'completed', 'TASK-014', '#228 电缆沟清理完成。', '设施维护', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (16, NULL, '吴涛', '2026-02-06 20:46:05.000000', '2026-02-03 20:46:05.000000', '绝缘电阻测试', NULL, 'medium', 100, 'completed', 'TASK-016', '#256 绝缘测试完成。', '设备检测', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (17, NULL, '郑强', '2026-02-03 20:46:05.000000', '2026-01-30 20:46:05.000000', '接地网完整性检测', NULL, 'high', 100, 'completed', 'TASK-017', '#267 接地网检测完成。', '接地系统', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (18, NULL, '黄磊', '2026-02-02 20:46:05.000000', '2026-01-28 20:46:05.000000', '开关柜内部清洁', NULL, 'low', 100, 'completed', 'TASK-018', '#278 开关柜清洁保养完成。', '设备维护', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (19, NULL, '林峰', '2026-02-01 20:46:05.000000', '2026-01-26 20:46:05.000000', '例行线路巡视', NULL, 'low', 100, 'completed', 'TASK-019', '#289 线路巡视完成。', '日常巡检', '2026-02-07 20:46:05.000000');
INSERT INTO `task` VALUES (20, NULL, '马超', '2026-01-31 20:46:05.000000', '2026-01-24 20:46:05.000000', '红外热成像检测', NULL, 'medium', 100, 'completed', 'TASK-020', '#300 变电站设备红外测温完成。', '设备检测', '2026-02-07 20:46:05.000000');

-- ----------------------------
-- Table structure for uav
-- ----------------------------
DROP TABLE IF EXISTS `uav`;
CREATE TABLE `uav`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `altitude` int NULL DEFAULT NULL,
  `battery` int NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `last_update` datetime(6) NULL DEFAULT NULL,
  `latitude` double NULL DEFAULT NULL,
  `longitude` double NULL DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `speed` int NULL DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `task` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `uav_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `UK_dd8dr568266gy3g3uc1dc5nv0`(`uav_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 14 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of uav
-- ----------------------------
INSERT INTO `uav` VALUES (1, 120, 85, '2026-02-07 20:46:05.000000', 'https://modao.cc/agent-py/media/generated_images/2026-01-21/911f08f59bd34ac8985cc8c6bd527b48.jpg', '2026-02-07 20:46:05.000000', 22.54, 114.05, '无人机-01', 42, 'working', 'Zone-A 巡检任务', 'UAV-01', '2026-02-07 20:46:05.000000');
INSERT INTO `uav` VALUES (2, 95, 65, '2026-02-07 20:46:05.000000', NULL, '2026-02-07 20:46:05.000000', 22.52, 114.02, '无人机-02', 38, 'working', 'Zone-B 巡检任务', 'UAV-02', '2026-02-07 20:46:05.000000');
INSERT INTO `uav` VALUES (3, 110, 72, '2026-02-07 20:46:05.000000', NULL, '2026-02-07 20:46:05.000000', 22.56, 114.06, '无人机-03', 45, 'working', 'Zone-C 缺陷复查', 'UAV-03', '2026-02-07 20:46:05.000000');
INSERT INTO `uav` VALUES (4, 135, 58, '2026-02-07 20:46:05.000000', NULL, '2026-02-07 20:46:05.000000', 22.58, 114.08, '无人机-04', 40, 'working', 'Zone-D 紧急巡检', 'UAV-04', '2026-02-07 20:46:05.000000');

SET FOREIGN_KEY_CHECKS = 1;
