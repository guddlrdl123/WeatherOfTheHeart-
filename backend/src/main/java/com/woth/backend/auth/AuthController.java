package com.woth.backend.auth;

import com.woth.backend.global.dto.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping(path = "/api/auth", produces = MediaType.APPLICATION_JSON_VALUE)
public class AuthController {

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;
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

    @PostMapping("/password/reset/request")
    public ApiResponse<Void> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        passwordResetService.requestReset(request.email());
        return ApiResponse.success(null);
    }

    @PostMapping("/password/reset/verify")
    public ApiResponse<Void> verifyPasswordReset(@Valid @RequestBody PasswordResetVerifyRequest request) {
        passwordResetService.verifyToken(request.email(), request.token());
        return ApiResponse.success(null);
    }

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
            @NotBlank @Pattern(regexp = "\\d{6}") String code
    ) {
    }

    public record PasswordResetRequest(@NotBlank @Email String email) {
    }

    public record PasswordResetVerifyRequest(
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = "\\d{6}") String token
    ) {
    }

    public record PasswordResetConfirmRequest(
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = "\\d{6}") String token,
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
