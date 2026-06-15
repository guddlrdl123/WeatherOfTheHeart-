package com.woth.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    @Modifying
    @Query("delete from RefreshToken token where token.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
