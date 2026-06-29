package com.woth.backend.plaza;


import com.woth.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@Table(name = "plaza_entries")
public class PlazaEntry {

    /**
     *[plaza_entries 테이블 매핑 엔티티]
     *유저가 특정 광장에 자신의 이야기를 남긴 게시글 데이터입니다.
     */

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // AUTO_INCREMENT 설정을 적용함, 광장의 입장 기록 고유 식별자

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plaza_id", nullable = false)
    private Plaza plaza;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "mood_key", nullable = false, length = 50)
    private String moodKey;

    @Column(name = "weather_key", nullable = false, length = 50)
    private String weatherKey;

    @Column(name = "object_key", nullable = false, length = 100)
    private String objectKey;

    @Column(name = "slot_key", nullable = false, length = 100)
    private String slotKey;

    @Column(name = "position_x")
    private Integer positionX; // 광장 안에서 사용자가 배치한 오브젝트 X 좌표값

    @Column(name = "position_y")
    private Integer positionY; // 광장 안에서 사용자가 배치한 오브젝트 Y 좌표값

    @Column(name = "layer_index")
    private Integer layerIndex;

    @Column(name = "is_blinded", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    @Builder.Default
    private Boolean isBlinded = false;

    @Column(name = "blinded_at")
    private LocalDateTime blindedAt;

    @Column(name = "blind_reason", length = 255)
    private String blindReason;

    @Column(name = "create_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "update_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.isBlinded == null) {
            this.isBlinded = false;
        }
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    } // INSERT 쿼리가 나가기 직전 실행 (생성일, 수정일을 현재 시간으로 초기화)

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    } // UPDATE 쿼리가 나가기 직전 실행 (수정일만 현재 시간으로 갱신)
    public void updateContent(String title, String content) {
        this.title = title;
        this.content = content;
    }

    public void updatePosition(Integer positionX, Integer positionY, Integer layerIndex) {
        this.positionX = positionX;
        this.positionY = positionY;
        this.layerIndex = layerIndex;
    }

    public void blind(String reason) {
        this.isBlinded = true;
        this.blindedAt = LocalDateTime.now();
        this.blindReason = reason;
    }
}
