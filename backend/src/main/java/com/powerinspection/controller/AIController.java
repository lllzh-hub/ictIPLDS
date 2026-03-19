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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

            List<String> base64Images = new ArrayList<>();
            List<String> imagePaths = new ArrayList<>();

            if (defectIdObj != null) {
                try {
                    Long defectId = Long.parseLong(defectIdObj.toString());
                    Optional<Defect> defectOpt = defectService.getDefectById(defectId);
                    if (defectOpt.isPresent()) {
                        Defect defect = defectOpt.get();

                        // 优先从数据库字段直接提取 Base64 图片
                        extractBase64FromField(defect.getOriginalImage(), "原始图", base64Images);
                        extractBase64FromField(defect.getThermalImage(), "红外图", base64Images);

                        // 如果数据库字段没有 Base64，回退到本地文件路径
                        if (base64Images.isEmpty()) {
                            if (defect.getImagePath() != null && new File(defect.getImagePath()).exists()) {
                                imagePaths.add(defect.getImagePath());
                                logger.info("回退：附加本地原图: {}", defect.getImagePath());
                            }
                            if (defect.getThermalImage() != null && defect.getThermalImage().startsWith("/api/images/")) {
                                String thermalFilename = defect.getThermalImage().replace("/api/images/", "");
                                String thermalLocalPath = importFolder + "/" + thermalFilename;
                                if (new File(thermalLocalPath).exists()) {
                                    imagePaths.add(thermalLocalPath);
                                    logger.info("回退：附加本地红外图: {}", thermalLocalPath);
                                }
                            }
                        }

                        // 构建 taskInfo
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

            String fullAnalysis;
            if (!base64Images.isEmpty()) {
                logger.info("使用数据库 Base64 图片进行多模态分析，图片数量: {}", base64Images.size());
                fullAnalysis = aiService.analyzeDefectWithBase64Images(taskInfo, base64Images);
            } else if (!imagePaths.isEmpty()) {
                logger.info("使用本地文件路径进行多模态分析，图片数量: {}", imagePaths.size());
                fullAnalysis = aiService.analyzeDefectWithImages(taskInfo, imagePaths);
            } else {
                logger.warn("未找到任何图片，使用纯文字模式");
                fullAnalysis = aiService.analyzeDefect(taskInfo);
            }

            // 提取并移除 META_JSON（用于误检类型与趋势发展图）
            MetaExtract metaExtract = extractMetaJson(fullAnalysis);
            String fullAnalysisWithoutMeta = metaExtract.cleanedText;

            // 分离 AI 分析和解决方案
            String analysis = fullAnalysisWithoutMeta;
            String solution = "";
            if (fullAnalysisWithoutMeta.contains("---SOLUTION_SPLIT---")) {
                String[] parts = fullAnalysisWithoutMeta.split("---SOLUTION_SPLIT---");
                analysis = parts[0].trim();
                solution = parts.length > 1 ? parts[1].trim() : "";
            }

            boolean isFalsePositive = detectFalsePositive(analysis);
            analysis = analysis.replaceAll("(?m)^\\[VERDICT:(FALSE_POSITIVE|DEFECT_CONFIRMED)\\]\\s*\n?", "").trim();
            logger.info("AI分析成功完成，误判={}", isFalsePositive);

            // 无论是否误判，都将清理后的 analysis/solution 持久化到数据库
            if (defectIdObj != null) {
                try {
                    Long defectId = Long.parseLong(defectIdObj.toString());
                    Optional<Defect> defectOpt = defectService.getDefectById(defectId);
                    if (defectOpt.isPresent()) {
                        Defect defect = defectOpt.get();
                        defect.setAiTextAnalysis(analysis);
                        defect.setAiTextSolution(solution);
                        if (isFalsePositive) {
                            defect.setIsFalsePositive(true);
                        }
                        if (metaExtract.misdetectionType != null && !metaExtract.misdetectionType.isBlank()) {
                            defect.setMisdetectionType(metaExtract.misdetectionType);
                        }
                        if (metaExtract.severityTimelineJson != null && !metaExtract.severityTimelineJson.isBlank()) {
                            defect.setSeverityTimeline(metaExtract.severityTimelineJson);
                        }
                        defectService.updateDefect(defectId, defect);
                        logger.info("已持久化AI分析结果到缺陷 {}，误判={}", defectId, isFalsePositive);
                    }
                } catch (NumberFormatException e) {
                    logger.warn("无效的 defectId: {}", defectIdObj);
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("analysis", analysis);
            result.put("solution", solution);
            result.put("isFalsePositive", isFalsePositive);
            result.put("misdetectionType", metaExtract.misdetectionType);
            result.put("severityTimeline", metaExtract.severityTimelineJson);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("AI分析失败: {}", e.getMessage(), e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("error", "AI 分析失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResult);
        }
    }

    /**
     * 从数据库图片字段提取 Base64 字符串。
     * 支持三种格式：
     * 1. data:image/jpeg;base64,/9j/...  (data URL)
     * 2. /9j/... 纯 Base64
     * 3. /api/images/filename.jpg（URL格式，跳过）
     */
    private void extractBase64FromField(String fieldValue, String label, List<String> base64Images) {
        if (fieldValue == null || fieldValue.isBlank()) return;

        if (fieldValue.startsWith("data:image")) {
            base64Images.add(fieldValue);
            logger.info("从数据库提取{}（data URL格式），长度: {} chars", label, fieldValue.length());
        } else if (!fieldValue.startsWith("/") && !fieldValue.startsWith("http") && fieldValue.length() > 100) {
            // 纯 Base64：JPEG 以 /9j/ 开头，PNG 以 iVBOR 开头
            String mimeType = fieldValue.startsWith("iVBOR") ? "image/png" : "image/jpeg";
            base64Images.add("data:" + mimeType + ";base64," + fieldValue);
            logger.info("从数据库提取{}（纯Base64格式），长度: {} chars", label, fieldValue.length());
        } else {
            logger.debug("{}字段为URL格式，跳过Base64提取: {}", label,
                fieldValue.substring(0, Math.min(50, fieldValue.length())));
        }
    }

    private boolean detectFalsePositive(String analysis) {
        if (analysis == null || analysis.isBlank()) return false;
        return analysis.contains("[VERDICT:FALSE_POSITIVE]");
    }

    private static class MetaExtract {
        final String cleanedText;
        final String misdetectionType;
        final String severityTimelineJson;

        MetaExtract(String cleanedText, String misdetectionType, String severityTimelineJson) {
            this.cleanedText = cleanedText;
            this.misdetectionType = misdetectionType;
            this.severityTimelineJson = severityTimelineJson;
        }
    }

    /**
     * 从千问输出中提取 ---META_JSON--- 后的 JSON，并从原文移除该段，避免影响前端展示。
     * 这里不做完整JSON解析（避免引入额外依赖），只做字段的轻量提取与trend数组原样保存。
     */
    private MetaExtract extractMetaJson(String text) {
        if (text == null) return new MetaExtract("", null, null);

        int idx = text.indexOf("---META_JSON---");
        if (idx < 0) return new MetaExtract(text, null, null);

        String before = text.substring(0, idx).trim();
        String after = text.substring(idx + "---META_JSON---".length()).trim();

        // 尝试截取一个JSON对象（从第一个 { 到最后一个 }）
        int l = after.indexOf('{');
        int r = after.lastIndexOf('}');
        if (l < 0 || r < 0 || r <= l) {
            return new MetaExtract(before, null, null);
        }

        String json = after.substring(l, r + 1);

        String misdetectionType = null;
        String trendJson = null;

        try {
            Pattern pType = Pattern.compile("\"misdetectionType\"\\s*:\\s*\"([^\"]+)\"");
            Matcher mType = pType.matcher(json);
            if (mType.find()) {
                misdetectionType = mType.group(1);
            }

            // 提取 trend 数组原样（保存为 JSON 字符串）
            Pattern pTrend = Pattern.compile("\"trend\"\\s*:\\s*(\\[[\\s\\S]*?\\])");
            Matcher mTrend = pTrend.matcher(json);
            if (mTrend.find()) {
                trendJson = mTrend.group(1).trim();
            }
        } catch (Exception e) {
            logger.warn("解析 META_JSON 失败: {}", e.getMessage());
        }

        return new MetaExtract(before, misdetectionType, trendJson);
    }
}