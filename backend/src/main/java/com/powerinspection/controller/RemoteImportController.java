package com.powerinspection.controller;

import com.powerinspection.service.SftpService;
import com.powerinspection.service.RemoteImportService;
import com.powerinspection.entity.Defect;
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

    @Autowired
    private RemoteImportService remoteImportService;

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

    @PostMapping("/folder/{folderName}")
    public ResponseEntity<Map<String, Object>> importFolder(@PathVariable String folderName) {
        logger.info("导入远程文件夹: {}", folderName);
        try {
            List<Defect> importedDefects = remoteImportService.importFromFolder(folderName);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "文件夹导入成功，共导入 " + importedDefects.size() + " 条记录",
                "folder", folderName,
                "count", importedDefects.size(),
                "defects", importedDefects
            ));
        } catch (Exception e) {
            logger.error("导入文件夹失败: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/all")
    public ResponseEntity<Map<String, Object>> importAll() {
        logger.info("导入所有远程数据");
        try {
            List<Defect> importedDefects = remoteImportService.importFromAllFolders();
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "所有数据导入成功，共导入 " + importedDefects.size() + " 条记录",
                "count", importedDefects.size(),
                "defects", importedDefects
            ));
        } catch (Exception e) {
            logger.error("导入所有数据失败: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
}

