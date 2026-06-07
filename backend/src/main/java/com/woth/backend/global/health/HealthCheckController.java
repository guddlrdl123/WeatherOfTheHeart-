package com.woth.backend.global.health;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Elastic Beanstalk / ELB 헬스 체크용 컨트롤러입니다.
 * 로드밸런서가 / 또는 /health로 요청했을 때 200 OK를 반환합니다.
 */
@RestController
public class HealthCheckController {

    @GetMapping("/")
    public ResponseEntity<String> root() {
        return ResponseEntity.ok("OK");
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}