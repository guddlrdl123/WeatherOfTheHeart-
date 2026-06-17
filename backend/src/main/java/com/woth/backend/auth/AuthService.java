package com.woth.backend.auth;

import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.user.User;
import com.woth.backend.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
/*
    * 인증 관련 비즈니스 로직을 처리하는 서비스 클래스
    * 로그인과 회원가입 기능을 담당하며, 관리자 계정에 대한 특별한 처리를 포함
*/
@Service
public class AuthService {

    private static final String ADMIN_EMAIL = "admin@maeum.weather";
    private static final String ADMIN_PASSWORD = "admin1234";
    private static final String DEFAULT_NICKNAME = "나그네";
    private static final int NICKNAME_MAX_LENGTH = 10;

    private final UserRepository userRepository;
    private final EmailVerificationService emailVerificationService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            EmailVerificationService emailVerificationService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.emailVerificationService = emailVerificationService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User login(String email, String password) {
        if (ADMIN_EMAIL.equals(email) && ADMIN_PASSWORD.equals(password)) {
            return userRepository.findByEmailAndIsDeletedFalse(email)
                    .map(user -> {
                        user.promoteToAdmin(passwordEncoder.encode(password));
                        return user;
                    })
                    .orElseGet(() -> createAdminUser(email, password));
        }

        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseGet(() -> {
                    if (userRepository.existsByEmail(email)) {
                        throw new CustomException(ErrorCode.USER_WITHDRAWN);
                    }
                    throw new CustomException(ErrorCode.USER_NOT_FOUND);
                });

        if (!matchesPassword(password, user.getPassword())) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }

        migratePlainTextPasswordIfNeeded(user, password);
        return user;
    }

    @Transactional
    public User signup(String email, String password, String nickname) {
        if (userRepository.existsByEmail(email)) {
            if (userRepository.existsByEmailAndIsDeletedFalse(email)) {
                throw new CustomException(ErrorCode.USER_ALREADY_EXISTS);
            }
            throw new CustomException(ErrorCode.USER_WITHDRAWN);
        }
        emailVerificationService.ensureVerified(email);

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .nickname(resolveNickname(nickname))
                // 일반 회원가입 사용자는 관리자 권한 없이 생성
                .isAdmin(false)
                .build();

        User savedUser = userRepository.save(user);
        emailVerificationService.clear(email);
        return savedUser;
    }

    @Transactional
    public User loginWithOAuth(OAuthProfile profile) {
        if (profile.email() == null || profile.email().isBlank()) {
            throw new CustomException(ErrorCode.OAUTH_EMAIL_MISSING);
        }

        String email = profile.email().trim();

        return userRepository.findByEmailAndIsDeletedFalse(email)
                .map(user -> {
                    user.linkOAuth(profile.provider().key(), profile.providerId());
                    return user;
                })
                .orElseGet(() -> {
                    if (userRepository.existsByEmail(email)) {
                        throw new CustomException(ErrorCode.USER_WITHDRAWN);
                    }

                    User user = User.builder()
                            .email(email)
                            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                            .nickname(resolveNickname(profile.nickname()))
                            .isAdmin(false)
                            .authProvider(profile.provider().key())
                            .authProviderId(profile.providerId())
                            .build();

                    return userRepository.save(user);
                });
    }

    private User createAdminUser(String email, String password) {
        User admin = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .nickname("Admin")
                .isAdmin(true)
                .build();

        return userRepository.save(admin);
    }

    private boolean matchesPassword(String rawPassword, String storedPassword) {
        if (isBcryptHash(storedPassword)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }

        return storedPassword.equals(rawPassword);
    }

    private void migratePlainTextPasswordIfNeeded(User user, String rawPassword) {
        if (user.getPassword().equals(rawPassword)) {
            user.updatePassword(passwordEncoder.encode(rawPassword));
        }
    }

    private boolean isBcryptHash(String value) {
        return value != null
                && (value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$"));
    }

    private String resolveNickname(String nickname) {
        if (nickname == null || nickname.isBlank()) {
            return DEFAULT_NICKNAME;
        }

        String trimmedNickname = nickname.trim();

        if (trimmedNickname.length() <= NICKNAME_MAX_LENGTH) {
            return trimmedNickname;
        }

        return trimmedNickname.substring(0, NICKNAME_MAX_LENGTH);
    }
}
