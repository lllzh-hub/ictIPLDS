package com.powerinspection.service;

import com.powerinspection.entity.CameraConfig;

import java.util.List;
import java.util.Optional;

public interface CameraConfigService {
    List<CameraConfig> getAllCameraConfigs();
    Optional<CameraConfig> getCameraConfigByUavId(String uavId);
    CameraConfig createCameraConfig(CameraConfig cameraConfig);
    CameraConfig updateCameraConfig(Long id, CameraConfig cameraConfig);
    void deleteCameraConfig(Long id);
    void deleteCameraConfigByUavId(String uavId);
}
