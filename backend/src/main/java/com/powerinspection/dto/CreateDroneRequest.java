package com.powerinspection.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 无人机创建请求 DTO
 * 用于接收前端添加新无人机的请求
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateDroneRequest {
    
    /**
     * 无人机编号 (例如: UAV-05)
     */
    private String droneId;
    
    /**
     * 无人机名称 (例如: 无人机-05)
     * 注意: 确保使用 UTF-8 编码
     */
    private String name;
    
    /**
     * 无人机型号 (例如: DJI M300 RTK)
     */
    private String model;
    
    /**
     * 初始电池电量 (0-100)
     */
    private Double batteryLevel;
    
    /**
     * 初始纬度
     */
    private Double latitude;
    
    /**
     * 初始经度
     */
    private Double longitude;
    
    /**
     * 初始飞行时数
     */
    private Integer flightHours;
    
    /**
     * 当前位置描述
     */
    private String currentLocation;
}
