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
import java.util.HashMap;
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
    public ResponseEntity<Map<String, Object>> analyzeDefect(@RequestBody Map<String, Object> request) {
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

            // 检测是否为误判：只识别 AI 明确输出的 [VERDICT:FALSE_POSITIVE] 标记
            boolean isFalsePositive = detectFalsePositive(analysis);
            // 从 analysis 中移除 verdict 标记行，避免显示在前端
            analysis = analysis.replaceAll("(?m)^\\[VERDICT:(FALSE_POSITIVE|DEFECT_CONFIRMED)\\]\\s*\n?", "").trim();
            logger.info("AI分析成功完成，误判={}", isFalsePositive);

            // 如果传入了 defectId，将误判标记持久化到数据库
            if (defectIdObj != null && isFalsePositive) {
                try {
                    Long defectId = Long.parseLong(defectIdObj.toString());
                    Optional<Defect> defectOpt = defectService.getDefectById(defectId);
                    if (defectOpt.isPresent()) {
                        Defect defect = defectOpt.get();
                        defect.setIsFalsePositive(true);
                        defectService.updateDefect(defectId, defect);
                        logger.info("已将缺陷 {} 标记为误判", defectId);
                    }
                } catch (NumberFormatException e) {
                    logger.warn("无效的 defectId: {}", defectIdObj);
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("analysis", analysis);
            result.put("solution", solution);
            result.put("isFalsePositive", isFalsePositive);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("AI分析失败: {}", e.getMessage(), e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("error", "AI 分析失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResult);
        }
    }

    /**
     * 判断 AI 分析结果中是否包含误判结论。
     * 只识别 AI 明确输出的 [VERDICT:FALSE_POSITIVE] 标记，避免误匹配正常分析中的"误判"词语。
     */
    private boolean detectFalsePositive(String analysis) {
        if (analysis == null || analysis.isBlank()) return false;
        return analysis.contains("[VERDICT:FALSE_POSITIVE]");
    }
}
