package com.woth.backend.auth;

public record AuthenticatedUser(
        Long id,
        String email,
        String nickname,
        Boolean isAdmin
) {
}
