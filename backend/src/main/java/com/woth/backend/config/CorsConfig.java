package com.woth.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
// CORS 설정을 담당하는 클래스입니다.
// 프론트엔드 개발 시 Vite 개발 서버에서 API 호출이 원활하도록 CORS 정책을 설정합니다.
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                // Vite 개발 서버 포트가 5173/5174 등으로 바뀌어도 API 호출을 허용
                .allowedOriginPatterns(
                        "http://localhost:*",
                        "http://127.0.0.1:*"
                )
                // 우편 읽음 처리는 PATCH를 사용하므로 preflight 요청에서도 PATCH를 허용
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    
}
