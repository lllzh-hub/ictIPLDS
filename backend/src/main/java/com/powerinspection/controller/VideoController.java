package com.powerinspection.controller;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/video")
@CrossOrigin(origins = "*")
public class VideoController {

    private static final Logger logger = LoggerFactory.getLogger(VideoController.class);
    
    // 尝试多个可能的路径
    private static String getVideoBasePath() {
        String[] possiblePaths = {
            System.getProperty("user.dir") + "/docs",
            System.getProperty("user.dir") + "/../docs",
            "docs",
            "./docs"
        };
        
        for (String path : possiblePaths) {
            File dir = new File(path);
            if (dir.exists() && dir.isDirectory()) {
                logger.info("Found video directory at: {}", dir.getAbsolutePath());
                return dir.getAbsolutePath();
            }
        }
        
        // 如果都找不到，返回第一个路径（会在请求时报错）
        logger.warn("Video directory not found in any expected location");
        return System.getProperty("user.dir") + "/docs";
    }
    
    private static final String VIDEO_BASE_PATH = getVideoBasePath();

    /**
     * 获取无人机视频文件
     * @param filename 视频文件名
     * @return 视频文件资源
     */
    @GetMapping("/stream/{filename}")
    public ResponseEntity<Resource> streamVideo(@PathVariable String filename) {
        try {
            // 安全检查：防止路径遍历攻击
            if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
                logger.warn("Invalid filename: {}", filename);
                return ResponseEntity.badRequest().build();
            }

            Path videoPath = Paths.get(VIDEO_BASE_PATH, filename);
            File videoFile = videoPath.toFile();
            
            logger.info("Requesting video: {} from path: {}", filename, videoFile.getAbsolutePath());

            if (!videoFile.exists()) {
                logger.error("Video file not found: {}", videoFile.getAbsolutePath());
                return ResponseEntity.notFound().build();
            }

            logger.info("Video file found, size: {} bytes", videoFile.length());
            Resource resource = new FileSystemResource(videoFile);
            String contentType = "video/mp4";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .body(resource);

        } catch (Exception e) {
            logger.error("Error streaming video: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 获取视频文件信息
     * @param filename 视频文件名
     * @return 视频文件大小和时长信息
     */
    @GetMapping("/info/{filename}")
    public ResponseEntity<?> getVideoInfo(@PathVariable String filename) {
        try {
            if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
                return ResponseEntity.badRequest().build();
            }

            Path videoPath = Paths.get(VIDEO_BASE_PATH, filename);
            File videoFile = videoPath.toFile();

            if (!videoFile.exists()) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new VideoInfo(
                            filename,
                            videoFile.length(),
                            videoFile.lastModified()
                    ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 视频信息DTO
     */
    public static class VideoInfo {
        public String filename;
        public long size;
        public long lastModified;

        public VideoInfo(String filename, long size, long lastModified) {
            this.filename = filename;
            this.size = size;
            this.lastModified = lastModified;
        }

        public String getFilename() {
            return filename;
        }

        public long getSize() {
            return size;
        }

        public long getLastModified() {
            return lastModified;
        }
    }
}
