package com.woth.backend.moderation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserWarningRepository extends JpaRepository<UserWarning, Long> {
    long countByUserId(Long userId);

    // [추가] 회원 탈퇴(하드 삭제) 시 해당 회원이 받은 경고를 함께 제거
    @Modifying
    @Query("delete from UserWarning warning where warning.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
