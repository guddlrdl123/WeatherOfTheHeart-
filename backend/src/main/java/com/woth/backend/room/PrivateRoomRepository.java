package com.woth.backend.room;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
/*
 * PrivateRoom 엔티티에 대한 JPA 리포지토리
 * 특정 유저의 특정 연도와 월에 해당하는 방을 조회하는 기능
 */
public interface PrivateRoomRepository extends JpaRepository<PrivateRoom, Long> {
    Optional<PrivateRoom> findByUserIdAndYearAndMonth(Long userId, Integer year, Integer month);
    
}
