package com.powerinspection.controller;

import com.powerinspection.service.SftpService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/remote-import")
@CrossOrigin(origins = "*")
public class RemoteImportController {

    private static final Logger logger = LoggerFactory.getLogger(RemoteImportController.class);

    @Autowired
    private SftpService sftpService;

    @Value("${sftp.remote.path}")
    private String remotePath;

    @GetMapping("/folders")
    public ResponseEntity<Map<String, Object>> getFolders() {
        logger.info("获取远程文件夹列表");
        try {
            if (!sftpService.isConnected()) {
                sftpService.connect();
            }
            List<String> files = sftpService.listFiles(remotePath);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "folders", files,
                "remotePath", remotePath
            ));
        } catch (Exception e) {
            logger.error("获取远程文件夹失败: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getConnectionStatus() {
        logger.info("检查SFTP连接状态");
        boolean connected = sftpService.isConnected();
        return ResponseEntity.ok(Map.of(
            "connected", connected,
            "remotePath", remotePath
        ));
    }

    @PostMapping("/connect")
    public ResponseEntity<Map<String, Object>> connect() {
        logger.info("手动连接SFTP");
        try {
            sftpService.connect();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "SFTP连接成功"
            ));
        } catch (Exception e) {
            logger.error("SFTP连接失败: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/disconnect")
    public ResponseEntity<Map<String, Object>> disconnect() {
        logger.info("断开SFTP连接");
        try {
            sftpService.disconnect();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "SFTP已断开"
            ));
        } catch (Exception e) {
            logger.error("断开SFTP失败: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
}

