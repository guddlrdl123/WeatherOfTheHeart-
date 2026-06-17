package com.woth.backend.auth;

public record OAuthProfile(
        OAuthProvider provider,
        String providerId,
        String email,
        String nickname
) {
}
