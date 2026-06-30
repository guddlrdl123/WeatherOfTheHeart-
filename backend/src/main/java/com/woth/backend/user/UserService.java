package com.woth.backend.user;

import com.woth.backend.auth.EmailVerificationService; // [수정] 기존 이메일 인증 서비스를 재사용하기 위해 추가
import com.woth.backend.auth.PasswordResetTokenRepository;
import com.woth.backend.auth.RefreshTokenRepository;
import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.inquiry.InquiryRepository;
import com.woth.backend.like.ObjectLikeRepository;
import com.woth.backend.mailbox.LetterRepository;
import com.woth.backend.memory.PrivateMemoryRepository;
import com.woth.backend.moderation.UserWarningRepository;
import com.woth.backend.notice.NoticeRepository;
import com.woth.backend.plaza.PlazaEntryRepository;
import com.woth.backend.plaza.PlazaEntryReportRepository;
import com.woth.backend.plaza.PlazaRepository;
import com.woth.backend.room.PrivateRoomRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserService {

    private static final String WITHDRAWN_NICKNAME = "withdrawn";
    private static final String WITHDRAWN_USER_EMAIL = "withdrawn-user@maeum.weather";
    private static final String LOCAL_AUTH_PROVIDER = "LOCAL";

    private static final String DEFAULT_NICKNAME = "나그네";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerificationService; // [수정] 이메일 변경 시 인증코드 발송/검증 재사용
    private final ObjectLikeRepository objectLikeRepository;
    private final LetterRepository letterRepository;
    private final PrivateMemoryRepository privateMemoryRepository;
    private final PrivateRoomRepository privateRoomRepository;
    private final PlazaEntryRepository plazaEntryRepository;
    private final PlazaEntryReportRepository plazaEntryReportRepository;
    private final PlazaRepository plazaRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserWarningRepository userWarningRepository;
    private final InquiryRepository inquiryRepository;
    private final NoticeRepository noticeRepository;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmailVerificationService emailVerificationService,
            ObjectLikeRepository objectLikeRepository,
            LetterRepository letterRepository,
            PrivateMemoryRepository privateMemoryRepository,
            PrivateRoomRepository privateRoomRepository,
            PlazaEntryRepository plazaEntryRepository,
            PlazaEntryReportRepository plazaEntryReportRepository,
            PlazaRepository plazaRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            UserWarningRepository userWarningRepository,
            InquiryRepository inquiryRepository,
            NoticeRepository noticeRepository
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailVerificationService = emailVerificationService;
        this.objectLikeRepository = objectLikeRepository;
        this.letterRepository = letterRepository;
        this.privateMemoryRepository = privateMemoryRepository;
        this.privateRoomRepository = privateRoomRepository;
        this.plazaEntryRepository = plazaEntryRepository;
        this.plazaEntryReportRepository = plazaEntryReportRepository;
        this.plazaRepository = plazaRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.userWarningRepository = userWarningRepository;
        this.inquiryRepository = inquiryRepository;
        this.noticeRepository = noticeRepository;
    }

    @Transactional(readOnly = true)
    public User getUser(Long userId) {
        return userRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    @Transactional
    public User updateProfile(Long userId, String nickname, String currentPassword, String newPassword) {
        User user = getUser(userId);

        if (nickname != null) {
            user.updateNickname(resolveNickname(nickname));
        }

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
        validateLocalEmailChangeAllowed(user);

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
        ensureEmailIsNotUsed(normalizedEmail);

        // [수정] 이메일 변경 전용 인증 코드 발송
        emailVerificationService.sendCodeForEmailChange(normalizedEmail);
    }

    // [수정] 새 이메일과 인증코드를 검증한 뒤 실제 이메일 반영
    @Transactional
    public User updateEmail(Long userId, String newEmail, String code) {
        User user = getUser(userId);
        validateLocalEmailChangeAllowed(user);

        if (!hasText(newEmail) || !hasText(code)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        String normalizedEmail = newEmail.trim();

        // [수정] 현재 이메일과 동일한 주소로 변경 요청하는 경우 차단
        if (user.getEmail().equalsIgnoreCase(normalizedEmail)) {
            throw new CustomException(ErrorCode.EMAIL_SAME_AS_CURRENT);
        }

        // [수정] 인증 완료 직전에도 중복 이메일 여부를 다시 확인
        ensureEmailIsNotUsed(normalizedEmail);

        // [수정] 기존 이메일 인증 검증 로직을 재사용
        emailVerificationService.verifyCode(normalizedEmail, code);

        user.updateEmail(normalizedEmail);

        // [수정] 이메일 변경 완료 후 인증 기록 정리
        emailVerificationService.clear(normalizedEmail);

        return user;
    }

    // [수정] 소셜 회원 여부 판단 시 공통 로컬 회원 판별 메서드를 재사용하도록 변경
    private void validateSocialUserForWithdraw(User user) {
        if (isLocalUser(user)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    // [추가] 소셜 로그인 회원 탈퇴 전 이메일 인증코드를 발송
    @Transactional
    public void sendSocialWithdrawEmailCode(Long userId) {
        User user = getUser(userId);
        validateSocialUserForWithdraw(user);

        emailVerificationService.sendCodeForWithdraw(user.getEmail());
    }

    // [수정] 소셜 회원 탈퇴는 이메일 인증코드 검증 후 공통 탈퇴 처리 메서드를 호출
    @Transactional
    public void withdrawSocial(Long userId, String code) {
        User user = getUser(userId);

        validateSocialUserForWithdraw(user);
        validateWithdrawEmailCode(user, code);

        withdrawUser(user);
    }

    // [수정] 일반 회원 탈퇴는 비밀번호 검증 후 공통 탈퇴 처리 메서드를 호출
    @Transactional
    public void withdraw(Long userId, String currentPassword) {
        User user = getUser(userId);

        validateWithdrawPassword(user, currentPassword);

        withdrawUser(user);
    }

    // [추가] 일반 회원 탈퇴 시 현재 비밀번호 검증 로직 분리
    private void validateWithdrawPassword(User user, String currentPassword) {
        if (!hasText(currentPassword)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        if (!matchesPassword(currentPassword, user.getPassword())) {
            throw new CustomException(ErrorCode.USER_PASSWORD_MISMATCH);
        }
    }

    // [추가] 소셜 회원 탈퇴 시 이메일 인증코드 검증 로직 분리
    private void validateWithdrawEmailCode(User user, String code) {
        if (!hasText(code)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        emailVerificationService.verifyCode(user.getEmail(), code);
    }

    // [수정] 일반 탈퇴와 소셜 탈퇴가 함께 사용하는 실제 탈퇴 처리 공통 메서드
    // 회원과 연관된 모든 데이터를 정리한 뒤 회원 행 자체를 DB에서 완전히 삭제(하드 삭제)한다.
    private void withdrawUser(User user) {
        Long userId = user.getId();
        String originalEmail = user.getEmail();
        User withdrawnOwner = getWithdrawnOwner();

        objectLikeRepository.deleteByUserId(userId);
        objectLikeRepository.deleteByPlazaOwnerId(userId);
        objectLikeRepository.deleteByPlazaEntryOwnerId(userId);

        plazaEntryReportRepository.deleteByPlazaOwnerId(userId);
        plazaEntryReportRepository.deleteOpenByPlazaEntryOwnerId(userId);
        // [추가] 신고자/피신고자가 본인인 신고는 FK(NOT NULL)라 하드 삭제를 막으므로 함께 제거
        plazaEntryReportRepository.deleteByReporterOrReportedUserId(userId);
        plazaEntryRepository.deleteByPlazaOwnerId(userId);
        plazaEntryRepository.deleteOpenByOwnerId(userId);
        plazaEntryRepository.anonymizeCompletedOwnerByOwnerId(userId, withdrawnOwner);
        plazaRepository.deleteByOwnerId(userId);

        privateMemoryRepository.deleteByPrivateRoomUserId(userId);
        privateRoomRepository.deleteByUserId(userId);

        letterRepository.deleteByReceiverId(userId);
        letterRepository.clearSenderByUserId(userId);

        // [추가] 받은 경고 제거(NOT NULL FK)
        userWarningRepository.deleteByUserId(userId);
        // [추가] 문의/공지는 작성 시점 스냅샷으로 보존하고 작성자 참조만 NULL 처리
        inquiryRepository.clearAuthorByUserId(userId);
        noticeRepository.clearAuthorByUserId(userId);

        refreshTokenRepository.deleteByUserId(userId);
        passwordResetTokenRepository.deleteByEmail(originalEmail);
        emailVerificationService.clear(originalEmail);

        // [수정] 익명화(soft delete) 대신 회원 행을 실제로 삭제
        userRepository.delete(user);
    }

    private User getWithdrawnOwner() {
        return userRepository.findByEmail(WITHDRAWN_USER_EMAIL)
                .orElseGet(() -> userRepository.save(User.builder()
                        .email(WITHDRAWN_USER_EMAIL)
                        .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .nickname(WITHDRAWN_NICKNAME)
                        .build()));
    }

    private void ensureEmailIsNotUsed(String email) {
        userRepository.findByEmailAndAuthProviderIgnoreCaseAndIsDeletedFalse(email, LOCAL_AUTH_PROVIDER)
                .ifPresent(existingUser -> {
                    throw new CustomException(ErrorCode.USER_ALREADY_EXISTS);
                });
    }

    private void validateLocalEmailChangeAllowed(User user) {
        String authProvider = user.getAuthProvider();

        if (authProvider != null && !LOCAL_AUTH_PROVIDER.equalsIgnoreCase(authProvider)) {
            throw new CustomException(ErrorCode.SOCIAL_EMAIL_CHANGE_FORBIDDEN);
        }
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

    // [추가] authProvider 기준으로 일반 회원인지 확인하는 공통 메서드
    private boolean isLocalUser(User user) {
        String authProvider = user.getAuthProvider();

        return authProvider == null || LOCAL_AUTH_PROVIDER.equalsIgnoreCase(authProvider);
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
