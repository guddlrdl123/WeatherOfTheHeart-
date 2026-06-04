package com.woth.backend.mailbox;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 편지(우편함) 엔티티에 대한 JPA 리포지토리입니다.
 * 수신자 ID 기준으로 최신 편지 목록을 조회할 수 있습니다.
 */

public interface LetterRepository extends JpaRepository<Letter, Long> {
    List<Letter> findByReceiverIdOrderByCreatedAtDesc(Long receiverId);
    boolean existsByReceiverIdAndPlazaId(Long receiverId, Long plazaId);
}
