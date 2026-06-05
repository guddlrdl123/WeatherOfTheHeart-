package com.woth.backend.like;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ObjectLikeRepository extends JpaRepository<ObjectLike, Long> {
    Optional<ObjectLike> findByUserIdAndPlazaEntryId(Long userId, Long plazaEntryId);
    long countByPlazaEntryId(Long plazaEntryId);
    List<ObjectLike> findByPlazaEntryId(Long plazaEntryId);
    void deleteByPlazaEntryId(Long plazaEntryId);

    @Modifying
    @Query("delete from ObjectLike like where like.plazaEntry.plaza.id = :plazaId")
    void deleteByPlazaId(@Param("plazaId") Long plazaId);
}
