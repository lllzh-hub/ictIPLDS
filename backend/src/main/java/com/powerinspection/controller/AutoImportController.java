package com.powerinspection.controller;

import com.powerinspection.service.AutoImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auto-import")
@CrossOrigin(origins = "*")
public class AutoImportController {

    private static final Logger logger = LoggerFactory.getLogger(AutoImportController.class);

    @Autowired
    private AutoImportService autoImportService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        logger.info("获取自动导入状态");
        boolean running = autoImportService.isRunning();
        return ResponseEntity.ok(Map.of(
            "running", running,
            "importedFolders", autoImportService.getImportedFolders()
        ));
    }

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> start() {
        logger.info("启动自动导入");
        try {
            autoImportService.startAutoImport();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "自动导入已启动"
            ));
        } catch (Exception e) {
            logger.error("启动自动导入失败: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/stop")
    public ResponseEntity<Map<String, Object>> stop() {
        logger.info("停止自动导入");
        try {
            autoImportService.stopAutoImport();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "自动导入已停止"
            ));
        } catch (Exception e) {
            logger.error("停止自动导入失败: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/clear")
    public ResponseEntity<Map<String, Object>> clearImportedFolders() {
        logger.info("清空已导入文件夹记录");
        try {
            autoImportService.clearImportedFolders();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "已清空导入记录"
            ));
        } catch (Exception e) {
            logger.error("清空导入记录失败: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
}

