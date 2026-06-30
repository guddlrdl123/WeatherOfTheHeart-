package com.woth.backend.inquiry;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 1:1 문의 엔티티에 대한 JPA 리포지토리입니다.
 * 최신 문의부터 페이지 단위로 조회합니다.
 */
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    Page<Inquiry> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // [추가] 회원 탈퇴(하드 삭제) 시 문의 글은 닉네임/이메일 스냅샷으로 보존하고 작성자 참조만 해제
    @Modifying
    @Query("update Inquiry inquiry set inquiry.author = null where inquiry.author.id = :userId")
    void clearAuthorByUserId(@Param("userId") Long userId);
}
