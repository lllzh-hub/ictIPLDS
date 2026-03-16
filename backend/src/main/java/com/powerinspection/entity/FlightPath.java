package com.powerinspection.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "flight_paths")
public class FlightPath {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String droneId;
    
    @Column(nullable = false)
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    // 存储GeoJSON格式的航线数据
    @Column(columnDefinition = "TEXT", nullable = false)
    private String pathData;
    
    // 航线配置参数
    private Integer spacing;  // 航线间距（米）
    private String direction;  // 扫描方向：horizontal/vertical
    private Integer flightHeight;  // 飞行高度（米）
    
    // 起飞点
    private Double startLat;
    private Double startLon;
    
    // 降落点（可选）
    private Double endLat;
    private Double endLon;
    
    // 航线统计信息
    private Integer waypointCount;  // 航点数量
    private Double totalLength;  // 总长度（米）
    
    @Enumerated(EnumType.STRING)
    private PathStatus status;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = PathStatus.DRAFT;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public enum PathStatus {
        DRAFT,      // 草稿
        ACTIVE,     // 激活
        COMPLETED,  // 已完成
        ARCHIVED    // 已归档
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDroneId() {
        return droneId;
    }

    public void setDroneId(String droneId) {
        this.droneId = droneId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPathData() {
        return pathData;
    }

    public void setPathData(String pathData) {
        this.pathData = pathData;
    }

    public Integer getSpacing() {
        return spacing;
    }

    public void setSpacing(Integer spacing) {
        this.spacing = spacing;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public Integer getFlightHeight() {
        return flightHeight;
    }

    public void setFlightHeight(Integer flightHeight) {
        this.flightHeight = flightHeight;
    }

    public Double getStartLat() {
        return startLat;
    }

    public void setStartLat(Double startLat) {
        this.startLat = startLat;
    }

    public Double getStartLon() {
        return startLon;
    }

    public void setStartLon(Double startLon) {
        this.startLon = startLon;
    }

    public Double getEndLat() {
        return endLat;
    }

    public void setEndLat(Double endLat) {
        this.endLat = endLat;
    }

    public Double getEndLon() {
        return endLon;
    }

    public void setEndLon(Double endLon) {
        this.endLon = endLon;
    }

    public Integer getWaypointCount() {
        return waypointCount;
    }

    public void setWaypointCount(Integer waypointCount) {
        this.waypointCount = waypointCount;
    }

    public Double getTotalLength() {
        return totalLength;
    }

    public void setTotalLength(Double totalLength) {
        this.totalLength = totalLength;
    }

    public PathStatus getStatus() {
        return status;
    }

    public void setStatus(PathStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

