package com.woth.backend.auth;

/*
 * 인증 관련 REST API 컨트롤러입니다.
 * /api/auth/login : 로그인 엔드포인트로, 이메일과 비밀번호를 받아 인증 후 사용자 정보를 반환
 */
import com.woth.backend.global.dto.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping(path = "/api/auth", produces = MediaType.APPLICATION_JSON_VALUE)
public class AuthController {

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService; // [수정] 비밀번호 찾기/재설정 서비스 추가
    private final AuthTokenService authTokenService;

    public AuthController(
            AuthService authService,
            EmailVerificationService emailVerificationService,
            PasswordResetService passwordResetService,
            AuthTokenService authTokenService
    ) {
        this.authService = authService;
        this.emailVerificationService = emailVerificationService;
        this.passwordResetService = passwordResetService;
        this.authTokenService = authTokenService;
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@RequestBody LoginRequest request) {
        var user = authService.login(request.email(), request.password());
        return ApiResponse.success(toResponse(user));
    }

    @PostMapping("/signup")
    public ApiResponse<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        var user = authService.signup(request.email(), request.password(), request.nickname());
        return ApiResponse.success(toResponse(user));
    }

    @PostMapping("/email/send")
    public ApiResponse<Void> sendEmailCode(@Valid @RequestBody EmailCodeSendRequest request) {
        emailVerificationService.sendCode(request.email());
        return ApiResponse.success(null);
    }

    @PostMapping("/email/verify")
    public ApiResponse<Void> verifyEmailCode(@Valid @RequestBody EmailCodeVerifyRequest request) {
        emailVerificationService.verifyCode(request.email(), request.code());
        return ApiResponse.success(null);
    }

    // [수정] 비밀번호 찾기용 재설정 토큰 발급 요청 엔드포인트 추가
    @PostMapping("/password/reset/request")
    public ApiResponse<Void> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        passwordResetService.requestReset(request.email());
        return ApiResponse.success(null);
    }

    // [수정] 비밀번호 재설정 토큰 검증 후 새 비밀번호를 저장하는 엔드포인트 추가
    @PostMapping("/password/reset/confirm")
    public ApiResponse<Void> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
        passwordResetService.resetPassword(request.email(), request.token(), request.newPassword());
        return ApiResponse.success(null);
    }

    private AuthResponse toResponse(com.woth.backend.user.User user) {
        AuthTokenService.IssuedToken token = authTokenService.issue(user);

        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getIsAdmin(),
                user.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                token.accessToken(),
                token.expiresAt()
        );
    }

    public record LoginRequest(String email, String password) {
    }

    public record SignupRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8) @Pattern(regexp = ".*[^A-Za-z0-9].*") String password,
            @Size(max = 10) String nickname
    ) {
    }

    public record EmailCodeSendRequest(@NotBlank @Email String email) {
    }

    public record EmailCodeVerifyRequest(
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = "/d{6}") String code
    ) {
    }

    // [수정] 비밀번호 재설정 메일 발송 요청 DTO
    public record PasswordResetRequest(@NotBlank @Email String email) {
    }

    // [수정] 비밀번호 재설정 완료 요청 DTO
    public record PasswordResetConfirmRequest(
            @NotBlank @Email String email,
            @NotBlank String token,
            @NotBlank @Size(min = 8) @Pattern(regexp = ".*[^A-Za-z0-9].*") String newPassword
    ) {
    }

    public record AuthResponse(
            Long id,
            String email,
            String nickname,
            Boolean isAdmin,
            String joinedAt,
            String accessToken,
            String accessTokenExpiresAt
    ) {
    }
}
