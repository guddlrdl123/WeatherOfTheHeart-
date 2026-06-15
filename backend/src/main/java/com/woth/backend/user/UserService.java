package com.woth.backend.user;

import com.woth.backend.auth.EmailVerificationService; // [수정] 기존 이메일 인증 서비스를 재사용하기 위해 추가
import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private static final String DEFAULT_NICKNAME = "나그네";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerificationService; // [수정] 이메일 변경 시 인증코드 발송/검증 재사용

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmailVerificationService emailVerificationService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailVerificationService = emailVerificationService;
    }

    @Transactional(readOnly = true)
    public User getUser(Long userId) {
        return userRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    @Transactional
    public User updateProfile(Long userId, String nickname, String currentPassword, String newPassword) {
        User user = getUser(userId);
        user.updateNickname(resolveNickname(nickname));

        if (hasText(newPassword)) {
            validatePasswordChange(user, currentPassword, newPassword);
            user.updatePassword(passwordEncoder.encode(newPassword));
        } else if (hasText(currentPassword)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        return user;
    }

    // [수정] 현재 비밀번호를 다시 확인한 뒤 새 이메일로 인증코드를 발송
    @Transactional
    public void sendEmailChangeCode(Long userId, String currentPassword, String newEmail) {
        User user = getUser(userId);

        if (!hasText(currentPassword) || !hasText(newEmail)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        if (!matchesPassword(currentPassword, user.getPassword())) {
            throw new CustomException(ErrorCode.USER_PASSWORD_MISMATCH);
        }

        String normalizedEmail = newEmail.trim();

        // [수정] 현재 이메일과 동일한 주소로 변경 요청하는 경우 차단
        if (user.getEmail().equalsIgnoreCase(normalizedEmail)) {
            throw new CustomException(ErrorCode.EMAIL_SAME_AS_CURRENT);
        }

        // [수정] 이미 사용 중인 이메일이면 변경 불가
        if (userRepository.existsByEmailAndIsDeletedFalse(normalizedEmail)) {
            throw new CustomException(ErrorCode.USER_ALREADY_EXISTS);
        }

        // [수정] 기존 회원가입 이메일 인증 로직을 그대로 재사용해 새 이메일로 코드 발송
        emailVerificationService.sendCode(normalizedEmail);
    }

    // [수정] 새 이메일과 인증코드를 검증한 뒤 실제 이메일 반영
    @Transactional
    public User updateEmail(Long userId, String newEmail, String code) {
        User user = getUser(userId);

        if (!hasText(newEmail) || !hasText(code)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        String normalizedEmail = newEmail.trim();

        // [수정] 현재 이메일과 동일한 주소로 변경 요청하는 경우 차단
        if (user.getEmail().equalsIgnoreCase(normalizedEmail)) {
            throw new CustomException(ErrorCode.EMAIL_SAME_AS_CURRENT);
        }

        // [수정] 인증 완료 직전에도 중복 이메일 여부를 다시 확인
        if (userRepository.existsByEmailAndIsDeletedFalse(normalizedEmail)) {
            throw new CustomException(ErrorCode.USER_ALREADY_EXISTS);
        }

        // [수정] 기존 이메일 인증 검증 로직을 재사용
        emailVerificationService.verifyCode(normalizedEmail, code);

        user.updateEmail(normalizedEmail);

        // [수정] 이메일 변경 완료 후 인증 기록 정리
        emailVerificationService.clear(normalizedEmail);

        return user;
    }

    @Transactional
    public void withdraw(Long userId, String currentPassword) {
        User user = getUser(userId);

        if (!hasText(currentPassword)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        if (!matchesPassword(currentPassword, user.getPassword())) {
            throw new CustomException(ErrorCode.USER_PASSWORD_MISMATCH);
        }

        user.withdraw();
    }

    private void validatePasswordChange(User user, String currentPassword, String newPassword) {
        if (!hasText(currentPassword)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        if (!matchesPassword(currentPassword, user.getPassword())) {
            throw new CustomException(ErrorCode.USER_PASSWORD_MISMATCH);
        }

        if (newPassword.length() < 8 || !newPassword.matches(".*[^A-Za-z0-9].*")) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private String resolveNickname(String nickname) {
        if (nickname == null || nickname.isBlank()) {
            return DEFAULT_NICKNAME;
        }

        return nickname.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean matchesPassword(String rawPassword, String storedPassword) {
        if (isBcryptHash(storedPassword)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }

        return storedPassword.equals(rawPassword);
    }

    private boolean isBcryptHash(String value) {
        return value != null
                && (value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$"));
    }
}