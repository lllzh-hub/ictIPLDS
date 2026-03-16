package com.powerinspection.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/images")
@CrossOrigin(origins = "*")
public class ImageController {

    private static final Logger logger = LoggerFactory.getLogger(ImageController.class);

    @Value("${defect.import.folder:D:/Desktop/example_responses}")
    private String importFolder;

    @GetMapping("/{filename}")
    public ResponseEntity<byte[]> getImage(@PathVariable String filename) {
        try {
            logger.info("获取图片: {}", filename);
            
            // 防止路径遍历攻击
            if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
                logger.warn("非法文件名: {}", filename);
                return ResponseEntity.badRequest().build();
            }
            
            Path imagePath = Paths.get(importFolder, filename);
            File imageFile = imagePath.toFile();
            
            if (!imageFile.exists()) {
                logger.warn("文件不存在: {}", imagePath);
                return ResponseEntity.notFound().build();
            }
            
            byte[] imageBytes = Files.readAllBytes(imagePath);
            
            // 根据文件扩展名设置 Content-Type
            String contentType = "image/jpeg";
            if (filename.endsWith(".png")) {
                contentType = "image/png";
            } else if (filename.endsWith(".gif")) {
                contentType = "image/gif";
            }
            
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(imageBytes.length))
                .body(imageBytes);
        } catch (Exception e) {
            logger.error("获取图片失败: {}", filename, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}

