package com.woth.backend.plaza;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 플라자 엔티티에 대한 JPA 리포지토리입니다.
 * 활성화된 광장 목록을 정렬하여 조회하는 메서드를 제공합니다.
 */

public interface PlazaRepository extends JpaRepository<Plaza, Long> {
    List<Plaza> findAllByIsActiveTrueOrderByCreatedAtDesc();
    List<Plaza> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    @Modifying
    @Query("""
            update Plaza p
            set p.completedAt = :completedAt,
                p.updatedAt = :completedAt
            where p.id = :plazaId
              and p.completedAt is null
            """)
    int markCompletedIfNotAlready(@Param("plazaId") Long plazaId, @Param("completedAt") LocalDateTime completedAt);
}
