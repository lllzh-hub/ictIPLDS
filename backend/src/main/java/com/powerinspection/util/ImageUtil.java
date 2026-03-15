package com.powerinspection.util;

import java.util.Base64;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;

public class ImageUtil {
    
    /**
     * 将 base64 字符串转换为字节数组
     */
    public static byte[] base64ToBytes(String base64String) {
        if (base64String == null || base64String.isEmpty()) {
            return null;
        }
        // 移除可能的 data:image 前缀
        String base64Data = base64String;
        if (base64String.contains(",")) {
            base64Data = base64String.split(",")[1];
        }
        return Base64.getDecoder().decode(base64Data);
    }
    
    /**
     * 将字节数组转换为 base64 字符串
     */
    public static String bytesToBase64(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        return Base64.getEncoder().encodeToString(bytes);
    }
    
    /**
     * 验证 base64 字符串是否为有效的图片
     */
    public static boolean isValidImage(String base64String) {
        try {
            byte[] imageBytes = base64ToBytes(base64String);
            if (imageBytes == null) {
                return false;
            }
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
            return image != null;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * 获取图片的宽度和高度
     */
    public static int[] getImageDimensions(String base64String) throws IOException {
        byte[] imageBytes = base64ToBytes(base64String);
        if (imageBytes == null) {
            return new int[]{0, 0};
        }
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
        if (image == null) {
            return new int[]{0, 0};
        }
        return new int[]{image.getWidth(), image.getHeight()};
    }
}



