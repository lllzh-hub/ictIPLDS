package com.powerinspection.service.impl;

import com.powerinspection.entity.Defect;
import com.powerinspection.service.RemoteImportService;
import com.powerinspection.service.SftpService;
import com.powerinspection.service.DefectService;
import com.powerinspection.service.AIService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Slf4j
@Service
public class RemoteImportServiceImpl implements RemoteImportService {

    @Autowired
    private SftpService sftpService;

    @Autowired
    private DefectService defectService;

    @Autowired
    private AIService aiService;

    @Value("${sftp.remote.path}")
    private String remotePath;

    @Value("${defect.import.folder:D:/Desktop/example_responses}")
    private String localImportFolder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public List<Defect> importFromFolder(String folderName) {
        log.info("开始导入远程文件夹: {}", folderName);
        List<Defect> importedDefects = new ArrayList<>();

        try {
            // 确保本地导入文件夹存在
            Path localFolder = Paths.get(localImportFolder);
            if (!Files.exists(localFolder)) {
                Files.createDirectories(localFolder);
                log.info("创建本地导入文件夹: {}", localImportFolder);
            }

            if (!sftpService.isConnected()) {
                sftpService.connect();
            }

            String fullRemotePath = remotePath + "/" + folderName;
            log.info("完整远程路径: {}", fullRemotePath);

            // 列出文件夹中的文件
            List<String> files = sftpService.listFiles(fullRemotePath);
            log.info("找到 {} 个文件", files.size());

            // 查找 stream1 和 stream2 的文件
            String stream1JsonFile = null;
            String stream1ImageFile = null;
            String stream2JsonFile = null;
            String stream2ImageFile = null;

            for (String file : files) {
                if (file.contains("stream1") && file.endsWith("_detections.json")) {
                    stream1JsonFile = file;
                } else if (file.contains("stream1") && (file.endsWith(".jpg") || file.endsWith(".png"))) {
                    stream1ImageFile = file;
                } else if (file.contains("stream2") && file.endsWith("_detections.json")) {
                    stream2JsonFile = file;
                } else if (file.contains("stream2") && (file.endsWith(".jpg") || file.endsWith(".png"))) {
                    stream2ImageFile = file;
                }
            }

            log.info("Stream1 - JSON: {}, Image: {}", stream1JsonFile, stream1ImageFile);
            log.info("Stream2 - JSON: {}, Image: {}", stream2JsonFile, stream2ImageFile);

            // 处理 stream1（原始图 + 检测框）
            if (stream1ImageFile != null && stream1JsonFile != null) {
                try {
                    String localStream1ImagePath = localImportFolder + "/" + stream1ImageFile;
                    String localStream1JsonPath = localImportFolder + "/" + stream1JsonFile;
                    
                    sftpService.downloadFile(fullRemotePath + "/" + stream1ImageFile, localStream1ImagePath);
                    sftpService.downloadFile(fullRemotePath + "/" + stream1JsonFile, localStream1JsonPath);
                    log.info("已下载Stream1文件");

                    @SuppressWarnings({"rawtypes", "unchecked"})
                    Map<String, Object> stream1Data = (Map) objectMapper.readValue(new File(localStream1JsonPath), Map.class);
                    log.info("Stream1 JSON数据: {}", stream1Data);
                    
                    // 不转换为 Base64，直接保存文件路径
                    String stream1ImageUrl = "/api/images/" + stream1ImageFile;

                    // 创建缺陷记录
                    Defect defect = new Defect();
                    
                    // 从 detections 数组中提取第一个检测结果
                    String type = "检测缺陷_" + folderName;
                    Double confidence = 0.0;
                    
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> detections = (List<Map<String, Object>>) stream1Data.get("detections");
                    if (detections != null && !detections.isEmpty()) {
                        Map<String, Object> firstDetection = detections.get(0);
                        Object className = firstDetection.get("class_name");
                        if (className != null) {
                            type = className.toString();
                        }
                        Object score = firstDetection.get("score");
                        if (score != null && score instanceof Number) {
                            confidence = ((Number) score).doubleValue();
                        }
                    }
                    
                    defect.setType(type);
                    defect.setDescription((String) stream1Data.getOrDefault("description", ""));
                    defect.setLocation((String) stream1Data.getOrDefault("location", "未知位置"));
                    defect.setSeverity((String) stream1Data.getOrDefault("severity", "medium"));
                    defect.setStatus("pending");
                    defect.setConfidence(confidence);

                    // 图片下载后编码为 Base64 存入数据库，供 AI 多模态分析使用
                    String stream1Base64 = encodeImageToBase64(localStream1ImagePath);
                    String stream1DataUrl = stream1Base64 != null
                        ? "data:image/jpeg;base64," + stream1Base64
                        : stream1ImageUrl;

                    defect.setOriginalImage(stream1DataUrl);   // Base64，供 AI 读取
                    defect.setDetectionImage(stream1ImageUrl); // URL，供前端绘制检测框
                    defect.setImagePath(localStream1ImagePath);
                    
                    // 存储 stream1 的检测数据用于前端绘制框（只存储 detections 数组）
                    if (detections != null) {
                        defect.setAiAnalysis(objectMapper.writeValueAsString(detections));
                    }

                    // 处理 stream2（红外图 + 检测框）
                    if (stream2ImageFile != null && stream2JsonFile != null) {
                        try {
                            String localStream2ImagePath = localImportFolder + "/" + stream2ImageFile;
                            String localStream2JsonPath = localImportFolder + "/" + stream2JsonFile;
                            
                            sftpService.downloadFile(fullRemotePath + "/" + stream2ImageFile, localStream2ImagePath);
                            sftpService.downloadFile(fullRemotePath + "/" + stream2JsonFile, localStream2JsonPath);
                            log.info("已下载Stream2文件");

                            @SuppressWarnings({"rawtypes", "unchecked"})
                            Map<String, Object> stream2Data = (Map) objectMapper.readValue(new File(localStream2JsonPath), Map.class);
                            
                            // 图片下载后编码为 Base64 存入数据库，供 AI 多模态分析使用
                            String stream2Base64 = encodeImageToBase64(localStream2ImagePath);
                            String stream2DataUrl = stream2Base64 != null
                                ? "data:image/jpeg;base64," + stream2Base64
                                : "/api/images/" + stream2ImageFile;

                            defect.setThermalImage(stream2DataUrl); // Base64，供 AI 读取
                            
                            // 存储 stream2 的检测数据用于前端绘制框（只存储 detections 数组）
                            @SuppressWarnings("unchecked")
                            List<Map<String, Object>> stream2Detections = (List<Map<String, Object>>) stream2Data.get("detections");
                            if (stream2Detections != null) {
                                defect.setSolution(objectMapper.writeValueAsString(stream2Detections));
                            }
                        } catch (Exception e) {
                            log.warn("处理Stream2失败: {}", e.getMessage());
                        }
                    }

                    // 自动生成 AI 分析和解决方案（传入图片做多模态分析）
                    try {
                        // 判断是否有真实缺陷
                        boolean hasDefect = detections != null && !detections.isEmpty() &&
                            detections.stream().anyMatch(d -> {
                                Object isDefect = d.get("is_defect");
                                Object score = d.get("score");
                                return (isDefect == null || Boolean.TRUE.equals(isDefect)) &&
                                       (score == null || ((Number) score).doubleValue() >= 0.3);
                            });

                        String taskInfo;
                        if (!hasDefect) {
                            taskInfo = "[无缺陷] 本次检测未发现明显缺陷。\n" +
                                "检测位置: " + defect.getLocation() + "\n" +
                                "检测结果: " + objectMapper.writeValueAsString(detections != null ? detections : List.of());
                        } else {
                            StringBuilder sb = new StringBuilder();
                            sb.append("检测模型识别结果：\n");
                            sb.append("缺陷类型: ").append(defect.getType()).append("\n");
                            sb.append("位置: ").append(defect.getLocation()).append("\n");
                            sb.append("严重程度: ").append(defect.getSeverity()).append("\n");
                            sb.append("置信度: ").append(String.format("%.1f%%", defect.getConfidence() * 100)).append("\n");
                            sb.append("描述: ").append(defect.getDescription() != null ? defect.getDescription() : "无").append("\n");
                            sb.append("原图检测框(stream1): ").append(objectMapper.writeValueAsString(detections)).append("\n");
                            if (defect.getSolution() != null) {
                                sb.append("红外图检测框(stream2): ").append(defect.getSolution()).append("\n");
                            }
                            sb.append("\n请结合上方图片，独立判断是否存在真实缺陷，并给出完整分析。");
                            taskInfo = sb.toString();
                        }

                        // 收集本地图片路径
                        List<String> imagePaths = new java.util.ArrayList<>();
                        if (defect.getImagePath() != null && new java.io.File(defect.getImagePath()).exists()) {
                            imagePaths.add(defect.getImagePath());
                        }
                        // stream2 图片路径
                        if (stream2ImageFile != null) {
                            String stream2LocalPath = localImportFolder + "/" + stream2ImageFile;
                            if (new java.io.File(stream2LocalPath).exists()) {
                                imagePaths.add(stream2LocalPath);
                            }
                        }

                        log.info("正在为缺陷生成 AI 多模态分析，hasDefect={}, 图片数量={}", hasDefect, imagePaths.size());
                        String fullAnalysis = aiService.analyzeDefectWithImages(taskInfo, imagePaths);

                        // 分离 AI 分析和解决方案
                        String analysis = fullAnalysis;
                        String solution = "";
                        if (fullAnalysis.contains("---SOLUTION_SPLIT---")) {
                            String[] parts = fullAnalysis.split("---SOLUTION_SPLIT---");
                            analysis = parts[0].trim();
                            solution = parts.length > 1 ? parts[1].trim() : "";
                        }

                        // 检测误判标记并持久化
                        boolean isFalsePositive = analysis.contains("[VERDICT:FALSE_POSITIVE]");
                        // 清除 VERDICT 标记行，不存入数据库
                        analysis = analysis.replaceAll("(?m)^\\[VERDICT:(FALSE_POSITIVE|DEFECT_CONFIRMED)\\]\\s*\n?", "").trim();

                        defect.setAiTextAnalysis(analysis);
                        defect.setAiTextSolution(solution);
                        if (isFalsePositive) {
                            defect.setIsFalsePositive(true);
                        }
                        // 解析 META_JSON（误检类型 & 趋势发展节点）
                        extractAndSetMeta(defect, fullAnalysis);
                        log.info("AI 多模态分析生成成功，误判={}", isFalsePositive);
                    } catch (Exception e) {
                        log.warn("生成 AI 分析失败: {}", e.getMessage());
                    }

                    // 保存缺陷
                    Defect savedDefect = defectService.createDefect(defect);
                    importedDefects.add(savedDefect);
                    log.info("已保存缺陷记录，ID: {}", savedDefect.getId());
                } catch (Exception e) {
                    log.error("处理Stream1失败: {}", e.getMessage(), e);
                }
            }

        } catch (Exception e) {
            log.error("导入文件夹失败: {}", e.getMessage(), e);
        }

        return importedDefects;
    }

    @Override
    public List<Defect> importFromAllFolders() {
        log.info("开始导入所有远程文件夹");
        List<Defect> allDefects = new ArrayList<>();

        try {
            if (!sftpService.isConnected()) {
                sftpService.connect();
            }

            List<String> folders = sftpService.listFiles(remotePath);
            log.info("找到 {} 个文件夹", folders.size());

            for (String folder : folders) {
                List<Defect> defects = importFromFolder(folder);
                allDefects.addAll(defects);
            }

            log.info("共导入 {} 条缺陷记录", allDefects.size());
        } catch (Exception e) {
            log.error("导入所有文件夹失败: {}", e.getMessage(), e);
        }

        return allDefects;
    }

    /**
     * 将图片文件编码为 Base64 字符串
     */
    private String encodeImageToBase64(String imagePath) {
        try {
            byte[] imageBytes = Files.readAllBytes(Paths.get(imagePath));
            return Base64.getEncoder().encodeToString(imageBytes);
        } catch (IOException e) {
            log.error("读取图片文件失败: {}", imagePath, e);
            return null;
        }
    }

    /**
     * 从千问输出中提取 ---META_JSON--- 段（若存在），写入 defect.misdetectionType / defect.severityTimeline
     */
    private void extractAndSetMeta(Defect defect, String fullText) {
        if (fullText == null) return;
        int idx = fullText.indexOf("---META_JSON---");
        if (idx < 0) return;
        String after = fullText.substring(idx + "---META_JSON---".length()).trim();
        int l = after.indexOf('{');
        int r = after.lastIndexOf('}');
        if (l < 0 || r <= l) return;
        String json = after.substring(l, r + 1);
        try {
            java.util.regex.Matcher mType = java.util.regex.Pattern
                .compile("\"misdetectionType\"\\s*:\\s*\"([^\"]+)\"")
                .matcher(json);
            if (mType.find()) {
                defect.setMisdetectionType(mType.group(1));
            }
            java.util.regex.Matcher mTrend = java.util.regex.Pattern
                .compile("\"trend\"\\s*:\\s*(\\[[\\s\\S]*?\\])")
                .matcher(json);
            if (mTrend.find()) {
                defect.setSeverityTimeline(mTrend.group(1).trim());
            }
            java.util.regex.Matcher mDeadline = java.util.regex.Pattern
                .compile("\"suggestedDeadline\"\\s*:\\s*\"([^\"]+)\"")
                .matcher(json);
            if (mDeadline.find()) {
                defect.setSuggestedDeadline(mDeadline.group(1));
            }
        } catch (Exception e) {
            log.warn("解析 META_JSON 失败: {}", e.getMessage());
        }
    }
}

