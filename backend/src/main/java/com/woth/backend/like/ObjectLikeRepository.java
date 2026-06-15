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
    @Query("delete from ObjectLike objectLike where objectLike.plazaEntry.plaza.id = :plazaId")
    void deleteByPlazaId(@Param("plazaId") Long plazaId);

    @Modifying
    @Query("delete from ObjectLike objectLike where objectLike.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("""
            delete from ObjectLike objectLike
            where objectLike.plazaEntry.id in (
                select entry.id from PlazaEntry entry where entry.owner.id = :ownerId
            )
            """)
    void deleteByPlazaEntryOwnerId(@Param("ownerId") Long ownerId);

    @Modifying
    @Query("""
            delete from ObjectLike objectLike
            where objectLike.plazaEntry.plaza.id in (
                select plaza.id from Plaza plaza
                where plaza.owner.id = :ownerId
            )
            """)
    void deleteByPlazaOwnerId(@Param("ownerId") Long ownerId);
}
