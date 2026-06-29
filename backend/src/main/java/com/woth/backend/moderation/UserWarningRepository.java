package com.woth.backend.moderation;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserWarningRepository extends JpaRepository<UserWarning, Long> {
    long countByUserId(Long userId);
}
