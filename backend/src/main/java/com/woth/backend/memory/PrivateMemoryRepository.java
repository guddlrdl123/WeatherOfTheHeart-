package com.woth.backend.memory;

/**
 * 개인 메모 엔티티에 대한 JPA 리포지토리
 * 사용자 개인 방에 속한 메모 조회 및 중복 검사 메서드
 */
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PrivateMemoryRepository extends JpaRepository<PrivateMemory, Long> {
    List<PrivateMemory> findByPrivateRoomUserId(Long userId);
    List<PrivateMemory> findByPrivateRoomId(Long privateRoomId);
    boolean existsByPrivateRoomUserIdAndMemoryDate(Long userId, LocalDate memoryDate);
    // 위치 수정 시 요청 사용자의 기억인지 함께 검증하기 위한 조회
    Optional<PrivateMemory> findByIdAndPrivateRoomUserId(Long id, Long userId);
}
