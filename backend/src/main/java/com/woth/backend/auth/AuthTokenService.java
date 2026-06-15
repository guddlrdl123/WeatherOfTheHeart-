package com.woth.backend.auth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.user.User;
import com.woth.backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuthTokenService {

    private static final String TOKEN_TYPE = "Bearer ";
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    private final String secret;
    private final long expiresInSeconds;

    public AuthTokenService(
            ObjectMapper objectMapper,
            UserRepository userRepository,
            @Value("${auth.jwt.secret:${JWT_SECRET:weather-of-the-heart-local-dev-secret-change-me}}") String secret,
            @Value("${auth.jwt.expires-in-seconds:${JWT_EXPIRES_IN_SECONDS:86400}}") long expiresInSeconds
    ) {
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
        this.secret = secret;
        this.expiresInSeconds = expiresInSeconds;
    }

    public IssuedToken issue(User user) {
        Instant expiresAt = Instant.now().plusSeconds(expiresInSeconds);

        Map<String, Object> header = Map.of(
                "alg", "HS256",
                "typ", "JWT"
        );
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", String.valueOf(user.getId()));
        payload.put("email", user.getEmail());
        payload.put("nickname", user.getNickname());
        payload.put("admin", Boolean.TRUE.equals(user.getIsAdmin()));
        payload.put("exp", expiresAt.getEpochSecond());

        String encodedHeader = encodeJson(header);
        String encodedPayload = encodeJson(payload);
        String signature = sign(encodedHeader + "." + encodedPayload);

        return new IssuedToken(encodedHeader + "." + encodedPayload + "." + signature, expiresAt.toString());
    }

    public AuthenticatedUser parseBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith(TOKEN_TYPE)) {
            throw new CustomException(ErrorCode.AUTH_REQUIRED);
        }

        return parse(authorizationHeader.substring(TOKEN_TYPE.length()).trim());
    }

    private AuthenticatedUser parse(String token) {
        String[] parts = token.split("/.");

        if (parts.length != 3) {
            throw new CustomException(ErrorCode.AUTH_INVALID);
        }

        String signedContent = parts[0] + "." + parts[1];
        String expectedSignature = sign(signedContent);

        if (!constantTimeEquals(expectedSignature, parts[2])) {
            throw new CustomException(ErrorCode.AUTH_INVALID);
        }

        Map<String, Object> payload = decodeJson(parts[1]);
        long expiresAt = getLong(payload.get("exp"));

        if (expiresAt <= Instant.now().getEpochSecond()) {
            throw new CustomException(ErrorCode.AUTH_EXPIRED);
        }

        Long userId = Long.valueOf(String.valueOf(payload.get("sub")));
        User user = userRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_WITHDRAWN));

        return new AuthenticatedUser(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                Boolean.TRUE.equals(user.getIsAdmin())
        );
    }

    private String encodeJson(Map<String, Object> value) {
        try {
            return BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
        } catch (Exception e) {
            throw new CustomException(ErrorCode.AUTH_INVALID);
        }
    }

    private Map<String, Object> decodeJson(String value) {
        try {
            byte[] decoded = BASE64_URL_DECODER.decode(value);
            return objectMapper.readValue(decoded, new TypeReference<>() {
            });
        } catch (Exception e) {
            throw new CustomException(ErrorCode.AUTH_INVALID);
        }
    }

    private long getLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }

        return Long.parseLong(String.valueOf(value));
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return BASE64_URL_ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new CustomException(ErrorCode.AUTH_INVALID);
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        byte[] leftBytes = left.getBytes(StandardCharsets.UTF_8);
        byte[] rightBytes = right.getBytes(StandardCharsets.UTF_8);

        if (leftBytes.length != rightBytes.length) {
            return false;
        }

        int result = 0;
        for (int i = 0; i < leftBytes.length; i++) {
            result |= leftBytes[i] ^ rightBytes[i];
        }

        return result == 0;
    }

    public record IssuedToken(String accessToken, String expiresAt) {
    }
}
