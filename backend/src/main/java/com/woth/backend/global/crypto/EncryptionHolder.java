package com.woth.backend.global.crypto;

import org.springframework.stereotype.Component;

/**
 * JPA AttributeConverter 는 (기본적으로) 스프링 빈이 아니어서 의존성 주입이 보장되지 않습니다.
 * 스프링이 관리하는 {@link AesGcmTextEncryptor} 를 정적 참조로 연결해, 컨버터에서 안전하게 사용하도록 합니다.
 */
@Component
public class EncryptionHolder {

    private static AesGcmTextEncryptor encryptor;

    public EncryptionHolder(AesGcmTextEncryptor encryptor) {
        EncryptionHolder.encryptor = encryptor;
    }

    public static AesGcmTextEncryptor encryptor() {
        if (encryptor == null) {
            throw new IllegalStateException("AesGcmTextEncryptor 가 아직 초기화되지 않았습니다.");
        }
        return encryptor;
    }
}
