package com.woth.backend.like;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ObjectLikeRepository extends JpaRepository<ObjectLike, Long> {
    Optional<ObjectLike> findByUserIdAndPlazaEntryId(Long userId, Long plazaEntryId);
    long countByPlazaEntryId(Long plazaEntryId);
    List<ObjectLike> findByPlazaEntryId(Long plazaEntryId);
    void deleteByPlazaEntryId(Long plazaEntryId);
}
