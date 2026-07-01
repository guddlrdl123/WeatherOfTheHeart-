package com.woth.backend.user;

import com.woth.backend.auth.AuthenticatedUser;
import com.woth.backend.auth.CurrentUser;
import com.woth.backend.global.dto.ApiResponse;
import com.woth.backend.plaza.Plaza;
import com.woth.backend.plaza.PlazaEntry;
import com.woth.backend.plaza.PlazaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email; // [수정] 새 이메일 형식 검증을 위해 추가
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping; // [수정] 이메일 변경 인증번호 발송용 엔드포인트 추가
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping(path = "/api/users", produces = MediaType.APPLICATION_JSON_VALUE)
public class UserController {

        private final UserService userService;
        private final PlazaService plazaService;

        public UserController(UserService userService, PlazaService plazaService) {
                this.userService = userService;
                this.plazaService = plazaService;
        }

        @GetMapping("/{userId}")
        public ApiResponse<UserProfileResponse> getUser(@CurrentUser AuthenticatedUser currentUser,
                        @PathVariable Long userId) {
                requireSelf(currentUser, userId);
                return ApiResponse.success(toResponse(userService.getUser(userId)));
        }

        @PostMapping("/me/social-withdraw/email/send")
        public ApiResponse<Void> sendSocialWithdrawEmailCode(
                        @CurrentUser AuthenticatedUser currentUser) {
                userService.sendSocialWithdrawEmailCode(currentUser.id());
                return ApiResponse.success(null);
        }

        @DeleteMapping("/me/social-withdraw")
        public ApiResponse<Void> withdrawSocialMe(
                        @CurrentUser AuthenticatedUser currentUser,
                        @Valid @RequestBody SocialWithdrawRequest request) {
                userService.withdrawSocial(currentUser.id(), request.code());
                return ApiResponse.success(null);
        }

        @GetMapping("/me")
        public ApiResponse<UserProfileResponse> getMe(@CurrentUser AuthenticatedUser currentUser) {
                return ApiResponse.success(toResponse(userService.getUser(currentUser.id())));
        }

        @GetMapping("/{userId}/plazas")
        @Transactional(readOnly = true)
        public ApiResponse<List<UserPlazaResponse>> listCreatedPlazas(@CurrentUser AuthenticatedUser currentUser,
                        @PathVariable Long userId) {
                requireSelf(currentUser, userId);
                List<UserPlazaResponse> plazas = plazaService.listPlazasByOwner(userId).stream()
                                .map(this::toPlazaResponse)
                                .collect(Collectors.toList());

                return ApiResponse.success(plazas);
        }

        @GetMapping("/me/plazas")
        @Transactional(readOnly = true)
        public ApiResponse<List<UserPlazaResponse>> listMyCreatedPlazas(@CurrentUser AuthenticatedUser currentUser) {
                List<UserPlazaResponse> plazas = plazaService.listPlazasByOwner(currentUser.id()).stream()
                                .map(this::toPlazaResponse)
                                .collect(Collectors.toList());

                return ApiResponse.success(plazas);
        }

        @GetMapping("/{userId}/plaza-entries")
        @Transactional(readOnly = true)
        public ApiResponse<List<UserPlazaEntryResponse>> listWrittenPlazaEntries(
                        @CurrentUser AuthenticatedUser currentUser, @PathVariable Long userId) {
                requireSelf(currentUser, userId);
                List<UserPlazaEntryResponse> entries = plazaService.listEntriesByOwner(userId).stream()
                                .map(this::toPlazaEntryResponse)
                                .collect(Collectors.toList());

                return ApiResponse.success(entries);
        }

        @GetMapping("/me/plaza-entries")
        @Transactional(readOnly = true)
        public ApiResponse<List<UserPlazaEntryResponse>> listMyWrittenPlazaEntries(
                        @CurrentUser AuthenticatedUser currentUser) {
                List<UserPlazaEntryResponse> entries = plazaService.listEntriesByOwner(currentUser.id()).stream()
                                .map(this::toPlazaEntryResponse)
                                .collect(Collectors.toList());

                return ApiResponse.success(entries);
        }

        @PatchMapping("/{userId}")
        public ApiResponse<UserProfileResponse> updateUser(
                        @CurrentUser AuthenticatedUser currentUser,
                        @PathVariable Long userId,
                        @Valid @RequestBody UserProfileUpdateRequest request) {
                requireSelf(currentUser, userId);
                return ApiResponse.success(toResponse(userService.updateProfile(
                                userId,
                                request.nickname(),
                                request.currentPassword(),
                                request.newPassword())));
        }

        @PatchMapping("/me")
        public ApiResponse<UserProfileResponse> updateMe(
                        @CurrentUser AuthenticatedUser currentUser,
                        @Valid @RequestBody UserProfileUpdateRequest request) {
                return ApiResponse.success(toResponse(userService.updateProfile(
                                currentUser.id(),
                                request.nickname(),
                                request.currentPassword(),
                                request.newPassword())));
        }

        // [수정] 현재 비밀번호를 다시 확인한 뒤 새 이메일로 인증번호를 발송하는 엔드포인트 추가
        @PostMapping("/me/email/change/send")
        public ApiResponse<Void> sendEmailChangeCode(
                        @CurrentUser AuthenticatedUser currentUser,
                        @Valid @RequestBody EmailChangeSendRequest request) {
                userService.sendEmailChangeCode(
                                currentUser.id(),
                                request.currentPassword(),
                                request.newEmail());
                return ApiResponse.success(null);
        }

        // [수정] 새 이메일과 인증번호를 확인한 뒤 실제 이메일을 변경하는 엔드포인트 추가
        @PatchMapping("/me/email")
        public ApiResponse<UserProfileResponse> updateMyEmail(
                        @CurrentUser AuthenticatedUser currentUser,
                        @Valid @RequestBody EmailChangeConfirmRequest request) {
                return ApiResponse.success(toResponse(
                                userService.updateEmail(
                                                currentUser.id(),
                                                request.newEmail(),
                                                request.code())));
        }

        // [수정] 현재 로그인한 사용자가 본인 비밀번호를 다시 확인한 뒤 탈퇴 처리할 수 있는 엔드포인트를 추가합니다.
        @DeleteMapping("/me")
        public ApiResponse<Void> withdrawMe(
                        @CurrentUser AuthenticatedUser currentUser,
                        @Valid @RequestBody WithdrawRequest request) {
                userService.withdraw(currentUser.id(), request.currentPassword());
                return ApiResponse.success(null);
        }

        private UserProfileResponse toResponse(User user) {
                return new UserProfileResponse(
                                user.getId(),
                                user.getEmail(),
                                user.getNickname(),
                                user.getIsAdmin(),
                                user.getAuthProvider(),
                                user.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                                user.getUpdatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        }

        private void requireSelf(AuthenticatedUser currentUser, Long userId) {
                if (!currentUser.id().equals(userId)) {
                        throw new com.woth.backend.global.exception.CustomException(
                                        com.woth.backend.global.exception.ErrorCode.AUTH_INVALID);
                }
        }

        private UserPlazaResponse toPlazaResponse(Plaza plaza) {
                return new UserPlazaResponse(
                                plaza.getId(),
                                plaza.getOwner() == null ? null : plaza.getOwner().getId(),
                                plaza.getTitle(),
                                plaza.getTopic(),
                                plaza.getMaxObjects(),
                                plaza.getAllowSearch(),
                                plaza.getAllowInvite(),
                                plaza.getAllowDuplicateObjects(),
                                plaza.getBackgroundType(),
                                plaza.getBackgroundColor(),
                                plaza.getBackgroundKey(),
                                plazaService.countEntries(plaza.getId()),
                                plaza.getCompletedAt() == null ? null : plaza.getCompletedAt().toString(),
                                plaza.getCreatedAt().toString(),
                                plaza.getUpdatedAt().toString());
        }

        private UserPlazaEntryResponse toPlazaEntryResponse(PlazaEntry entry) {
                return new UserPlazaEntryResponse(
                                entry.getId(),
                                entry.getPlaza().getId(),
                                entry.getOwner().getId(),
                                entry.getTitle(),
                                entry.getContent(),
                                entry.getMoodKey(),
                                entry.getWeatherKey(),
                                entry.getObjectKey(),
                                entry.getSlotKey(),
                                entry.getPositionX(),
                                entry.getPositionY(),
                                entry.getCreatedAt().toString(),
                                entry.getUpdatedAt().toString(),
                                toPlazaResponse(entry.getPlaza()));
        }

        public record UserProfileUpdateRequest(
                        @Size(max = 10) String nickname,
                        String currentPassword,
                        @Size(min = 8) @Pattern(regexp = ".*[^A-Za-z0-9].*") String newPassword) {
        }

        // [수정] 이메일 변경 인증번호 발송 시 현재 비밀번호와 새 이메일을 함께 받는 요청 DTO
        public record EmailChangeSendRequest(
                        @NotBlank String currentPassword,
                        @NotBlank @Email String newEmail) {
        }

        // [수정] 이메일 변경 확정 시 새 이메일과 6자리 인증번호를 받는 요청 DTO
        public record EmailChangeConfirmRequest(
                        @NotBlank @Email String newEmail,
                        @NotBlank @Pattern(regexp = "[0-9]{6}") String code) {
        }

        // [수정] 회원 탈퇴 시 현재 비밀번호를 다시 입력받기 위한 요청 DTO
        public record WithdrawRequest(
                        @NotBlank String currentPassword) {
        }

        public record SocialWithdrawRequest(
                        @NotBlank @Pattern(regexp = "[0-9]{6}") String code) {
        }

        public record UserProfileResponse(
                        Long id,
                        String email,
                        String nickname,
                        Boolean isAdmin,
                        String authProvider,
                        String joinedAt,
                        String updatedAt) {
        }

        public record UserPlazaResponse(
                        Long id,
                        Long ownerId,
                        String title,
                        String topic,
                        Integer maxObjects,
                        Boolean allowSearch,
                        Boolean allowInvite,
                        Boolean allowDuplicateObjects,
                        String backgroundType,
                        String backgroundColor,
                        String backgroundKey,
                        Long entryCount,
                        String completedAt,
                        String createdAt,
                        String updatedAt) {
        }

        public record UserPlazaEntryResponse(
                        Long id,
                        Long plazaId,
                        Long ownerId,
                        String title,
                        String content,
                        String moodKey,
                        String weatherKey,
                        String objectKey,
                        String slotKey,
                        Integer positionX,
                        Integer positionY,
                        String createdAt,
                        String updatedAt,
                        UserPlazaResponse plaza) {
        }
}
