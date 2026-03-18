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
        "【必须追加】在全文最后追加一段机器可解析的元数据，格式严格如下（必须包含该分隔符与合法JSON，字段名不得变）：\n" +
        "---META_JSON---\n" +
        "{\n" +
        "  \"verdict\": \"FALSE_POSITIVE\"|\"DEFECT_CONFIRMED\",\n" +
        "  \"misdetectionType\": \"无缺陷检测为有缺陷\"|\"缺陷识别类别出错\"|\"定位框偏移/框到无关背景\"|\"红外误报(热点非缺陷)\"|\"其他\",\n" +
        "  \"trend\": [\n" +
        "    {\"tYears\": <整数>, \"severity\": \"low\"|\"medium\"|\"high\"|\"critical\", \"label\": \"<该阶段10字内描述>\"},\n" +
        "    ...\n" +
        "  ]\n" +
        "}\n" +
        "【trend 填写规则（必须严格遵守）】\n" +
        "1. 根据本次缺陷的实际类型和严重程度，自主判断合理的时间节点，禁止使用固定的0/1/2/3年。\n" +
        "2. 节点数量为4~7个，第一个节点必须为 tYears:0（代表当前检测时刻），之后时间严格递增。\n" +
        "3. 时间跨度由你根据缺陷特性决定：轻微缺陷可跨10~20年，严重缺陷可仅3~5年。\n" +
        "4. severity 反映该时间节点的预计严重程度，只能取 low/medium/high/critical，总体趋势应体现劣化规律。\n" +
        "5. label 为节点简短说明，如\"初期发现\"、\"加速劣化\"、\"临界失效\"、\"绝缘击穿\"等，便于图表标注。\n" +
        "6. 若判断为 FALSE_POSITIVE，trend 只需一个节点：{\"tYears\":0,\"severity\":\"low\",\"label\":\"无缺陷\"}\n\n" +
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
        "总字数控制在700字以内，语气专业简洁。";

    @Override
    public String analyzeDefect(String taskInfo) {
        return analyzeDefectWithImages(taskInfo, Collections.emptyList());
    }

    @Override
    public String analyzeDefectWithBase64Images(String taskInfo, List<String> base64Images) {
        logger.info("收到Base64图片多模态分析请求，内容长度: {} 字符，图片数量: {}", taskInfo == null ? 0 : taskInfo.length(), base64Images.size());

        if (apiKey == null || apiKey.isEmpty()) {
            logger.warn("API Key无效，使用演示模式");
            return generateMockAnalysis(taskInfo);
        }

        try {
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

            // user message：文字 + Base64 图片
            Map<String, Object> userMessage = new HashMap<>();
            userMessage.put("role", "user");

            List<Map<String, Object>> contentList = new ArrayList<>();

            // 文字部分
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("type", "text");
            textPart.put("text", taskInfo != null ? taskInfo : "");
            contentList.add(textPart);

            // 图片部分（已经是 data URL 格式）
            for (String dataUrl : base64Images) {
                Map<String, Object> imgPart = new HashMap<>();
                imgPart.put("type", "image_url");
                Map<String, String> imgUrl = new HashMap<>();
                imgUrl.put("url", dataUrl);
                imgPart.put("image_url", imgUrl);
                contentList.add(imgPart);
                logger.info("已附加Base64图片，data URL长度: {} chars", dataUrl.length());
            }

            userMessage.put("content", contentList);
            messages.add(userMessage);

            requestBody.put("messages", messages);
            requestBody.put("max_tokens", 2000);
            requestBody.put("temperature", 0.7);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            logger.info("正在等待华为云 Qwen VL 响应（Base64模式）...");
            @SuppressWarnings({"rawtypes", "unchecked"})
            ResponseEntity<Map<String, Object>> response =
                (ResponseEntity) restTemplate.postForEntity(endpoint, request, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                String aiResponse = extractResponse(response.getBody());
                logger.info("AI分析完成（Base64模式），响应长度: {} 字符", aiResponse.length());
                return aiResponse;
            } else {
                logger.error("华为云API调用失败（Base64模式），状态码: {}", response.getStatusCode());
                return generateMockAnalysis(taskInfo);
            }
        } catch (Exception e) {
            logger.error("华为云API调用发生错误（Base64模式）: {}", e.getMessage(), e);
            return generateMockAnalysis(taskInfo);
        }
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
            @SuppressWarnings({"rawtypes", "unchecked"})
            ResponseEntity<Map<String, Object>> response =
                (ResponseEntity) restTemplate.postForEntity(endpoint, request, Map.class);

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
                   "• 记录误判情况，持续优化检测模型。\n\n" +
                   "---META_JSON---\n" +
                   "{\n" +
                   "  \"verdict\": \"FALSE_POSITIVE\",\n" +
                   "  \"misdetectionType\": \"无缺陷检测为有缺陷\",\n" +
                   "  \"trend\": [{\"tYears\": 0, \"severity\": \"low\", \"label\": \"无缺陷\"}]\n" +
                   "}";
        }

        if (taskInfo.contains("你好") || taskInfo.contains("您好")) {
            return "你好！我是AI智能助手，专门帮助分析电力设备缺陷问题。";
        }

        return "[VERDICT:DEFECT_CONFIRMED]\n" +
               "1. 缺陷原因分析\n" +
               "• 设备长期运行导致的自然老化，绝缘材料性能下降。\n" +
               "• 环境因素影响（温度骤变、高湿度、污染积累）加速劣化进程。\n" +
               "• 维护保养周期不足，未能及时发现早期隐患。\n\n" +
               "2. 风险评估\n" +
               "• 中等风险：若不及时处理，预计2~3年内升级为高风险。\n" +
               "• 可能影响设备正常运行和区域供电稳定性。\n\n" +
               "3. 处理建议\n" +
               "• 安排专业人员72小时内现场检查确认。\n" +
               "• 根据检查结果制定针对性维修方案。\n" +
               "• 准备必要的备件和专用工具。\n\n" +
               "---SOLUTION_SPLIT---\n\n" +
               "4. 维修方案\n" +
               "• 更换老化绝缘部件，采用耐高温、抗腐蚀材料。\n" +
               "• 清洁设备表面及接触点，消除污染源。\n" +
               "• 重新紧固所有连接点，检测接触电阻是否达标。\n" +
               "• 进行带电检测和红外复查，确认无异常温升。\n\n" +
               "5. 预防措施\n" +
               "• 建立设备健康档案，缩短巡检周期至每季度一次。\n" +
               "• 加强在线监测，设置温度/电流预警阈值。\n" +
               "• 优化维护保养计划，重点关注老化高风险设备。\n\n" +
               "---META_JSON---\n" +
               "{\n" +
               "  \"verdict\": \"DEFECT_CONFIRMED\",\n" +
               "  \"misdetectionType\": \"其他\",\n" +
               "  \"trend\": [\n" +
               "    {\"tYears\": 0, \"severity\": \"medium\", \"label\": \"初期发现\"},\n" +
               "    {\"tYears\": 1, \"severity\": \"medium\", \"label\": \"缓慢发展\"},\n" +
               "    {\"tYears\": 3, \"severity\": \"high\", \"label\": \"加速劣化\"},\n" +
               "    {\"tYears\": 5, \"severity\": \"high\", \"label\": \"持续恶化\"},\n" +
               "    {\"tYears\": 7, \"severity\": \"critical\", \"label\": \"临界失效\"}\n" +
               "  ]\n" +
               "}";
    }
} 