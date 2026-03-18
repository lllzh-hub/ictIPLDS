package com.powerinspection.service;

import java.util.List;

public interface AIService {
    /** 纯文字分析（兼容旧接口） */
    String analyzeDefect(String taskInfo);

    /** 多模态分析：文字 + 图片文件路径列表（本地绝对路径） */
    String analyzeDefectWithImages(String taskInfo, List<String> imagePaths);

    /** 多模态分析：文字 + 图片 Base64 列表（data URL 格式，直接从数据库字段读取） */
    String analyzeDefectWithBase64Images(String taskInfo, List<String> base64Images);
}
