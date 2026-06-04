package com.woth.backend.auth;

import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.user.User;
import com.woth.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
/*
    * 인증 관련 비즈니스 로직을 처리하는 서비스 클래스
    * 로그인과 회원가입 기능을 담당하며, 관리자 계정에 대한 특별한 처리를 포함
*/
@Service
public class AuthService {

    private static final String ADMIN_EMAIL = "admin@maeum.weather";
    private static final String ADMIN_PASSWORD = "admin1234";
    private static final String DEFAULT_NICKNAME = "나그네";

    private final UserRepository userRepository;
    private final EmailVerificationService emailVerificationService;

    public AuthService(UserRepository userRepository, EmailVerificationService emailVerificationService) {
        this.userRepository = userRepository;
        this.emailVerificationService = emailVerificationService;
    }

    @Transactional
    public User login(String email, String password) {
        if (ADMIN_EMAIL.equals(email) && ADMIN_PASSWORD.equals(password)) {
            return userRepository.findByEmail(email)
                    .map(user -> {
                        user.promoteToAdmin(password);
                        return user;
                    })
                    .orElseGet(() -> createAdminUser(email, password));
        }

        return userRepository.findByEmail(email)
                .filter(user -> user.getPassword().equals(password))
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    @Transactional
    public User signup(String email, String password, String nickname) {
        if (userRepository.existsByEmail(email)) {
            throw new CustomException(ErrorCode.USER_ALREADY_EXISTS);
        }
        emailVerificationService.ensureVerified(email);

        User user = User.builder()
                .email(email)
                .password(password)
                .nickname(resolveNickname(nickname))
                // 일반 회원가입 사용자는 관리자 권한 없이 생성
                .isAdmin(false)
                .build();

        User savedUser = userRepository.save(user);
        emailVerificationService.clear(email);
        return savedUser;
    }

    private User createAdminUser(String email, String password) {
        User admin = User.builder()
                .email(email)
                .password(password)
                .nickname("Admin")
                .isAdmin(true)
                .build();

        return userRepository.save(admin);
    }

    private String resolveNickname(String nickname) {
        if (nickname == null || nickname.isBlank()) {
            return DEFAULT_NICKNAME;
        }

        return nickname.trim();
    }
}
