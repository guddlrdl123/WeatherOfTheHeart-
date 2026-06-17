package com.woth.backend.notice;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 공지사항 엔티티에 대한 JPA 리포지토리입니다.
 * 최신 공지부터 페이지 단위로 조회합니다.
 */
public interface NoticeRepository extends JpaRepository<Notice, Long> {
    Page<Notice> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
