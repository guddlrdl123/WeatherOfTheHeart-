package com.woth.backend.moderation;

import com.woth.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "user_warnings",
        indexes = {
                @Index(name = "idx_user_warnings_user_id", columnList = "user_id"),
                @Index(name = "idx_user_warnings_created_at", columnList = "created_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class UserWarning {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "source_entry_id")
    private Long sourceEntryId;

    @Column(name = "source_entry_title", length = 100)
    private String sourceEntryTitle;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Column(name = "issued_by_nickname", nullable = false, length = 20)
    private String issuedByNickname;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
