package com.woth.backend.user;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/*
 * [users 테이블 매핑 엔티티]
 * 익명 사용자 및 회원 정보를 저장하고 관리하는 도메인 클래스
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // 무분별한 객체 생성 방지
@AllArgsConstructor(access = AccessLevel.PRIVATE)  // 빌더 패턴 사용을 위한 전체 생성자
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // AUTO_INCREMENT 설정 적용

    @Column(nullable = false, unique = true, length = 100) // NOT NULL, UNIQUE 제약조건
    private String email;

    @Column(nullable = false) // 로그인 비밀번호 (암호화되어 저장됨)
    private String password;

    @Column(nullable = false, length = 10) // 화면에 노출될 유저의 닉네임
    private String nickname;

    @Column(name = "is_admin", nullable = false)
    @Builder.Default
    private Boolean isAdmin = false; // 관리자 여부 (기본값 false)

    // [수정] 회원 탈퇴 시 하드 삭제 대신 상태값으로 관리하기 위한 필드
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    // [수정] 회원 탈퇴 시각 저장
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP") // DB default도 함께 둬 SQL 직접 INSERT 시에도 생성 시간이 채워짐
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") // DB default/on update를 명시해 DBeaver에서도 기본값이 보이게 함
    private LocalDateTime updatedAt;

    // 데이터가 처음 저장(Insert)되기 직전에 실행되어 시간을 채워줌
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // 데이터가 수정(Update)되기 직전에 실행되어 수정 시간을 갱신함
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void promoteToAdmin(String password) {
        // 개발용 관리자 계정이 이미 일반 유저로 존재해도 백엔드 권한 기준을 관리자 상태로 맞춤
        this.password = password;
        this.nickname = "Admin";
        this.isAdmin = true;
    }

    public void updateNickname(String nickname) {
        this.nickname = nickname;
    }

    public void updatePassword(String password) {
        this.password = password;
    }

    // [수정] 회원 탈퇴 시 soft delete 처리
    public void withdraw() {
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
    }
}
