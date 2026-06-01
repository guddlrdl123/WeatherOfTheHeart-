package com.woth.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.codec.ClientCodecConfigurer;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
// WebClient 설정을 담당하는 클래스입니다.
@Configuration
public class WebClientConfig {
    @Bean
    public WebClient.Builder webClientBuilder() {
        // 이미지 생성 API는 base64 응답이 커서 기본 256KB 버퍼를 넘을 수 있으므로 10MB까지 허용합니다.
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(this::configureCodecs)
                .build();

        // OpenAiClient가 외부 API 호출용 WebClient를 만들 수 있도록 Builder Bean을 명시적으로 등록합니다.
        return WebClient.builder()
                .exchangeStrategies(strategies);
    }

    private void configureCodecs(ClientCodecConfigurer configurer) {
        configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024);
    }
}
