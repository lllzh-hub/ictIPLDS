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

