package com.woth.backend.auth;

import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.user.User;
import com.woth.backend.user.UserRepository;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

/**
 * [비밀번호 재설정 서비스]
 * 비밀번호 찾기 요청 시 6자리 인증코드를 발급하고, 코드 검증 후 비밀번호를 변경하는 서비스입니다.
 */
@Service
public class PasswordResetService {

    private static final int RESET_TOKEN_EXPIRES_MINUTES = 10;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public PasswordResetService(
            PasswordResetTokenRepository passwordResetTokenRepository,
            UserRepository userRepository,
            JavaMailSender mailSender,
            PasswordEncoder passwordEncoder
    ) {
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.userRepository = userRepository;
        this.mailSender = mailSender;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void requestReset(String email) {
        User user = userRepository.findByEmailAndIsDeletedFalse(email).orElse(null);

        if (user == null) {
            return;
        }

        String resetEmail = user.getEmail();
        String token = generateToken();
        passwordResetTokenRepository.deleteByEmail(resetEmail);
        passwordResetTokenRepository.save(new PasswordResetToken(
                resetEmail,
                token,
                LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRES_MINUTES)
        ));

        sendMail(resetEmail, token);
    }

    @Transactional(readOnly = true)
    public void verifyToken(String email, String token) {
        getValidResetToken(email, token);
    }

    @Transactional
    public void resetPassword(String email, String token, String newPassword) {
        PasswordResetToken resetToken = getValidResetToken(email, token);
        User user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        user.updatePassword(passwordEncoder.encode(newPassword));
        resetToken.markUsed();
    }

    private PasswordResetToken getValidResetToken(String email, String token) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findTopByEmailOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new CustomException(ErrorCode.PASSWORD_RESET_TOKEN_INVALID));

        if (Boolean.TRUE.equals(resetToken.getUsed()) || !resetToken.matches(token)) {
            throw new CustomException(ErrorCode.PASSWORD_RESET_TOKEN_INVALID);
        }

        if (resetToken.isExpired()) {
            throw new CustomException(ErrorCode.PASSWORD_RESET_TOKEN_EXPIRED);
        }

        return resetToken;
    }

    private String generateToken() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    private void sendMail(String email, String token) {
        if (mailUsername == null || mailUsername.isBlank()) {
            throw new CustomException(ErrorCode.EMAIL_SEND_FAILED);
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");

            helper.setFrom(new InternetAddress(mailUsername, "마음의 날씨"));
            helper.setTo(email);
            helper.setSubject("[마음의 날씨] 비밀번호 재설정 인증코드");
            helper.setText(
                    "비밀번호 재설정 인증코드는 " + token + " 입니다. 10분 안에 입력해 주세요.",
                    false
            );

            mailSender.send(mimeMessage);
        } catch (Exception e) {
            throw new CustomException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }
}
