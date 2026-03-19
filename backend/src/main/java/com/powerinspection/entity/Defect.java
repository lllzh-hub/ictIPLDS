package com.powerinspection.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "defects")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Defect {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String type;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String severity;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String location;

    @Column(name = "confidence")
    private Double confidence;

    @Column(name = "original_image", columnDefinition = "LONGTEXT")
    private String originalImage;

    @Column(name = "detection_image", columnDefinition = "LONGTEXT")
    private String detectionImage;

    @Column(name = "thermal_image", columnDefinition = "LONGTEXT")
    private String thermalImage;

    @Column(name = "ai_analysis", columnDefinition = "TEXT")
    private String aiAnalysis;

    @Column(name = "solution", columnDefinition = "TEXT")
    private String solution;

    @Column(name = "ai_text_analysis", columnDefinition = "TEXT")
    private String aiTextAnalysis;

    @Column(name = "ai_text_solution", columnDefinition = "TEXT")
    private String aiTextSolution;

    @Column(name = "image_path")
    private String imagePath;

    @Column(name = "is_false_positive")
    private Boolean isFalsePositive;

    /** 误检类型：如“无缺陷检测为有缺陷 / 缺陷识别类别出错 / 定位框偏移”等 */
    @Column(name = "misdetection_type", columnDefinition = "TEXT")
    private String misdetectionType;

    /**
     * 趋势发展数据（JSON字符串），示例：
     * [{"tYears":0,"severity":"low"},{"tYears":1,"severity":"medium"},{"tYears":2,"severity":"high"}]
     */
    @Column(name = "severity_timeline", columnDefinition = "TEXT")
    private String severityTimeline;

    /** 千问建议处理时限，如"立即处理"、"24小时内"、"72小时内"、"7天内"、"30天内" */
    @Column(name = "suggested_deadline")
    private String suggestedDeadline;

    @Column(name = "detected_at")
    private LocalDateTime detectedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (detectedAt == null) {
            detectedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

