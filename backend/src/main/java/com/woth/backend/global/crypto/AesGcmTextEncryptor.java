package com.woth.backend.global.crypto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * 일기 본문/제목 같은 민감 문자열을 AES-256-GCM으로 암복호화하는 컴포넌트.
 *
 * 저장 포맷: "enc:v1:" + base64(IV(12바이트) || 암호문+인증태그)
 * - 접두어(PREFIX)로 평문/암호문을 구분하므로, 암호화 도입 전에 쌓인 기존 평문 데이터도
 *   그대로 읽을 수 있습니다. (마이그레이션 전 무중단 적용 가능)
 * - GCM은 매 암호화마다 임의 IV를 사용해 같은 평문도 매번 다른 암호문이 됩니다.
 */
@Component
public class AesGcmTextEncryptor {

    /** 암호문 식별 + 버전 태깅(추후 키/알고리즘 교체 대비) */
    public static final String PREFIX = "enc:v1:";

    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;          // GCM 권장 IV 길이(바이트)
    private static final int TAG_LENGTH_BITS = 128;   // GCM 인증 태그 길이(비트)

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public AesGcmTextEncryptor(@Value("${app.encryption.memory-key}") String base64Key) {
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(base64Key.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("MEMORY_ENCRYPTION_KEY 가 올바른 base64 형식이 아닙니다.", e);
        }
        if (keyBytes.length != 32) {
            throw new IllegalStateException(
                    "MEMORY_ENCRYPTION_KEY 는 base64로 인코딩된 256비트(32바이트) 키여야 합니다. 현재: "
                            + keyBytes.length + "바이트");
        }
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    public boolean isEncrypted(String value) {
        return value != null && value.startsWith(PREFIX);
    }

    /** 평문 -> "enc:v1:..." 암호문. null이거나 이미 암호화된 값은 그대로 반환합니다. */
    public String encrypt(String plaintext) {
        if (plaintext == null || isEncrypted(plaintext)) {
            return plaintext;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] cipherText = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

            return PREFIX + Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException("일기 암호화에 실패했습니다.", e);
        }
    }

    /** "enc:v1:..." 암호문 -> 평문. 접두어가 없는 값(기존 평문)은 그대로 반환합니다. */
    public String decrypt(String stored) {
        if (stored == null || !isEncrypted(stored)) {
            return stored;
        }
        try {
            byte[] combined = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
            byte[] iv = Arrays.copyOfRange(combined, 0, IV_LENGTH);
            byte[] cipherText = Arrays.copyOfRange(combined, IV_LENGTH, combined.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("일기 복호화에 실패했습니다. 암호화 키(MEMORY_ENCRYPTION_KEY)가 올바른지 확인하세요.", e);
        }
    }
}
