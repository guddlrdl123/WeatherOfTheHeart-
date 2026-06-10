package com.woth.backend.object;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
/*
    * [object_catalogs 테이블 매핑 엔티티]
    * 방 내부에 배치할 수 있는 사물의 종류(카탈로그) 정보를 관리하는 클래스
     - 사물의 고유한 식별자(id), 사물 종류를 나타내는 objectKey, 사물의 한글 명칭 objectName으로 구성
     - createdAt과 updatedAt 필드를 통해 사물 카탈로그 정보의 생성 및 수정 일시를 관리
     - @PrePersist와 @PreUpdate 메서드를 활용하여 엔티티가 저장되거나 업데이트될 때 자동으로 타임스탬프를 갱신
*/
@Entity
@Table(name = "object_catalogs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ObjectCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // 사물 등록 일련번호

    @Column(name = "object_key", nullable = false, unique = true, length = 50)
    private String objectKey;  // 사물 식별 고유 문자열 코드 (예: sofa_blue_01) [cite: 225]

    @Column(name = "object_name", nullable = false, length = 50)
    private String objectName; // 사물의 명칭 (예: 파란색 소파)

    @Column(nullable = false, length = 30)
    private String mood;     // 사물이 대변하는 감정 태그 (마음 상태) [cite: 112]

    @Column(name = "slot_key", nullable = false, length = 50)
    private String slotKey;  // 사물이 들어갈 수 있는 고유 배치 슬롯 구역

    @Column(name = "image_url", length = 255)
    private String imageUrl; // DB에서 내려주는 오브젝트 이미지 경로입니다. 프론트는 이 경로를 S3 버킷 URL과 조합해 최종 이미지 URL을 완성 [cite: 226]

    @Column(name = "image_scale")
    private Double imageScale; // 프론트가 DB 카탈로그를 받아 오브젝트 크기를 복원할 때 사용하는 배율

    @Column(name = "room_width")
    private Integer roomWidth; // 프론트 렌더링에서 사용할 오브젝트 너비(px)

    @Column(name = "flip_x", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    @Builder.Default
    private Boolean flipX = false; // 기본 좌우 반전 여부

    @Column(name = "tilt_deg", nullable = false, columnDefinition = "INT DEFAULT 0")
    @Builder.Default
    private Integer tiltDeg = 0; // 기본 기울기 각도

    @Column(columnDefinition = "TEXT")
    private String description; // 오브젝트 설명 문구

    @Column(name = "is_active", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    @Builder.Default
    private Boolean isActive = true; // 현재 가구의 인게임 활성화/출시 여부

    @Column(name = "allow_private", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    @Builder.Default
    private Boolean allowPrivate = true; // 개인 방에서 선택 가능한 오브젝트인지 DB에서 관리

    @Column(name = "allow_plaza", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    @Builder.Default
    private Boolean allowPlaza = true; // 광장에서 선택 가능한 오브젝트인지 DB에서 관리

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt; // DB의 created_at 컬럼 매핑 (최초 등록 후 수정 불가) [cite: 227]

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt; // DB의 updated_at 컬럼 매핑 (수정 시마다 갱신) [cite: 228]

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

    public void syncCatalogData(
            String objectName,
            String mood,
            String slotKey,
            String imageUrl,
            Double imageScale,
            Integer roomWidth,
            Boolean flipX,
            Integer tiltDeg,
            String description,
            Boolean allowPrivate,
            Boolean allowPlaza,
            Boolean isActive
    ) {
        // 서버 시작 시 기본 카탈로그 seed와 기존 DB 데이터를 맞춰 프론트가 DB 기준 오브젝트 목록을
        // 항상 받아갈 수 있도록 하는 메서드. 기본 카탈로그에 변경이 생긴 경우에도 이 메서드를 활용해 DB 데이터를 업데이트할 수 있다.
        this.objectName = objectName;
        this.mood = mood;
        this.slotKey = slotKey;
        this.imageUrl = imageUrl;
        this.imageScale = imageScale;
        this.roomWidth = roomWidth;
        this.flipX = flipX;
        this.tiltDeg = tiltDeg;
        this.description = description;
        this.allowPrivate = allowPrivate;
        this.allowPlaza = allowPlaza;
        this.isActive = isActive;
    }

    public void deactivate() {
        // 카탈로그에서 사물을 삭제하는 대신 비활성화하여 기존 메모리 데이터의 무결성을 유지하는 방식으로 관리하기 위해 추가한 메서드
        this.isActive = false;
    }
}
