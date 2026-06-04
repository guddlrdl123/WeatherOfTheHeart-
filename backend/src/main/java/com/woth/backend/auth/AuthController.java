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

    public AuthController(AuthService authService, EmailVerificationService emailVerificationService) {
        this.authService = authService;
        this.emailVerificationService = emailVerificationService;
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

    private AuthResponse toResponse(com.woth.backend.user.User user) {
        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getIsAdmin(),
                user.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
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

    public record AuthResponse(Long id, String email, String nickname, Boolean isAdmin, String joinedAt) {
    }
}
