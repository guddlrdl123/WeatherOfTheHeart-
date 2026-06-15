package com.woth.backend.user;

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

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
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
