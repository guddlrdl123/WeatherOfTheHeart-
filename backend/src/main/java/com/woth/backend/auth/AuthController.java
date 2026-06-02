package com.woth.backend.auth;

/*
 * 인증 관련 REST API 컨트롤러입니다.
 * /api/auth/login : 로그인 엔드포인트로, 이메일과 비밀번호를 받아 인증 후 사용자 정보를 반환
 */
import com.woth.backend.global.dto.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping(path = "/api/auth", produces = MediaType.APPLICATION_JSON_VALUE)
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
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

    public record SignupRequest(String email, String password, @Size(max = 10) String nickname) {
    }

    public record AuthResponse(Long id, String email, String nickname, Boolean isAdmin, String joinedAt) {
    }
}
