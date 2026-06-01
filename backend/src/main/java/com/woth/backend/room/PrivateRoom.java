package com.woth.backend.room;

import com.woth.backend.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * [private_rooms 테이블 매핑 엔티티]
 * 유저별로 매달 새롭게 열리는 고유한 '나만의 방' 공간 정보
 */
@Entity
@Table(name = "private_rooms", uniqueConstraints = {
        // 유저가 동일한 연도, 동일한 월에 중복해서 방을 생성하지 못하도록 복합 유니크 제약 적용
        @UniqueConstraint(name = "uk_user_year_month", columnNames = {"user_id", "year", "month"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class PrivateRoom {

    // AUTO_INCREMENT 설정 적용 (방 고유 식별자)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 외래키(user_id) 지연 로딩 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Integer year; // 방이 개설된 연도

    @Column(nullable = false)
    private Integer month; // 방이 개설된 월

    @Column(nullable = false, length = 100)
    private String title; // 유저가 지정한 방의 제목(테마)

    @Column(name = "archived_at")
    private LocalDateTime archivedAt; // 월 종료 시 방 보관 처리 시점

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
