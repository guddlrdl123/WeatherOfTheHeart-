package com.woth.backend.plaza;

import com.woth.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * [plaza_entry_reports 테이블 매핑 엔티티]
 * 광장 글/오브젝트에 대한 사용자 신고 기록입니다.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@Table(
        name = "plaza_entry_reports",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_reporter_plaza_entry", columnNames = {"reporter_id", "plaza_entry_id"})
        },
        indexes = {
                @Index(name = "idx_plaza_entry_reports_plaza_id", columnList = "plaza_id"),
                @Index(name = "idx_plaza_entry_reports_reported_user_id", columnList = "reported_user_id"),
                @Index(name = "idx_plaza_entry_reports_created_at", columnList = "created_at")
        }
)
public class PlazaEntryReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_user_id", nullable = false)
    private User reportedUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plaza_id", nullable = false)
    private Plaza plaza;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plaza_entry_id", nullable = false)
    private PlazaEntry plazaEntry;

    @Column(nullable = false, length = 50)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String detail;

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
}
