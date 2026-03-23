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

    /**
     * 高置信度专用 prompt（>=85%）：跳过误判判断，直接给出专业缺陷分析。
     */
    private static final String SYSTEM_PROMPT_HIGH_CONFIDENCE =
        "你是一位经验丰富的电力设备缺陷分析专家，同时具备图像识别能力。\n\n" +
        "检测模型已以较高置信度识别出缺陷，请直接针对该缺陷进行专业分析。\n\n" +
        "请按以下结构输出分析报告，所有内容使用中文，语气专业简洁：\n\n" +
        "**第一行固定输出**（不得省略、不得修改）：\n" +
        "[VERDICT:DEFECT_CONFIRMED]\n\n" +
        "1. 缺陷原因分析\n" +
        "• 分析该类型缺陷的成因（材料老化、环境因素、施工质量等）\n\n" +
        "2. 风险评估\n" +
        "• 当前风险等级及说明\n" +
        "• 若不处理的后果预估\n\n" +
        "3. 处理建议\n" +
        "• 近期应采取的具体措施\n\n" +
        "---SOLUTION_SPLIT---\n\n" +
        "4. 维修方案\n" +
        "• 具体维修步骤和技术要求\n\n" +
        "5. 预防措施\n" +
        "• 长期预防和监测建议\n\n" +
        "---META_JSON---\n" +
        "{\n" +
        "  \"verdict\": \"DEFECT_CONFIRMED\",\n" +
        "  \"misdetectionType\": \"其他\",\n" +
        "  \"suggestedDeadline\": \"<从以下选一：立即处理/24小时内/72小时内/7天内/30天内>\",\n" +
        "  \"trend\": [\n" +
        "    {\"tYears\": <整数>, \"severity\": \"low\"|\"medium\"|\"high\"|\"critical\", \"label\": \"<10字内描述>\"},\n" +
        "    ...\n" +
        "  ]\n" +
        "}\n\n" +
        "【trend 填写规则】\n" +
        "1. 节点数量4~7个，第一个节点必须为 tYears:0，之后时间严格递增。\n" +
        "2. 轻微缺陷时间跨度可达10~20年，严重缺陷可仅3~5年。\n" +
        "3. severity 只能取 low/medium/high/critical，体现劣化趋势。\n" +
        "4. label 为节点说明，如\"初期发现\"、\"加速劣化\"、\"临界失效\"等。\n" +
        "总字数控制在600字以内。";

    /**
     * 低置信度专用 prompt（<85%）：需要 AI 自行判断是否为误判。
     */
    private static final String SYSTEM_PROMPT_LOW_CONFIDENCE =
        "你是一位经验丰富的电力设备缺陷分析专家，同时具备图像识别能力。\n\n" +
        "检测模型置信度较低，请仔细观察图片，独立判断是否存在真实缺陷。\n\n" +
        "【第一行必须是以下两者之一，不得省略，不得修改格式】\n" +
        "- 图片中确实存在真实缺陷：输出 [VERDICT:DEFECT_CONFIRMED]\n" +
        "- 图片中没有明显缺陷（模型误判）：输出 [VERDICT:FALSE_POSITIVE]\n\n" +
        "▌若判断为 DEFECT_CONFIRMED，按以下结构输出：\n\n" +
        "1. 缺陷原因分析\n" +
        "• 成因分析\n\n" +
        "2. 风险评估\n" +
        "• 风险等级及说明\n\n" +
        "3. 处理建议\n" +
        "• 具体建议\n\n" +
        "---SOLUTION_SPLIT---\n\n" +
        "4. 维修方案\n" +
        "• 维修步骤\n\n" +
        "5. 预防措施\n" +
        "• 预防建议\n\n" +
        "▌若判断为 FALSE_POSITIVE，按以下结构输出：\n\n" +
        "1. 误判原因说明\n" +
        "• 说明图片中实际情况及误判原因\n\n" +
        "2. 风险评估\n" +
        "• 当前风险等级：无风险，设备状态正常\n\n" +
        "3. 处理建议\n" +
        "• 建议将本条记录标记为误报\n\n" +
        "---SOLUTION_SPLIT---\n\n" +
        "4. 后续措施\n" +
        "• 无需维修\n\n" +
        "5. 预防措施\n" +
        "• 建议优化检测模型，降低该类场景误判率\n\n" +
        "---META_JSON---\n" +
        "{\n" +
        "  \"verdict\": \"FALSE_POSITIVE\"|\"DEFECT_CONFIRMED\",\n" +
        "  \"misdetectionType\": \"无缺陷检测为有缺陷\"|\"缺陷识别类别出错\"|\"定位框偏移/框到无关背景\"|\"红外误报(热点非缺陷)\"|\"其他\",\n" +
        "  \"suggestedDeadline\": \"<从以下选一：立即处理/24小时内/72小时内/7天内/30天内/无需处理>\",\n" +
        "  \"trend\": [\n" +
        "    {\"tYears\": <整数>, \"severity\": \"low\"|\"medium\"|\"high\"|\"critical\", \"label\": \"<10字内描述>\"}\n" +
        "  ]\n" +
        "}\n\n" +
        "【trend 填写规则】\n" +
        "1. DEFECT_CONFIRMED：节点4~7个，tYears:0 为起点，时间严格递增，体现劣化趋势。\n" +
        "2. FALSE_POSITIVE：仅需一个节点：{\"tYears\":0,\"severity\":\"low\",\"label\":\"无缺陷\"}\n" +
        "3. severity 只能取 low/medium/high/critical。\n" +
        "总字数控制在600字以内，全程使用中文。";

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

        String systemPrompt = selectSystemPrompt(taskInfo);

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

            Map<String, Object> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put("content", systemPrompt);
            messages.add(systemMessage);

            Map<String, Object> userMessage = new HashMap<>();
            userMessage.put("role", "user");

            List<Map<String, Object>> contentList = new ArrayList<>();

            Map<String, Object> textPart = new HashMap<>();
            textPart.put("type", "text");
            textPart.put("text", taskInfo != null ? taskInfo : "");
            contentList.add(textPart);

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

        String systemPrompt = selectSystemPrompt(taskInfo);

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

            Map<String, Object> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put("content", systemPrompt);
            messages.add(systemMessage);

            Map<String, Object> userMessage = new HashMap<>();
            userMessage.put("role", "user");

            if (imagePaths.isEmpty()) {
                userMessage.put("content", taskInfo);
            } else {
                List<Map<String, Object>> contentList = new ArrayList<>();

                Map<String, Object> textPart = new HashMap<>();
                textPart.put("type", "text");
                textPart.put("text", taskInfo);
                contentList.add(textPart);

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

    /**
     * 根据 taskInfo 中是否包含 [HIGH_CONFIDENCE] 标记来选择对应的 system prompt。
     * AIController 在置信度 >= 85% 时会在 taskInfo 开头插入该标记。
     */
    private String selectSystemPrompt(String taskInfo) {
        if (taskInfo != null && taskInfo.contains("[HIGH_CONFIDENCE]")) {
            logger.info("置信度 >= 85%，使用高置信度 prompt（跳过误判判断）");
            return SYSTEM_PROMPT_HIGH_CONFIDENCE;
        }
        logger.info("置信度 < 85% 或未知，使用低置信度 prompt（包含误判判断）");
        return SYSTEM_PROMPT_LOW_CONFIDENCE;
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

        if (taskInfo != null && taskInfo.startsWith("[无缺陷]")) {
            return "[VERDICT:FALSE_POSITIVE]\n" +
                   "1. 误判原因说明\n" +
                   "• 经图像分析，未发现明显缺陷，本次为误判。\n\n" +
                   "2. 风险评估\n" +
                   "• 当前风险等级：无风险，设备状态正常。\n\n" +
                   "3. 处理建议\n" +
                   "• 本次告警为误判，建议标记为误报。\n\n" +
                   "---SOLUTION_SPLIT---\n\n" +
                   "4. 后续措施\n" +
                   "• 无需维修，设备状态正常。\n\n" +
                   "5. 预防措施\n" +
                   "• 记录误判情况，持续优化检测模型。\n\n" +
                   "---META_JSON---\n" +
                   "{\n" +
                   "  \"verdict\": \"FALSE_POSITIVE\",\n" +
                   "  \"misdetectionType\": \"无缺陷检测为有缺陷\",\n" +
                   "  \"suggestedDeadline\": \"无需处理\",\n" +
                   "  \"trend\": [{\"tYears\": 0, \"severity\": \"low\", \"label\": \"无缺陷\"}]\n" +
                   "}";
        }

        if (taskInfo != null && taskInfo.contains("[HIGH_CONFIDENCE]")) {
            return "[VERDICT:DEFECT_CONFIRMED]\n" +
                   "1. 缺陷原因分析\n" +
                   "• 设备长期运行导致自然老化，绝缘材料性能下降。\n" +
                   "• 环境因素（温度骤变、高湿度、污染积累）加速劣化进程。\n\n" +
                   "2. 风险评估\n" +
                   "• 中高风险：当前缺陷明显，若不及时处理将影响供电稳定性。\n" +
                   "• 预计1~2年内升级为高风险。\n\n" +
                   "3. 处理建议\n" +
                   "• 安排专业人员72小时内现场处置。\n" +
                   "• 准备替换备件，制定停电检修计划。\n\n" +
                   "---SOLUTION_SPLIT---\n\n" +
                   "4. 维修方案\n" +
                   "• 更换老化绝缘部件，采用耐高温、抗腐蚀材料。\n" +
                   "• 清洁设备表面，重新紧固连接点，检测接触电阻。\n" +
                   "• 进行红外复查，确认无异常温升。\n\n" +
                   "5. 预防措施\n" +
                   "• 建立设备健康档案，缩短巡检周期至每季度一次。\n" +
                   "• 加强在线监测，设置温度/电流预警阈值。\n\n" +
                   "---META_JSON---\n" +
                   "{\n" +
                   "  \"verdict\": \"DEFECT_CONFIRMED\",\n" +
                   "  \"misdetectionType\": \"其他\",\n" +
                   "  \"suggestedDeadline\": \"72小时内\",\n" +
                   "  \"trend\": [\n" +
                   "    {\"tYears\": 0, \"severity\": \"high\", \"label\": \"初期发现\"},\n" +
                   "    {\"tYears\": 1, \"severity\": \"high\", \"label\": \"持续劣化\"},\n" +
                   "    {\"tYears\": 2, \"severity\": \"critical\", \"label\": \"临界失效\"},\n" +
                   "    {\"tYears\": 3, \"severity\": \"critical\", \"label\": \"设备故障\"}\n" +
                   "  ]\n" +
                   "}";
        }

        // 低置信度默认 mock
        return "[VERDICT:DEFECT_CONFIRMED]\n" +
               "1. 缺陷原因分析\n" +
               "• 设备长期运行导致的自然老化，绝缘材料性能下降。\n" +
               "• 环境因素影响（温度骤变、高湿度、污染积累）加速劣化进程。\n\n" +
               "2. 风险评估\n" +
               "• 中等风险：若不及时处理，预计2~3年内升级为高风险。\n\n" +
               "3. 处理建议\n" +
               "• 安排专业人员72小时内现场检查确认。\n\n" +
               "---SOLUTION_SPLIT---\n\n" +
               "4. 维修方案\n" +
               "• 更换老化绝缘部件，清洁设备表面及接触点。\n" +
               "• 重新紧固连接点，进行带电检测和红外复查。\n\n" +
               "5. 预防措施\n" +
               "• 建立设备健康档案，缩短巡检周期。\n" +
               "• 加强在线监测，设置预警阈值。\n\n" +
               "---META_JSON---\n" +
               "{\n" +
               "  \"verdict\": \"DEFECT_CONFIRMED\",\n" +
               "  \"misdetectionType\": \"其他\",\n" +
               "  \"suggestedDeadline\": \"72小时内\",\n" +
               "  \"trend\": [\n" +
               "    {\"tYears\": 0, \"severity\": \"medium\", \"label\": \"初期发现\"},\n" +
               "    {\"tYears\": 2, \"severity\": \"medium\", \"label\": \"缓慢发展\"},\n" +
               "    {\"tYears\": 4, \"severity\": \"high\", \"label\": \"加速劣化\"},\n" +
               "    {\"tYears\": 6, \"severity\": \"high\", \"label\": \"持续恶化\"},\n" +
               "    {\"tYears\": 8, \"severity\": \"critical\", \"label\": \"临界失效\"}\n" +
               "  ]\n" +
               "}";
    }
}
 