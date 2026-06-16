package com.woth.backend.auth;

import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.user.UserRepository;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.core.io.ClassPathResource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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
  private static final String EMAIL_LOGO_CONTENT_ID = "weatherLogo";

  private final EmailVerificationRepository emailVerificationRepository;
  private final UserRepository userRepository;
  private final JavaMailSender mailSender;
  private final SecureRandom secureRandom = new SecureRandom();

  @Value("${spring.mail.username:}")
  private String mailUsername;

  public EmailVerificationService(
      EmailVerificationRepository emailVerificationRepository,
      UserRepository userRepository,
      JavaMailSender mailSender) {
    this.emailVerificationRepository = emailVerificationRepository;
    this.userRepository = userRepository;
    this.mailSender = mailSender;
  }

  @Transactional
  public void sendCode(String email) {
    if (userRepository.existsByEmailAndIsDeletedFalse(email)) {
      throw new CustomException(ErrorCode.USER_ALREADY_EXISTS);
    }

    String code = generateCode();
    EmailVerification verification = new EmailVerification(
        email,
        code,
        LocalDateTime.now().plusMinutes(CODE_EXPIRES_MINUTES));
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

    // [수정] SimpleMailMessage 대신 MimeMessageHelper를 사용해서
    // 발신자 표시 이름을 "마음의 날씨"로 설정할 수 있도록 변경
    try {
      MimeMessage mimeMessage = mailSender.createMimeMessage();

      // [수정] UTF-8 인코딩을 사용해 한글 표시 이름이 깨지지 않도록 설정
      MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

      // [수정] 실제 로그인 계정(mailUsername)은 유지하고,
      // 수신자에게 보이는 발신자 이름만 "마음의 날씨"로 설정
      helper.setFrom(new InternetAddress(mailUsername, "마음의 날씨"));

      helper.setTo(email);

      // [수정] 제목 문구를 조금 더 간결하게 조정
      helper.setSubject("[마음의 날씨] 인증코드");

      helper.setText(
          "인증번호는 " + code + " 입니다. 10분 안에 입력해주세요.",
          buildVerificationEmailHtml(code));
      helper.addInline(
          EMAIL_LOGO_CONTENT_ID,
          new ClassPathResource("static/email/weather-logo.png"));

      mailSender.send(mimeMessage);
    } catch (Exception e) {
      throw new CustomException(ErrorCode.EMAIL_SEND_FAILED);
    }
  }

  private String buildVerificationEmailHtml(String code) {
    return """
        <div style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#3f3f46;">
          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background-color:#ffffff;">
            <tr>
              <td align="center" style="padding:48px 20px;">
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:520px;">
                  <tr>
                    <td align="center" style="padding-bottom:34px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:12px auto 0;">
                        <tr>
                          <td align="center" valign="middle" style="width:48px;height:48px;border-radius:14px;background-color:#dff4cf;">
                            <img src="cid:%s" width="34" height="34" alt="" style="display:block;width:34px;height:34px;border:0;outline:none;">
                          </td>
                          <td valign="middle" style="padding-left:12px;font-size:24px;font-weight:700;color:#18181b;">마음의 날씨</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:16px;line-height:1.7;color:#52525b;text-align:left;">
                      <p style="margin:0 0 16px;">안녕하세요.</p>
                      <p style="margin:0 0 16px;">마음의 날씨 회원가입을 위한 인증번호입니다.</p>
                      <p style="margin:0;">아래 인증번호를 입력해주세요.</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:34px 0 30px;">
                      <div style="display:inline-block;padding:18px 34px;border-radius:18px;background-color:#dff4cf;font-size:36px;line-height:1.2;letter-spacing:6px;font-weight:600;color:#3f3f46;">%s</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="font-size:13px;line-height:1.6;color:#a1a1aa;">
                      이 인증번호는 10분 동안 유효합니다.<br>
                      본인이 요청하지 않았다면 이 메일을 무시해주세요.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
        """
        .formatted(EMAIL_LOGO_CONTENT_ID, code);
  }
}
