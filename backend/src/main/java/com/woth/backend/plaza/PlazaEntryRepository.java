package com.woth.backend.plaza;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 플라자 엔트리 엔티티에 대한 JPA 리포지토리입니다.
 * 특정 광장에 속한 엔트리 조회와 참가/중복 검사 메서드를 제공합니다.
 */
public interface PlazaEntryRepository extends JpaRepository<PlazaEntry, Long> {

    List<PlazaEntry> findByPlazaId(Long plazaId);
    List<PlazaEntry> findByOwnerId(Long ownerId);
    Optional<PlazaEntry> findByPlazaIdAndOwnerId(Long plazaId, Long ownerId);
    long countByPlazaId(Long plazaId);
    boolean existsByPlazaIdAndOwnerId(Long plazaId, Long ownerId);
    boolean existsByPlazaIdAndObjectKey(Long plazaId, String objectKey);

    @Modifying
    @Query("delete from PlazaEntry entry where entry.plaza.id = :plazaId")
    void deleteByPlazaId(@Param("plazaId") Long plazaId);
}
