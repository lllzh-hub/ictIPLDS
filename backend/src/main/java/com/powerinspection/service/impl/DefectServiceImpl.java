package com.powerinspection.service.impl;

import com.powerinspection.entity.Defect;
import com.powerinspection.repository.DefectRepository;
import com.powerinspection.service.DefectService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class DefectServiceImpl implements DefectService {

    @Autowired
    private DefectRepository defectRepository;

    @Override
    public List<Defect> getAllDefects() {
        log.info("获取所有缺陷列表");
        return defectRepository.findAll();
    }

    @Override
    public Optional<Defect> getDefectById(Long id) {
        log.info("获取缺陷详情，ID: {}", id);
        return defectRepository.findById(id);
    }

    @Override
    public List<Defect> getDefectsByStatus(String status) {
        log.info("根据状态获取缺陷列表: {}", status);
        return defectRepository.findByStatus(status);
    }

    @Override
    public List<Defect> getDefectsBySeverity(String severity) {
        log.info("根据严重程度获取缺陷列表: {}", severity);
        return defectRepository.findBySeverity(severity);
    }

    @Override
    public List<Defect> getDefectsByLocation(String location) {
        log.info("根据位置获取缺陷列表: {}", location);
        return defectRepository.findByLocation(location);
    }

    @Override
    public Defect createDefect(Defect defect) {
        log.info("创建新缺陷: {}", defect.getDefectName());
        defect.setCreatedAt(LocalDateTime.now());
        defect.setUpdatedAt(LocalDateTime.now());
        return defectRepository.save(defect);
    }

    @Override
    public Defect updateDefect(Long id, Defect defect) {
        log.info("更新缺陷信息，ID: {}", id);
        return defectRepository.findById(id).map(existingDefect -> {
            if (defect.getDefectName() != null) {
                existingDefect.setDefectName(defect.getDefectName());
            }
            if (defect.getDescription() != null) {
                existingDefect.setDescription(defect.getDescription());
            }
            if (defect.getSeverity() != null) {
                existingDefect.setSeverity(defect.getSeverity());
            }
            if (defect.getStatus() != null) {
                existingDefect.setStatus(defect.getStatus());
            }
            if (defect.getLocation() != null) {
                existingDefect.setLocation(defect.getLocation());
            }
            if (defect.getImagePath() != null) {
                existingDefect.setImagePath(defect.getImagePath());
            }
            existingDefect.setUpdatedAt(LocalDateTime.now());
            return defectRepository.save(existingDefect);
        }).orElseThrow(() -> new RuntimeException("缺陷不存在，ID: " + id));
    }

    @Override
    public void deleteDefect(Long id) {
        log.info("删除缺陷，ID: {}", id);
        defectRepository.deleteById(id);
    }
}

