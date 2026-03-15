package com.powerinspection.service.impl;

import com.powerinspection.service.AIService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Service
public class HuaweiCloudAIServiceImpl implements AIService {

    private static final Logger logger = LoggerFactory.getLogger(HuaweiCloudAIServiceImpl.class);

    @Value("${huaweicloud.api.key}")
    private String apiKey;

    @Value("${huaweicloud.endpoint:https://modelarts.cn-north-4.myhuaweicloud.com}")
    private String endpoint;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String analyzeDefect(String taskInfo) {
        logger.info("收到AI分析请求，内容长度: {} 字符", taskInfo.length());
        logger.debug("分析内容: {}", taskInfo);

        // 检查API Key是否有效
        if (apiKey == null || apiKey.isEmpty()) {
            logger.warn("API Key无效，使用演示模式");
            return generateMockAnalysis(taskInfo);
        }

        try {
            logger.info("调用华为云 ModelArts API...");

            // 构建请求
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            // 华为云 ModelArts 使用 X-Auth-Token 或 Authorization Bearer
            if (apiKey.startsWith("Bearer ") || apiKey.startsWith("bearer ")) {
                headers.set("Authorization", apiKey);
            } else {
                headers.set("Authorization", "Bearer " + apiKey);
            }

            String systemPrompt = "你是一位经验丰富的电力设备缺陷分析专家。请用专业、简洁的语气分析设备缺陷。\n\n" +
                "回答格式要求：\n" +
                "1. 使用清晰的分段结构\n" +
                "2. 每个部分用数字标题（1. 2. 3. 4. 5.）\n" +
                "3. 每个部分下用 • 符号列出要点\n" +
                "4. 每个要点简洁明了，1-2行\n" +
                "5. 总字数控制在400字以内\n\n" +
                "必须包含以下5个部分：\n" +
                "1. 缺陷原因分析\n" +
                "2. 风险评估\n" +
                "3. 处理建议\n" +
                "---SOLUTION_SPLIT---\n" +
                "4. 维修方案\n" +
                "5. 预防措施";

            Map<String, Object> requestBody = new HashMap<>();
            List<Map<String, String>> messages = new ArrayList<>();
            
            Map<String, String> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put("content", systemPrompt);
            messages.add(systemMessage);
            
            Map<String, String> userMessage = new HashMap<>();
            userMessage.put("role", "user");
            userMessage.put("content", taskInfo);
            messages.add(userMessage);
            
            requestBody.put("messages", messages);
            requestBody.put("max_tokens", 2000);
            requestBody.put("temperature", 0.7);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            logger.info("正在等待AI响应...");
            
            // 调用华为云 ModelArts API
            ResponseEntity<Map> response = restTemplate.postForEntity(
                endpoint, 
                request, 
                Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                // 根据华为云实际返回格式解析
                String aiResponse = extractResponse(responseBody);
                
                logger.info("AI分析完成，响应长度: {} 字符", aiResponse.length());
                logger.debug("AI响应内容: {}", aiResponse);
                
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

    private String extractResponse(Map<String, Object> responseBody) {
        // 根据华为云实际返回格式提取响应内容
        // 这里需要根据实际API文档调整
        try {
            if (responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> firstChoice = choices.get(0);
                    Map<String, String> message = (Map<String, String>) firstChoice.get("message");
                    return message.get("content");
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

        // 简单的关键词检测
        if (taskInfo.contains("你好") || taskInfo.contains("您好") || taskInfo.contains("hi") || taskInfo.contains("hello")) {
            return "你好！我是AI智能助手，专门帮助分析电力设备缺陷问题。\n\n" +
                   "你可以向我描述遇到的设备问题，比如：\n" +
                   "• 设备异常现象（发热、异响、漏油等）\n" +
                   "• 设备类型和位置\n" +
                   "• 发现的时间\n\n" +
                   "我会帮你分析原因和提供处理建议。";
        }

        return "1. 缺陷原因分析\n" +
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
               "• 优化维护保养计划\n\n" +
               "💡 提示：当前为演示模式";
    }
}

