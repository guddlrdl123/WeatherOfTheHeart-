package com.woth.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
// [EmailVerification 엔티티에 대한 JPA 리포지토리]
// 이메일 기준으로 최신 인증번호를 찾고, 회원가입 완료 후 인증 기록을 삭제하는 JPA Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
    Optional<EmailVerification> findTopByEmailOrderByCreatedAtDesc(String email);

    void deleteByEmail(String email);
}
