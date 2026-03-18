package com.powerinspection.service.impl;

import com.powerinspection.service.AIService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;

@Service
public class HuaweiCloudAIServiceImpl implements AIService {

    private static final Logger logger = LoggerFactory.getLogger(HuaweiCloudAIServiceImpl.class);

    @Value("${huaweicloud.api.key}")
    private String apiKey;

    @Value("${huaweicloud.endpoint:https://modelarts.cn-north-4.myhuaweicloud.com}")
    private String endpoint;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String SYSTEM_PROMPT =
        "你是一位经验丰富的电力设备缺陷分析专家，同时具备图像识别能力。\n\n" +
        "你会收到：\n" +
        "1. 检测模型输出的缺陷识别结果（JSON格式的bbox坐标、类别、置信度）\n" +
        "2. 原始图片（可见光）\n" +
        "3. 红外热成像图片（如有）\n\n" +
        "你的任务：\n" +
        "仔细观察图片内容，独立判断是否存在真实缺陷（不要只依赖检测模型结果）。\n\n" +
        "【重要】你的回答第一行必须是以下两者之一（不得省略，不得修改格式）：\n" +
        "- 如果图片中确实存在真实缺陷：输出 [VERDICT:DEFECT_CONFIRMED]\n" +
        "- 如果图片中没有明显缺陷（检测模型误判）：输出 [VERDICT:FALSE_POSITIVE]\n\n" +
        "第一行之后，再输出以下5个部分（用数字+点号开头，要点用•开头）：\n" +
        "1. 缺陷原因分析\n" +
        "2. 风险评估\n" +
        "3. 处理建议\n" +
        "---SOLUTION_SPLIT---\n" +
        "4. 维修方案\n" +
        "5. 预防措施\n\n" +
        "如果判断为 [VERDICT:FALSE_POSITIVE]，则后续内容简化为：\n" +
        "1. 缺陷原因分析\n" +
        "• 经图像分析，未发现明显缺陷，本次为误判。\n" +
        "2. 风险评估\n" +
        "• 当前风险等级：无风险，设备状态正常。\n" +
        "3. 处理建议\n" +
        "• 建议将本条记录标记为误报。\n" +
        "---SOLUTION_SPLIT---\n" +
        "4. 维修方案\n" +
        "• 无需维修。\n" +
        "5. 预防措施\n" +
        "• 持续优化检测模型，减少误判率。\n" +
        "总字数控制在600字以内，语气专业简洁。";

    @Override
    public String analyzeDefect(String taskInfo) {
        return analyzeDefectWithImages(taskInfo, Collections.emptyList());
    }

    @Override
    public String analyzeDefectWithImages(String taskInfo, List<String> imagePaths) {
        logger.info("收到AI分析请求，内容长度: {} 字符，图片数量: {}", taskInfo.length(), imagePaths.size());

        if (apiKey == null || apiKey.isEmpty()) {
            logger.warn("API Key无效，使用演示模式");
            return generateMockAnalysis(taskInfo);
        }

        try {
            logger.info("调用华为云 ModelArts 多模态 API...");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (apiKey.startsWith("Bearer ") || apiKey.startsWith("bearer ")) {
                headers.set("Authorization", apiKey);
            } else {
                headers.set("Authorization", "Bearer " + apiKey);
            }

            Map<String, Object> requestBody = new HashMap<>();
            List<Map<String, Object>> messages = new ArrayList<>();

            // system message
            Map<String, Object> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put("content", SYSTEM_PROMPT);
            messages.add(systemMessage);

            // user message：文字 + 图片
            Map<String, Object> userMessage = new HashMap<>();
            userMessage.put("role", "user");

            if (imagePaths.isEmpty()) {
                // 纯文字模式
                userMessage.put("content", taskInfo);
            } else {
                // 多模态模式：content 为数组
                List<Map<String, Object>> contentList = new ArrayList<>();

                // 先加文字
                Map<String, Object> textPart = new HashMap<>();
                textPart.put("type", "text");
                textPart.put("text", taskInfo);
                contentList.add(textPart);

                // 再加图片（base64）
                for (String imgPath : imagePaths) {
                    try {
                        byte[] imgBytes = Files.readAllBytes(Paths.get(imgPath));
                        String base64 = Base64.getEncoder().encodeToString(imgBytes);
                        String ext = imgPath.substring(imgPath.lastIndexOf('.') + 1).toLowerCase();
                        String mimeType = ext.equals("png") ? "image/png" : "image/jpeg";

                        Map<String, Object> imgPart = new HashMap<>();
                        imgPart.put("type", "image_url");
                        Map<String, String> imgUrl = new HashMap<>();
                        imgUrl.put("url", "data:" + mimeType + ";base64," + base64);
                        imgPart.put("image_url", imgUrl);
                        contentList.add(imgPart);
                        logger.info("已附加图片: {}, 大小: {} bytes", imgPath, imgBytes.length);
                    } catch (IOException e) {
                        logger.warn("读取图片失败，跳过: {} - {}", imgPath, e.getMessage());
                    }
                }

                userMessage.put("content", contentList);
            }
            messages.add(userMessage);

            requestBody.put("messages", messages);
            requestBody.put("max_tokens", 2000);
            requestBody.put("temperature", 0.7);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            logger.info("正在等待AI响应...");
            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, request, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                String aiResponse = extractResponse(response.getBody());
                logger.info("AI分析完成，响应长度: {} 字符", aiResponse.length());
                return aiResponse;
            } else {
                logger.error("华为云API调用失败，状态码: {}", response.getStatusCode());
                return generateMockAnalysis(taskInfo);
            }

        } catch (Exception e) {
            logger.error("华为云API调用发生错误: {}", e.getMessage(), e);
            return generateMockAnalysis(taskInfo);
        }
    }

    @SuppressWarnings("unchecked")
    private String extractResponse(Map<String, Object> responseBody) {
        try {
            if (responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> firstChoice = choices.get(0);
                    Object messageObj = firstChoice.get("message");
                    if (messageObj instanceof Map) {
                        Map<String, Object> message = (Map<String, Object>) messageObj;
                        Object content = message.get("content");
                        return content != null ? content.toString() : "AI响应内容为空";
                    }
                }
            }
            return "AI响应格式解析失败";
        } catch (Exception e) {
            logger.error("解析响应失败: {}", e.getMessage());
            return "AI响应解析错误";
        }
    }

    private String generateMockAnalysis(String taskInfo) {
        logger.info("使用演示模式生成分析结果");

        if (taskInfo.startsWith("[无缺陷]")) {
            return "[VERDICT:FALSE_POSITIVE]\n" +
                   "1. 缺陷原因分析\n" +
                   "• 经图像分析，未发现明显缺陷，本次为误判。\n\n" +
                   "2. 风险评估\n" +
                   "• 当前风险等级：无风险，设备状态正常。\n" +
                   "• 建议继续按计划进行常规巡检。\n\n" +
                   "3. 处理建议\n" +
                   "• 本次告警为误判，建议标记为误报。\n" +
                   "• 如多次出现误判，建议检查检测模型参数。\n\n" +
                   "---SOLUTION_SPLIT---\n\n" +
                   "4. 维修方案\n" +
                   "• 无需维修，设备状态正常。\n\n" +
                   "5. 预防措施\n" +
                   "• 定期开展例行巡检，保持设备清洁。\n" +
                   "• 记录误判情况，持续优化检测模型。";
        }

        if (taskInfo.contains("你好") || taskInfo.contains("您好")) {
            return "你好！我是AI智能助手，专门帮助分析电力设备缺陷问题。";
        }

        return "[VERDICT:DEFECT_CONFIRMED]\n" +
               "1. 缺陷原因分析\n" +
               "• 设备长期运行导致的自然老化\n" +
               "• 环境因素影响（温度、湿度、污染）\n" +
               "• 维护保养周期可能需要调整\n\n" +
               "2. 风险评估\n" +
               "• 中等风险：需要及时处理避免恶化\n" +
               "• 可能影响设备正常运行和供电稳定性\n\n" +
               "3. 处理建议\n" +
               "• 安排专业人员现场检查确认\n" +
               "• 根据检查结果制定维修方案\n" +
               "• 准备必要的备件和工具\n\n" +
               "---SOLUTION_SPLIT---\n\n" +
               "4. 维修方案\n" +
               "• 更换老化部件或进行必要的维修\n" +
               "• 清洁设备表面，消除污染源\n" +
               "• 进行功能测试，确保设备正常运行\n\n" +
               "5. 预防措施\n" +
               "• 加强后续监控和定期巡检\n" +
               "• 建立设备健康档案\n" +
               "• 优化维护保养计划";
    }
}
