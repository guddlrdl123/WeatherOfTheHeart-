package com.woth.backend.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
/*
 * 사용자 엔티티에 대한 JPA 리포지토리
 * 이메일 기반 조회와 중복 이메일 검사 기능
 */
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}