package com.woth.backend.like;

import com.woth.backend.plaza.PlazaEntry;
import com.woth.backend.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.cglib.core.Local;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * [object_likes 테이블 매핑 엔티티]
 * 유저들이 광장에 올라온 다른 사람의 피드(PlazaEntry)에 누른 좋아요 기록 데이터입니다.
 */

@Entity
@Getter
@NoArgsConstructor (access = AccessLevel.PROTECTED)
@AllArgsConstructor (access = AccessLevel.PRIVATE)
@Table(name = "object_likes", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_plaza_entry", columnNames = {"user_id", "plaza_entry_id"})
})
public class ObjectLike {

    @Id
    @GeneratedValue(strategy =  GenerationType.IDENTITY)
    private Long id; //AUTO_INCREMENT 설정 적용, 좋아요 고유 식별자

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_entry_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plaza_entry_id", nullable = false)
    private PlazaEntry plazaEntry;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, updatable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected  void onCreat(){
        this.createdAt =LocalDateTime.now();
        this.updatedAt =LocalDateTime.now();
    } // INSERT 쿼리가 나가기 직전에 실행, 생성 및 수정일을 현재 시간으로 초기화

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    } // UPDATE 쿼리가 나가기 직전에 실행, 수정일만 현재 시간으로 갱신
}












