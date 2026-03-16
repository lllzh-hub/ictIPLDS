package com.powerinspection.controller;

import com.powerinspection.service.AIService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AIController {

    private static final Logger logger = LoggerFactory.getLogger(AIController.class);

    @Autowired
    private AIService aiService;

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, String>> analyzeDefect(@RequestBody Map<String, Object> request) {
        try {
            String taskInfo = (String) request.get("taskInfo");
            logger.info("接收到AI分析请求，来源IP: {}", getClientIp(request));
            logger.debug("请求内容: {}", taskInfo);
            
            String fullAnalysis = aiService.analyzeDefect(taskInfo);
            
            // 分离 AI 分析和解决方案
            String analysis = fullAnalysis;
            String solution = "";
            
            if (fullAnalysis.contains("---SOLUTION_SPLIT---")) {
                String[] parts = fullAnalysis.split("---SOLUTION_SPLIT---");
                analysis = parts[0].trim();
                solution = parts.length > 1 ? parts[1].trim() : "";
            }
            
            logger.info("AI分析成功完成");
            return ResponseEntity.ok(Map.of(
                "analysis", analysis,
                "solution", solution
            ));
        } catch (Exception e) {
            logger.error("AI分析失败: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "AI 分析失败: " + e.getMessage()));
        }
    }
    
    private String getClientIp(Map<String, Object> request) {
        // 简单返回标识，实际可以从HttpServletRequest获取
        return "client";
    }
}


