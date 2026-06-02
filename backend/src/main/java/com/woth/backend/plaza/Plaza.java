package com.woth.backend.plaza;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

// [plaza 테이블 매핑 엔티티]
@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "plazas")
public class Plaza {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(nullable = false, length = 100)
    private String title; // 광장: 이름 또는 주제

    @Column(nullable = false, columnDefinition = "TEXT")
    private String topic; // 광장: 주제 또는 소개글

    @Column(name = "max_objects", nullable = false)
    @Builder.Default
    private Integer maxObjects=8; // 광장: 최대 오브젝트의 수

    @Column(name = "allow_invite", nullable = false)
    @Builder.Default
    private Boolean allowInvite = true; // 광장: 초대 허용여부

    @Column(name = "allow_duplicate_object", nullable = false)
    @Builder.Default
    private  Boolean allowDuplicateObject = false; // 광장: 동일 오브젝트 중복 허용 여부

    @Column(name = "background_type", nullable = false, length = 20)
    @Builder.Default
    private String backgroundType = "weather"; // 광장: 프론트 광장 배경방식(DB에 보존)

    @Column(name = "background_color", length = 20)
    private String backgroundColor; // 광장: color 배경을 선택했을 때 사용(HEX 색상값)

    @Column(name = "background_key", nullable = false, length = 50)
    private String backgroundKey; // 광장: 배경의 날씨 키

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private  Boolean isActive = true;
    // 광장: 활성화 및 노출 여부

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    // 광장: 최대 오브젝트 수에 도달하여 광장이 완성되고 우편이 발송된 시각

    @Column(name = "create_at")
    private LocalDateTime createAt;

    @Column(name = "update_at")
    private LocalDateTime updateAt;

    @PrePersist
    protected  void onCrete() {
        this.createAt = LocalDateTime.now();
        this.updateAt = LocalDateTime.now();
    } // Insert 쿼리가 나가기 직전에 실행(생성 및 수정이 현재 시간으로 초기화)

    @PreUpdate
    protected void onUpdate() {
        this.updateAt = LocalDateTime.now();
    } // UpDate 쿼리가 나가기 직전에 실행(수정일만 현재 시간으로 갱신)

    public boolean isCompleted() {
        return completedAt !=null;
    }

    public void markCompleted(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    } // 광장: 완성 처리와 우편 발송이 중복 실행하지 않도록,
    // 완료 시각을 엔티티에 기록.

}
