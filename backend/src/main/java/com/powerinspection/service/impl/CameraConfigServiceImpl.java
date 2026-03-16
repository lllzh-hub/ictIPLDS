package com.powerinspection.service.impl;

import com.powerinspection.entity.CameraConfig;
import com.powerinspection.repository.CameraConfigRepository;
import com.powerinspection.service.CameraConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CameraConfigServiceImpl implements CameraConfigService {
    
    @Autowired
    private CameraConfigRepository cameraConfigRepository;
    
    @Override
    public List<CameraConfig> getAllCameraConfigs() {
        return cameraConfigRepository.findAll();
    }
    
    @Override
    public Optional<CameraConfig> getCameraConfigByUavId(String uavId) {
        return cameraConfigRepository.findByUavId(uavId);
    }
    
    @Override
    public CameraConfig createCameraConfig(CameraConfig cameraConfig) {
        return cameraConfigRepository.save(cameraConfig);
    }
    
    @Override
    public CameraConfig updateCameraConfig(Long id, CameraConfig cameraConfig) {
        Optional<CameraConfig> existing = cameraConfigRepository.findById(id);
        if (existing.isPresent()) {
            CameraConfig config = existing.get();
            if (cameraConfig.getUavId() != null) {
                config.setUavId(cameraConfig.getUavId());
            }
            if (cameraConfig.getCameraUrl() != null) {
                config.setCameraUrl(cameraConfig.getCameraUrl());
            }
            if (cameraConfig.getType() != null) {
                config.setType(cameraConfig.getType());
            }
            if (cameraConfig.getDescription() != null) {
                config.setDescription(cameraConfig.getDescription());
            }
            return cameraConfigRepository.save(config);
        }
        return null;
    }
    
    @Override
    public void deleteCameraConfig(Long id) {
        cameraConfigRepository.deleteById(id);
    }
    
    @Override
    public void deleteCameraConfigByUavId(String uavId) {
        Optional<CameraConfig> config = cameraConfigRepository.findByUavId(uavId);
        config.ifPresent(c -> cameraConfigRepository.delete(c));
    }
}
