package com.woth.backend.object;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * [object_slots 테이블 매핑 엔티티]
 * 방 내부에서 사물이 들어설 수 있는 고유한 위치 영역(슬롯)의 좌표 정보
 */
@Entity
@Table(name = "object_slots")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ObjectSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // // AUTO_INCREMENT 설정 적용 (배치 슬롯 고유 식별자)


    @Column(name = "slot_key", nullable = false, unique = true, length = 50)
    private String slotKey;   // 슬롯 식별 코드 (예: window_side)


    @Column(name = "slot_name", nullable = false, length = 50)
    private String slotName;  // 슬롯 위치 한글 명칭 (예: 창가 자리)


    @Column(name = "position_x", nullable = false)
    private Integer positionX; // 프론트엔드 화면 좌표 렌더링용 X좌표 값


    @Column(name = "position_y", nullable = false)
    private Integer positionY; // 프론트엔드 화면 좌표 렌더링용 Y좌표 값


    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true; // 해당 위치 슬롯 사용 여부

    // DB의 created_at 컬럼 매핑 (최초 등록 후 수정 불가)
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // DB의 updated_at 컬럼 매핑 (수정 시마다 갱신)
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
