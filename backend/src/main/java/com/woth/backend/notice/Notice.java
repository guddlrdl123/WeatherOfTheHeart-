package com.woth.backend.notice;

import com.woth.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * [notices 테이블 매핑 엔티티]
 * 관리자가 작성하는 공지사항을 저장하는 엔티티입니다.
 * 공지는 모든 사용자가 열람할 수 있고, 작성/수정/삭제는 관리자만 가능합니다.
 */
@Entity
@Table(name = "notices")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author; // 작성한 관리자 (소프트 삭제 정책이라 참조 유지)

    @Column(name = "author_nickname", length = 20)
    private String authorNickname; // 작성 시점 관리자 닉네임 스냅샷

    @Column(nullable = false, length = 100)
    private String title; // 공지 제목

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content; // 공지 내용

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }
}
