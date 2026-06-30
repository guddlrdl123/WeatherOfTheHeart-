package com.woth.backend.inquiry;

import com.woth.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * [inquiries 테이블 매핑 엔티티]
 * 사용자가 남긴 1:1 문의를 저장하는 엔티티입니다.
 * 작성자 정보(닉네임/이메일)는 작성 시점 값을 스냅샷으로 함께 보관해,
 * 관리자가 목록을 조회할 때 별도 조인 없이 작성자를 확인할 수 있게 합니다.
 */
@Entity
@Table(name = "inquiries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Inquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author; // 문의 작성자 (소프트 삭제 정책이라 회원이 사라져도 참조는 유지됩니다.)

    @Column(name = "author_nickname", length = 20)
    private String authorNickname; // 작성 시점 닉네임 스냅샷

    @Column(name = "author_email", length = 100)
    private String authorEmail; // 작성 시점 이메일 스냅샷 (관리자 답변용)

    @Column(nullable = false, length = 100)
    private String title; // 문의 제목

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content; // 문의 내용

    @Column(name = "is_public", nullable = false)
    private boolean isPublic; // 공개 여부 (true=모두 열람, false=작성자/관리자만 열람)

    @Column(columnDefinition = "TEXT")
    private String answer; // 관리자 답변 (없으면 null)

    @Column(name = "answerer_nickname", length = 20)
    private String answererNickname; // 답변한 관리자 닉네임 스냅샷

    @Column(name = "answered_at")
    private LocalDateTime answeredAt; // 답변 작성 시각 (없으면 null)

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

    // 관리자가 답변을 작성/수정합니다. 답변 내용과 작성자(관리자) 닉네임, 시각을 갱신합니다.
    public void writeAnswer(String answer, String answererNickname) {
        this.answer = answer;
        this.answererNickname = answererNickname;
        this.answeredAt = LocalDateTime.now();
    }

    public boolean isAnswered() {
        return this.answer != null && !this.answer.isBlank();
    }
}
