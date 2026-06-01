package com.woth.backend.auth;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * [refresh_tokens 테이블 매핑 엔티티]
 * JWT Access Token 만료 시 재발급을 검증하기 위한 리프레시 토큰 관리 클래스
 */
@Entity
@Table(name = "refresh_tokens")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class RefreshToken {

    // AUTO_INCREMENT 설정 적용 (토큰 일련번호)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId; // 해당 토큰을 소유한 유저 식별자 (1:1 대응)

    @Column(name = "token_value", nullable = false, length = 255)
    private String tokenValue; // 실제 암호화된 리프레시 토큰 문자열

    @Column(name = "expired_at", nullable = false)
    private LocalDateTime expiredAt; // 토큰 만료 일시

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // INSERT 쿼리가 나가기 직전 실행 (생성일, 수정일을 현재 시간으로 초기화)
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // UPDATE 쿼리가 나가기 직전 실행 (수정일만 현재 시간으로 갱신)
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
