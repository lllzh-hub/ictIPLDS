package com.powerinspection.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * 响应字符编码过滤器 - 确保响应使用 UTF-8 编码
 */
@Component("customResponseEncodingFilter")
public class CharacterEncodingFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        // 初始化过滤器
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // 设置响应编码为 UTF-8
        httpResponse.setCharacterEncoding("UTF-8");
        httpResponse.setContentType("application/json;charset=UTF-8");
        
        // 添加响应头，确保浏览器使用 UTF-8 解析
        httpResponse.setHeader("Content-Type", "application/json;charset=UTF-8");
        httpResponse.setHeader("Accept-Charset", "UTF-8");

        chain.doFilter(request, httpResponse);
    }

    @Override
    public void destroy() {
        // 销毁过滤器
    }
}
