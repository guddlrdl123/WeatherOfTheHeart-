package com.woth.backend.notice;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 공지사항 엔티티에 대한 JPA 리포지토리입니다.
 * 최신 공지부터 페이지 단위로 조회합니다.
 */
public interface NoticeRepository extends JpaRepository<Notice, Long> {
    Page<Notice> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // [추가] 회원 탈퇴(하드 삭제) 시 공지 글은 닉네임 스냅샷으로 보존하고 작성자 참조만 해제
    @Modifying
    @Query("update Notice notice set notice.author = null where notice.author.id = :userId")
    void clearAuthorByUserId(@Param("userId") Long userId);
}
