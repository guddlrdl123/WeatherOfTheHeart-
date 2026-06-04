package com.woth.backend.global.config;


import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableJpaAuditing // JPA Auditing 기능을 활성화, 시간을 자동 저장합니다
public class JpaAuditingConfig {
}
