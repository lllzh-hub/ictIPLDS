package com.powerinspection.config;

import org.springframework.context.annotation.Configuration;

/**
 * Web 配置类
 * 注：字符编码由 Spring Boot 的 HttpEncodingAutoConfiguration 自动处理
 * 通过 application.properties 中的 server.servlet.encoding.* 配置
 */
@Configuration
public class WebConfig {
    // Spring Boot 已经通过自动配置处理了所有编码问题
    // 无需自定义过滤器或消息转换器
}
