package com.powerinspection.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * 检测结果 DTO - 对应远程服务器的 meta.json 格式
 */
public class DetectionResult {
    @JsonProperty("incident_id")
    private String incidentId;
    
    private Double timestamp;
    
    @JsonProperty("timestamp_str")
    private String timestampStr;
    
    @JsonProperty("device_id")
    private String deviceId;
    
    // location 可以是字符串或对象
    private String location;
    
    @JsonProperty("drone_id")
    private String droneId;
    
    private Boolean detected;
    
    private List<DefectDetection> defects;
    
    @JsonProperty("inference_time_ms")
    private Double inferenceTimeMs;
    
    private ImageData rgb;
    private ImageData ir;
    
    // 用于兼容旧格式
    private String imageBase64;

    /**
     * 图像数据（RGB 或 IR）
     */
    public static class ImageData {
        @JsonProperty("image_path")
        private String imagePath;
        
        private Integer width;
        private Integer height;
        private List<Detection> detections;

        // Getters and Setters
        public String getImagePath() {
            return imagePath;
        }

        public void setImagePath(String imagePath) {
            this.imagePath = imagePath;
        }

        public Integer getWidth() {
            return width;
        }

        public void setWidth(Integer width) {
            this.width = width;
        }

        public Integer getHeight() {
            return height;
        }

        public void setHeight(Integer height) {
            this.height = height;
        }

        public List<Detection> getDetections() {
            return detections;
        }

        public void setDetections(List<Detection> detections) {
            this.detections = detections;
        }
    }

    /**
     * 位置信息
     */
    public static class LocationInfo {
        private Double latitude;
        private Double longitude;
        private Double altitude;

        // Getters and Setters
        public Double getLatitude() {
            return latitude;
        }

        public void setLatitude(Double latitude) {
            this.latitude = latitude;
        }

        public Double getLongitude() {
            return longitude;
        }

        public void setLongitude(Double longitude) {
            this.longitude = longitude;
        }

        public Double getAltitude() {
            return altitude;
        }

        public void setAltitude(Double altitude) {
            this.altitude = altitude;
        }
    }

    /**
     * 缺陷检测结果
     */
    public static class DefectDetection {
        private String type;
        private String description;
        private Double confidence;
        private List<Double> bbox;

        // Getters and Setters
        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public Double getConfidence() {
            return confidence;
        }

        public void setConfidence(Double confidence) {
            this.confidence = confidence;
        }

        public List<Double> getBbox() {
            return bbox;
        }

        public void setBbox(List<Double> bbox) {
            this.bbox = bbox;
        }
    }

    /**
     * 单个检测结果（用于图像检测）
     */
    public static class Detection {
        @JsonProperty("class_id")
        private Integer classId;
        
        @JsonProperty("class_name")
        private String className;
        
        private Double score;
        private List<Double> bbox;

        // Getters and Setters
        public Integer getClassId() {
            return classId;
        }

        public void setClassId(Integer classId) {
            this.classId = classId;
        }

        public String getClassName() {
            return className;
        }

        public void setClassName(String className) {
            this.className = className;
        }

        public Double getScore() {
            return score;
        }

        public void setScore(Double score) {
            this.score = score;
        }

        public List<Double> getBbox() {
            return bbox;
        }

        public void setBbox(List<Double> bbox) {
            this.bbox = bbox;
        }
    }

    // Getters and Setters
    public String getIncidentId() {
        return incidentId;
    }

    public void setIncidentId(String incidentId) {
        this.incidentId = incidentId;
    }

    public Double getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Double timestamp) {
        this.timestamp = timestamp;
    }

    public String getTimestampStr() {
        return timestampStr;
    }

    public void setTimestampStr(String timestampStr) {
        this.timestampStr = timestampStr;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public ImageData getRgb() {
        return rgb;
    }

    public void setRgb(ImageData rgb) {
        this.rgb = rgb;
    }

    public ImageData getIr() {
        return ir;
    }

    public void setIr(ImageData ir) {
        this.ir = ir;
    }

    public String getImageBase64() {
        return imageBase64;
    }

    public void setImageBase64(String imageBase64) {
        this.imageBase64 = imageBase64;
    }

    public String getDroneId() {
        return droneId;
    }

    public void setDroneId(String droneId) {
        this.droneId = droneId;
    }

    public Boolean isDetected() {
        return detected;
    }

    public void setDetected(Boolean detected) {
        this.detected = detected;
    }

    public List<DefectDetection> getDefects() {
        return defects;
    }

    public void setDefects(List<DefectDetection> defects) {
        this.defects = defects;
    }

    public Double getInferenceTimeMs() {
        return inferenceTimeMs;
    }

    public void setInferenceTimeMs(Double inferenceTimeMs) {
        this.inferenceTimeMs = inferenceTimeMs;
    }
}
