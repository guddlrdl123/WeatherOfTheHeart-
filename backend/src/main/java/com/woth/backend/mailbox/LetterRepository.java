package com.woth.backend.mailbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 편지(우편함) 엔티티에 대한 JPA 리포지토리입니다.
 * 수신자 ID 기준으로 최신 편지 목록을 조회할 수 있습니다.
 */

public interface LetterRepository extends JpaRepository<Letter, Long> {
    List<Letter> findByReceiverIdOrderByCreatedAtDesc(Long receiverId);
    Optional<Letter> findByIdAndReceiverId(Long id, Long receiverId);
    boolean existsByReceiverIdAndPlazaId(Long receiverId, Long plazaId);
    long countByReceiverIdAndIsReadFalse(Long receiverId);

    @Modifying
    @Query("""
            update Letter letter
            set letter.isRead = true
            where letter.receiver.id = :receiverId
              and letter.isRead = false
            """)
    int markAllAsReadByReceiverId(@Param("receiverId") Long receiverId);

    @Modifying
    @Query("delete from Letter letter where letter.receiver.id = :receiverId")
    void deleteByReceiverId(@Param("receiverId") Long receiverId);

    @Modifying
    @Query("""
            update Letter letter
            set letter.sender = null
            where letter.sender.id = :senderId
            """)
    void clearSenderByUserId(@Param("senderId") Long senderId);
}
