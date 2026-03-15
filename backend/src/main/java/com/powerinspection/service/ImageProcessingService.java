package com.powerinspection.service;

import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.List;

/**
 * 图像处理服务 - 在图像上绘制检测框
 */
@Service
public class ImageProcessingService {

    /**
     * 在图像上绘制检测框
     * 
     * @param imageBase64 原始图像的 Base64 编码
     * @param detections 检测结果列表
     * @param color 检测框颜色
     * @return 绘制了检测框的图像 Base64 编码
     */
    public String drawDetections(String imageBase64, List<Detection> detections, Color color) {
        try {
            // 1. 解码 Base64 图像
            String base64Data = imageBase64;
            if (imageBase64.startsWith("data:image")) {
                base64Data = imageBase64.substring(imageBase64.indexOf(",") + 1);
            }
            byte[] imageBytes = Base64.getDecoder().decode(base64Data);
            
            // 2. 读取图像
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (image == null) {
                System.err.println("❌ 无法读取图像");
                return imageBase64;
            }
            
            // 3. 创建绘图对象
            Graphics2D g2d = image.createGraphics();
            g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            
            // 4. 绘制每个检测框
            for (Detection detection : detections) {
                List<Double> bbox = detection.getBbox();
                if (bbox == null || bbox.size() < 4) {
                    continue;
                }
                
                int x1 = bbox.get(0).intValue();
                int y1 = bbox.get(1).intValue();
                int x2 = bbox.get(2).intValue();
                int y2 = bbox.get(3).intValue();
                
                // 绘制矩形框
                g2d.setColor(color);
                g2d.setStroke(new BasicStroke(3));
                g2d.drawRect(x1, y1, x2 - x1, y2 - y1);
                
                // 绘制标签
                String label = String.format("%s: %.2f", detection.getClassName(), detection.getScore());
                
                // 设置字体
                Font font = new Font("Arial", Font.BOLD, 14);
                g2d.setFont(font);
                FontMetrics fm = g2d.getFontMetrics();
                int textWidth = fm.stringWidth(label);
                int textHeight = fm.getHeight();
                
                // 绘制文本背景
                g2d.setColor(new Color(0, 0, 0, 180));
                g2d.fillRect(x1, y1 - textHeight - 5, textWidth + 10, textHeight + 5);
                
                // 绘制文本
                g2d.setColor(Color.WHITE);
                g2d.drawString(label, x1 + 5, y1 - 5);
            }
            
            g2d.dispose();
            
            // 5. 转换回 Base64
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "jpg", baos);
            byte[] resultBytes = baos.toByteArray();
            String resultBase64 = Base64.getEncoder().encodeToString(resultBytes);
            
            return "data:image/jpeg;base64," + resultBase64;
            
        } catch (Exception e) {
            System.err.println("❌ 绘制检测框失败: " + e.getMessage());
            e.printStackTrace();
            return imageBase64;
        }
    }

    /**
     * 检测结果数据类
     */
    public static class Detection {
        private String className;
        private Double score;
        private List<Double> bbox;

        public Detection(String className, Double score, List<Double> bbox) {
            this.className = className;
            this.score = score;
            this.bbox = bbox;
        }

        public String getClassName() {
            return className;
        }

        public Double getScore() {
            return score;
        }

        public List<Double> getBbox() {
            return bbox;
        }
    }
}






