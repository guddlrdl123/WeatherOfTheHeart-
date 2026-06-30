package com.woth.backend.plaza;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PlazaEntryReportRepository extends JpaRepository<PlazaEntryReport, Long> {

    boolean existsByReporterIdAndPlazaEntryId(Long reporterId, Long plazaEntryId);
    List<PlazaEntryReport> findAllByOrderByCreatedAtDesc();

    @Modifying
    @Query("delete from PlazaEntryReport report where report.plazaEntry.id = :plazaEntryId")
    void deleteByPlazaEntryId(@Param("plazaEntryId") Long plazaEntryId);

    @Modifying
    @Query("delete from PlazaEntryReport report where report.plaza.id = :plazaId")
    void deleteByPlazaId(@Param("plazaId") Long plazaId);

    @Modifying
    @Query("""
            delete from PlazaEntryReport report
            where report.plaza.id in (
                select plaza.id from Plaza plaza
                where plaza.owner.id = :ownerId
            )
            """)
    void deleteByPlazaOwnerId(@Param("ownerId") Long ownerId);

    @Modifying
    @Query("""
            delete from PlazaEntryReport report
            where report.plazaEntry.id in (
                select entry.id from PlazaEntry entry
                where entry.owner.id = :ownerId
                  and entry.plaza.completedAt is null
            )
            """)
    void deleteOpenByPlazaEntryOwnerId(@Param("ownerId") Long ownerId);

    // [추가] 회원 탈퇴(하드 삭제) 시 신고자/피신고자가 해당 회원인 신고를 함께 제거
    // (reporter_id, reported_user_id 모두 NOT NULL FK라 회원을 지우려면 반드시 정리 필요)
    @Modifying
    @Query("""
            delete from PlazaEntryReport report
            where report.reporter.id = :userId
               or report.reportedUser.id = :userId
            """)
    void deleteByReporterOrReportedUserId(@Param("userId") Long userId);
}
