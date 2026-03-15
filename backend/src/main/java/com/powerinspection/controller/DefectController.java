package com.powerinspection.controller;

import com.powerinspection.entity.Defect;
import com.powerinspection.service.DefectService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/defects")
@CrossOrigin(origins = "*")
public class DefectController {

    private static final Logger logger = LoggerFactory.getLogger(DefectController.class);

    @Autowired
    private DefectService defectService;

    @GetMapping
    public ResponseEntity<List<Defect>> getAllDefects() {
        logger.info("获取所有缺陷列表");
        List<Defect> defects = defectService.getAllDefects();
        return ResponseEntity.ok(defects);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Defect> getDefectById(@PathVariable Long id) {
        logger.info("获取缺陷详情，ID: {}", id);
        return defectService.getDefectById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Defect>> getDefectsByStatus(@PathVariable String status) {
        logger.info("根据状态获取缺陷列表: {}", status);
        List<Defect> defects = defectService.getDefectsByStatus(status);
        return ResponseEntity.ok(defects);
    }

    @GetMapping("/severity/{severity}")
    public ResponseEntity<List<Defect>> getDefectsBySeverity(@PathVariable String severity) {
        logger.info("根据严重程度获取缺陷列表: {}", severity);
        List<Defect> defects = defectService.getDefectsBySeverity(severity);
        return ResponseEntity.ok(defects);
    }

    @GetMapping("/location/{location}")
    public ResponseEntity<List<Defect>> getDefectsByLocation(@PathVariable String location) {
        logger.info("根据位置获取缺陷列表: {}", location);
        List<Defect> defects = defectService.getDefectsByLocation(location);
        return ResponseEntity.ok(defects);
    }

    @PostMapping
    public ResponseEntity<Defect> createDefect(@RequestBody Defect defect) {
        logger.info("创建新缺陷: {}", defect.getDefectName());
        Defect createdDefect = defectService.createDefect(defect);
        return ResponseEntity.ok(createdDefect);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Defect> updateDefect(@PathVariable Long id, @RequestBody Defect defect) {
        logger.info("更新缺陷信息，ID: {}", id);
        try {
            Defect updatedDefect = defectService.updateDefect(id, defect);
            return ResponseEntity.ok(updatedDefect);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDefect(@PathVariable Long id) {
        logger.info("删除缺陷，ID: {}", id);
        defectService.deleteDefect(id);
        return ResponseEntity.noContent().build();
    }
}

