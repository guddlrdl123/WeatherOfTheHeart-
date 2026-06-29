package com.woth.backend.mailbox;

import com.woth.backend.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.boot.CommandLineRunner;

import java.time.LocalDateTime;

/**
 * [letters 테이블 매핑 엔티티]
 * 광장 종료 후 업스케일링된 사진을 받는 편지 정보를 저장하는 엔티티입니다.
 */

@Entity
@Table(name = "letters")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Letter {

    public static final String CATEGORY_PLAZA = "PLAZA";
    public static final String CATEGORY_WARNING = "WARNING";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; //AUTO_INCREMENT 설정 적용 (편지 고유 식별자)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @Column(nullable = false, length = 100)
    private String title; // 편지 제목

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message; // 편지 본문 내용

    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'PLAZA'")
    @Builder.Default
    private String category = CATEGORY_PLAZA;

    @Column(name = "warning_count")
    private Long warningCount;

    @Column(name = "plaza_title", nullable = false, length = 100)
    private String plazaTitle; // 완료된 광장의 제목

    @Column(name = "plaza_id")
    private Long plazaId; // 같은 광장의 완료된 우편이 중복 발송되지 않도록 추적하는 광장 ID

    @Column(name = "generated_image_data", columnDefinition = "LONGTEXT")
    private String generatedImageData;  // AI가 생성한 완성 광장 이미지 data URL(base64)
                                        // 추후 S3 URL로 교체 가능
    @Column(name = "completed_at", nullable = false)
    private LocalDateTime completedAt; // 광장 완료 시각

    @Column(name = "plaza_created_at")
    private LocalDateTime plazaCreatedAt;

    @Column(name = "participant_count")
    private Long participantCount;

    @Column(name = "my_object_key", length = 100)
    private String myObjectKey;

    @Column(name = "my_object_title", length = 100)
    private String myObjectTitle;

    @Column(name = "my_object_content", columnDefinition = "TEXT")
    private String myObjectContent;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead =false; // 수신자의 편지 읽음 여부

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, updatable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCrete() {
        this.createdAt =LocalDateTime.now();
        this.updatedAt =LocalDateTime.now();
    } // INSERT 쿼리가 나가기 직전 실행(생성 및 수정일을 현재 시간으로 초기화)

    @PreUpdate
    protected  void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    public void markRead(){
        this.isRead= true; // 읽음 처리는 기존 편지내용을 보존하고 isRead 값만 바꿉니다.
    }

}


























