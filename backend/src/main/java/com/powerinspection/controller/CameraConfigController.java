package com.powerinspection.controller;

import com.powerinspection.entity.CameraConfig;
import com.powerinspection.service.CameraConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/camera-config")
@CrossOrigin(origins = "*", maxAge = 3600)
public class CameraConfigController {
    
    @Autowired
    private CameraConfigService cameraConfigService;
    
    /**
     * 获取所有摄像头配置
     */
    @GetMapping
    public ResponseEntity<List<CameraConfig>> getAllCameraConfigs() {
        List<CameraConfig> configs = cameraConfigService.getAllCameraConfigs();
        return ResponseEntity.ok(configs);
    }
    
    /**
     * 根据无人机ID获取摄像头配置
     */
    @GetMapping("/{uavId}")
    public ResponseEntity<CameraConfig> getCameraConfigByUavId(@PathVariable String uavId) {
        Optional<CameraConfig> config = cameraConfigService.getCameraConfigByUavId(uavId);
        return config.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    /**
     * 创建摄像头配置
     */
    @PostMapping
    public ResponseEntity<CameraConfig> createCameraConfig(@RequestBody CameraConfig cameraConfig) {
        CameraConfig created = cameraConfigService.createCameraConfig(cameraConfig);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    
    /**
     * 更新摄像头配置
     */
    @PutMapping("/{id}")
    public ResponseEntity<CameraConfig> updateCameraConfig(
            @PathVariable Long id,
            @RequestBody CameraConfig cameraConfig) {
        CameraConfig updated = cameraConfigService.updateCameraConfig(id, cameraConfig);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }
    
    /**
     * 删除摄像头配置
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCameraConfig(@PathVariable Long id) {
        cameraConfigService.deleteCameraConfig(id);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * 根据无人机ID删除摄像头配置
     */
    @DeleteMapping("/uav/{uavId}")
    public ResponseEntity<Void> deleteCameraConfigByUavId(@PathVariable String uavId) {
        cameraConfigService.deleteCameraConfigByUavId(uavId);
        return ResponseEntity.noContent().build();
    }
}
