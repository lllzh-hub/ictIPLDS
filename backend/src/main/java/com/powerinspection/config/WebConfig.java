package com.powerinspection.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Web 配置类 - 确保所有 HTTP 请求/响应使用 UTF-8 编码
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * 配置 HTTP 消息转换器，确保字符串使用 UTF-8 编码
     */
    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        // 移除默认的 StringHttpMessageConverter
        converters.removeIf(converter -> converter instanceof StringHttpMessageConverter);
        
        // 添加使用 UTF-8 编码的 StringHttpMessageConverter
        StringHttpMessageConverter stringConverter = new StringHttpMessageConverter(StandardCharsets.UTF_8);
        converters.add(0, stringConverter);
    }
}
