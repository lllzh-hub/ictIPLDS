package com.powerinspection.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Value("${video.docs.path}")
    private String videoDocsPath;
    
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 配置 /docs 路径映射到配置文件中指定的 docs 文件夹
        registry.addResourceHandler("/docs/**")
                .addResourceLocations("file:" + videoDocsPath)
                .setCachePeriod(3600);
    }
}

