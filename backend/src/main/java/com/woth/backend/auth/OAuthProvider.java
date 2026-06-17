package com.woth.backend.auth;

import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;

import java.util.Arrays;

public enum OAuthProvider {
    GOOGLE("google"),
    KAKAO("kakao"),
    NAVER("naver");

    private final String key;

    OAuthProvider(String key) {
        this.key = key;
    }

    public String key() {
        return key;
    }

    public static OAuthProvider from(String value) {
        return Arrays.stream(values())
                .filter(provider -> provider.key.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT));
    }
}
