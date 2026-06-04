package com.woth.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.fasterxml.jackson.databind.ObjectMapper;

@Configuration
public class JacksonConfig {
    
    @Bean
    public ObjectMapper objectMapper() {
        // // AiResponseParser가 OpenAI JSON 응답을 DTO로 변환할 수 있도록 ObjectMapper Bean을 등록합니다.
        return new ObjectMapper();
    }
}
