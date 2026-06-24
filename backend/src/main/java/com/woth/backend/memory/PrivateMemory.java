package com.woth.backend.memory;

import com.woth.backend.global.crypto.EncryptedStringConverter;
import com.woth.backend.room.PrivateRoom;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * [private_memories 테이블 매핑 엔티티]
 * 유저가 나만의 방 공간에 매일 기록하는 감정 일기(메모) 데이터
 */
@Entity
@Table(name = "private_memories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class PrivateMemory {

    // AUTO_INCREMENT 설정 적용 (일기 고유 식별자)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "private_room_id", nullable = false)
    private PrivateRoom privateRoom;

    // DB 저장 시 AES-256-GCM 으로 암호화. 암호문은 평문보다 길어 TEXT 사용(VARCHAR(100) 불가).
    @Convert(converter = EncryptedStringConverter.class)
    @Column(nullable = false, columnDefinition = "TEXT")
    private String title; // 일기 제목 (암호화 저장)

    // DB 저장 시 AES-256-GCM 으로 암호화.
    @Convert(converter = EncryptedStringConverter.class)
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content; // 일기 본문 내용 (암호화 저장)

    @Column(name = "mood_key", nullable = false, length = 50)
    private String moodKey; // 마음 상태 / 감정 태그

    @Column(name = "weather_key", nullable = false, length = 50)
    private String weatherKey; // 방의 날씨 키

    @Column(name = "object_key", nullable = false, length = 100)
    private String objectKey; // 선택된 오브젝트 키

    @Column(name = "slot_key", nullable = false, length = 100)
    private String slotKey; // 선택된 슬롯 키

    @Column(name = "memory_date", nullable = false)
    private LocalDate memoryDate; // 일기를 기록한 날짜 (연-월-일)

    @Column(name = "image_url", length = 255)
    private String imageUrl; // S3에 업로드된 첨부 이미지 경로

    @Column(name = "position_x")
    private Integer positionX; // 방 안 오브젝트의 X 좌표

    @Column(name = "position_y")
    private Integer positionY; // 방 안 오브젝트의 Y 좌표

    @Column(name = "flip_x")
    private Boolean flipX; // 오브젝트 좌우 반전 여부

    @Column(name = "tilt_deg")
    private Integer tiltDeg; // 오브젝트 기울기 각도

    @Column(name = "layer_index")
    private Integer layerIndex;

    @Builder.Default
    @Column(name = "content_updated", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean contentUpdated = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // INSERT 쿼리가 나가기 직전 실행 (생성일, 수정일을 현재 시간으로 초기화)
    @PrePersist
    protected void onCreate() {
        if (this.contentUpdated == null) {
            this.contentUpdated = false;
        }
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // UPDATE 쿼리가 나가기 직전 실행 (수정일만 현재 시간으로 갱신)
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateContent(String title, String content, String moodKey) {
        if (!Objects.equals(this.title, title)
                || !Objects.equals(this.content, content)
                || !Objects.equals(this.moodKey, moodKey)) {
            this.contentUpdated = true;
        }
        this.title = title;
        this.content = content;
        this.moodKey = moodKey;
    }

    public void updatePosition(Integer positionX, Integer positionY, Boolean flipX, Integer tiltDeg, Integer layerIndex) {
        // 위치 편집 완료 시 프론트에서 전달한 배치 상태를 엔티티에 반영합니다.
        this.positionX = positionX;
        this.positionY = positionY;
        if (flipX != null) {
            this.flipX = flipX;
        }
        if (tiltDeg != null) {
            this.tiltDeg = tiltDeg;
        }
        this.layerIndex = layerIndex;
    }
}
