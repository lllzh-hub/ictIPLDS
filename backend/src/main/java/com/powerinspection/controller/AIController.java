package com.powerinspection.controller;

import com.powerinspection.entity.Defect;
import com.powerinspection.service.AIService;
import com.powerinspection.service.DefectService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AIController {

    private static final Logger logger = LoggerFactory.getLogger(AIController.class);

    @Autowired
    private AIService aiService;

    @Autowired
    private DefectService defectService;

    @Value("${defect.import.folder:D:/Desktop/example_responses}")
    private String importFolder;

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, String>> analyzeDefect(@RequestBody Map<String, Object> request) {
        try {
            String taskInfo = (String) request.get("taskInfo");
            Object defectIdObj = request.get("defectId");
            logger.info("接收到AI分析请求，defectId={}", defectIdObj);

            List<String> imagePaths = new ArrayList<>();

            // 如果传入了 defectId，从数据库读取图片路径
            if (defectIdObj != null) {
                try {
                    Long defectId = Long.parseLong(defectIdObj.toString());
                    Optional<Defect> defectOpt = defectService.getDefectById(defectId);
                    if (defectOpt.isPresent()) {
                        Defect defect = defectOpt.get();

                        // 优先使用 imagePath（本地绝对路径）
                        if (defect.getImagePath() != null && new File(defect.getImagePath()).exists()) {
                            imagePaths.add(defect.getImagePath());
                            logger.info("附加原图: {}", defect.getImagePath());
                        }

                        // 尝试从 thermalImage URL 推断红外图本地路径
                        if (defect.getThermalImage() != null && defect.getThermalImage().startsWith("/api/images/")) {
                            String thermalFilename = defect.getThermalImage().replace("/api/images/", "");
                            String thermalLocalPath = importFolder + "/" + thermalFilename;
                            if (new File(thermalLocalPath).exists()) {
                                imagePaths.add(thermalLocalPath);
                                logger.info("附加红外图: {}", thermalLocalPath);
                            }
                        }

                        // 如果 taskInfo 为空，自动构建
                        if (taskInfo == null || taskInfo.isBlank()) {
                            StringBuilder sb = new StringBuilder();
                            sb.append("检测模型识别结果：\n");
                            sb.append("缺陷类型: ").append(defect.getType()).append("\n");
                            sb.append("位置: ").append(defect.getLocation()).append("\n");
                            sb.append("严重程度: ").append(defect.getSeverity()).append("\n");
                            if (defect.getConfidence() != null) {
                                sb.append("置信度: ").append(String.format("%.1f%%", defect.getConfidence() * 100)).append("\n");
                            }
                            if (defect.getAiAnalysis() != null) {
                                sb.append("原图检测框: ").append(defect.getAiAnalysis()).append("\n");
                            }
                            if (defect.getSolution() != null) {
                                sb.append("红外检测框: ").append(defect.getSolution()).append("\n");
                            }
                            sb.append("\n请结合上方图片，独立判断是否存在真实缺陷，并给出完整分析。");
                            taskInfo = sb.toString();
                        }
                    }
                } catch (NumberFormatException e) {
                    logger.warn("无效的 defectId: {}", defectIdObj);
                }
            }

            String fullAnalysis = imagePaths.isEmpty()
                ? aiService.analyzeDefect(taskInfo)
                : aiService.analyzeDefectWithImages(taskInfo, imagePaths);

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
}
