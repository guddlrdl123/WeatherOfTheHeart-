package com.woth.backend.auth;

import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
/**
 * [이메일 인증 서비스]
 * 이메일 인증 코드를 생성, 전송, 검증하는 서비스 클래스
 * 인증번호 생성, 메일 발송, 인증번호 확인, 회원가입 전 인증 완료 여부 검사를 담당
 * 인증번호는 6자리 숫자로 생성되며, 발송된 인증번호는 10분 동안 유효
 */
@Service
public class EmailVerificationService {

    private static final int CODE_BOUND = 1_000_000;
    private static final int CODE_EXPIRES_MINUTES = 10;

    private final EmailVerificationRepository emailVerificationRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public EmailVerificationService(
            EmailVerificationRepository emailVerificationRepository,
            UserRepository userRepository,
            JavaMailSender mailSender
    ) {
        this.emailVerificationRepository = emailVerificationRepository;
        this.userRepository = userRepository;
        this.mailSender = mailSender;
    }

    @Transactional
    public void sendCode(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new CustomException(ErrorCode.USER_ALREADY_EXISTS);
        }

        String code = generateCode();
        EmailVerification verification = new EmailVerification(
                email,
                code,
                LocalDateTime.now().plusMinutes(CODE_EXPIRES_MINUTES)
        );
        emailVerificationRepository.save(verification);

        sendMail(email, code);
    }

    @Transactional
    public void verifyCode(String email, String code) {
        EmailVerification verification = emailVerificationRepository.findTopByEmailOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new CustomException(ErrorCode.EMAIL_CODE_INVALID));

        if (verification.isExpired()) {
            throw new CustomException(ErrorCode.EMAIL_CODE_EXPIRED);
        }

        if (!verification.matches(code)) {
            throw new CustomException(ErrorCode.EMAIL_CODE_INVALID);
        }

        verification.verify();
    }

    @Transactional(readOnly = true)
    public void ensureVerified(String email) {
        EmailVerification verification = emailVerificationRepository.findTopByEmailOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new CustomException(ErrorCode.EMAIL_NOT_VERIFIED));

        if (!Boolean.TRUE.equals(verification.getVerified()) || verification.isExpired()) {
            throw new CustomException(ErrorCode.EMAIL_NOT_VERIFIED);
        }
    }

    @Transactional
    public void clear(String email) {
        emailVerificationRepository.deleteByEmail(email);
    }

    private String generateCode() {
        return String.format("%06d", secureRandom.nextInt(CODE_BOUND));
    }

    private void sendMail(String email, String code) {
        if (mailUsername == null || mailUsername.isBlank()) {
            throw new CustomException(ErrorCode.EMAIL_SEND_FAILED);
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailUsername);
        message.setTo(email);
        message.setSubject("[마음의 날씨] 이메일 인증번호");
        message.setText("인증번호는 " + code + " 입니다. 10분 안에 입력해주세요.");

        try {
            mailSender.send(message);
        } catch (MailException e) {
            throw new CustomException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }
}
