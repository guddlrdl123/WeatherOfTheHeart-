package com.woth.backend.inquiry;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 1:1 문의 엔티티에 대한 JPA 리포지토리입니다.
 * 최신 문의부터 페이지 단위로 조회합니다.
 */
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    Page<Inquiry> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
