package com.powerinspection.controller;

import com.powerinspection.entity.Defect;
import com.powerinspection.service.DefectService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;

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
        logger.info("创建新缺陷: {}", defect.getType());
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

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importDefects(@RequestBody Map<String, Object> detectionResult) {
        logger.info("导入检测结果数据");
        try {
            List<Defect> importedDefects = new ArrayList<>();
            
            // 获取 defects 数组
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> defectsList = (List<Map<String, Object>>) detectionResult.get("defects");
            
            if (defectsList != null) {
                String imageBase64 = (String) detectionResult.get("image_base64");
                
                for (Map<String, Object> defectData : defectsList) {
                    Defect defect = new Defect();
                    defect.setType((String) defectData.get("type"));
                    defect.setDescription((String) defectData.get("description"));
                    defect.setLocation((String) detectionResult.get("location"));
                    defect.setStatus("pending");
                    defect.setSeverity("medium");
                    
                    // 处理置信度
                    Object confidenceObj = defectData.get("confidence");
                    if (confidenceObj != null) {
                        if (confidenceObj instanceof Number) {
                            defect.setConfidence(((Number) confidenceObj).doubleValue());
                        }
                    }
                    
                    // 设置图片
                    if (imageBase64 != null) {
                        defect.setOriginalImage(imageBase64);
                    }
                    
                    Defect savedDefect = defectService.createDefect(defect);
                    importedDefects.add(savedDefect);
                }
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "count", importedDefects.size(),
                "message", "成功导入 " + importedDefects.size() + " 条缺陷记录",
                "defects", importedDefects
            ));
        } catch (Exception e) {
            logger.error("导入失败: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "count", 0,
                "message", "导入失败: " + e.getMessage()
            ));
        }
    }
}

