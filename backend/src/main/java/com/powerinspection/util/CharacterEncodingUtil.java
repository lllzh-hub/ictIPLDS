package com.powerinspection.util;

import java.nio.charset.StandardCharsets;

/**
 * 字符编码工具类 - 处理数据插入时的字符编码问题
 */
public class CharacterEncodingUtil {

    /**
     * 验证字符串是否为有效的 UTF-8 编码
     * 
     * @param str 待验证的字符串
     * @return 如果是有效的 UTF-8 编码返回 true，否则返回 false
     */
    public static boolean isValidUtf8(String str) {
        if (str == null) {
            return true;
        }
        
        try {
            byte[] bytes = str.getBytes(StandardCharsets.UTF_8);
            String decoded = new String(bytes, StandardCharsets.UTF_8);
            return str.equals(decoded);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 确保字符串使用 UTF-8 编码
     * 如果字符串包含乱码，尝试修复
     * 
     * @param str 待处理的字符串
     * @return 处理后的字符串
     */
    public static String ensureUtf8(String str) {
        if (str == null) {
            return null;
        }

        try {
            // 尝试将字符串转换为 UTF-8 字节，然后再转回字符串
            byte[] bytes = str.getBytes(StandardCharsets.UTF_8);
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            // 如果转换失败，返回原字符串
            return str;
        }
    }

    /**
     * 检测字符串的编码类型
     * 
     * @param str 待检测的字符串
     * @return 编码类型描述
     */
    public static String detectEncoding(String str) {
        if (str == null) {
            return "NULL";
        }

        try {
            byte[] bytes = str.getBytes();
            
            // 检查是否为 UTF-8
            if (isValidUtf8String(bytes)) {
                return "UTF-8";
            }
            
            // 检查是否为 GBK
            if (isValidGBK(bytes)) {
                return "GBK";
            }
            
            // 检查是否为 ISO-8859-1
            if (isValidISO88591(bytes)) {
                return "ISO-8859-1";
            }
            
            return "UNKNOWN";
        } catch (Exception e) {
            return "ERROR";
        }
    }

    /**
     * 验证字节数组是否为有效的 UTF-8 编码
     */
    private static boolean isValidUtf8String(byte[] bytes) {
        int i = 0;
        while (i < bytes.length) {
            byte b = bytes[i];
            
            if ((b & 0x80) == 0) {
                // 单字节字符 (0xxxxxxx)
                i++;
            } else if ((b & 0xE0) == 0xC0) {
                // 双字节字符 (110xxxxx)
                if (i + 1 >= bytes.length) return false;
                if ((bytes[i + 1] & 0xC0) != 0x80) return false;
                i += 2;
            } else if ((b & 0xF0) == 0xE0) {
                // 三字节字符 (1110xxxx)
                if (i + 2 >= bytes.length) return false;
                if ((bytes[i + 1] & 0xC0) != 0x80) return false;
                if ((bytes[i + 2] & 0xC0) != 0x80) return false;
                i += 3;
            } else if ((b & 0xF8) == 0xF0) {
                // 四字节字符 (11110xxx)
                if (i + 3 >= bytes.length) return false;
                if ((bytes[i + 1] & 0xC0) != 0x80) return false;
                if ((bytes[i + 2] & 0xC0) != 0x80) return false;
                if ((bytes[i + 3] & 0xC0) != 0x80) return false;
                i += 4;
            } else {
                return false;
            }
        }
        return true;
    }

    /**
     * 验证字节数组是否为有效的 GBK 编码
     */
    private static boolean isValidGBK(byte[] bytes) {
        try {
            String str = new String(bytes, "GBK");
            byte[] reencoded = str.getBytes("GBK");
            return java.util.Arrays.equals(bytes, reencoded);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 验证字节数组是否为有效的 ISO-8859-1 编码
     */
    private static boolean isValidISO88591(byte[] bytes) {
        try {
            String str = new String(bytes, "ISO-8859-1");
            byte[] reencoded = str.getBytes("ISO-8859-1");
            return java.util.Arrays.equals(bytes, reencoded);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 将其他编码的字符串转换为 UTF-8
     * 
     * @param str 原字符串
     * @param sourceEncoding 源编码
     * @return 转换后的 UTF-8 字符串
     */
    public static String convertToUtf8(String str, String sourceEncoding) {
        if (str == null) {
            return null;
        }

        try {
            byte[] bytes = str.getBytes(sourceEncoding);
            return new String(bytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return str;
        }
    }

    /**
     * 清理字符串中的非法字符
     * 
     * @param str 待清理的字符串
     * @return 清理后的字符串
     */
    public static String cleanString(String str) {
        if (str == null) {
            return null;
        }

        // 移除控制字符和其他非法字符
        return str.replaceAll("[\\p{Cc}\\p{Cs}]", "");
    }
}
