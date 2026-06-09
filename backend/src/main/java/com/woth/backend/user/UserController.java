package com.woth.backend.user;

import com.woth.backend.auth.AuthenticatedUser;
import com.woth.backend.auth.CurrentUser;
import com.woth.backend.global.dto.ApiResponse;
import com.woth.backend.plaza.Plaza;
import com.woth.backend.plaza.PlazaEntry;
import com.woth.backend.plaza.PlazaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    public ApiResponse<UserProfileResponse> getUser(@CurrentUser AuthenticatedUser currentUser, @PathVariable Long userId) {
        requireSelf(currentUser, userId);
        return ApiResponse.success(toResponse(userService.getUser(userId)));
    }

    @GetMapping("/me")
    public ApiResponse<UserProfileResponse> getMe(@CurrentUser AuthenticatedUser currentUser) {
        return ApiResponse.success(toResponse(userService.getUser(currentUser.id())));
    }

    @GetMapping("/{userId}/plazas")
    @Transactional(readOnly = true)
    public ApiResponse<List<UserPlazaResponse>> listCreatedPlazas(@CurrentUser AuthenticatedUser currentUser, @PathVariable Long userId) {
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
    public ApiResponse<List<UserPlazaEntryResponse>> listWrittenPlazaEntries(@CurrentUser AuthenticatedUser currentUser, @PathVariable Long userId) {
        requireSelf(currentUser, userId);
        List<UserPlazaEntryResponse> entries = plazaService.listEntriesByOwner(userId).stream()
                .map(this::toPlazaEntryResponse)
                .collect(Collectors.toList());

        return ApiResponse.success(entries);
    }

    @GetMapping("/me/plaza-entries")
    @Transactional(readOnly = true)
    public ApiResponse<List<UserPlazaEntryResponse>> listMyWrittenPlazaEntries(@CurrentUser AuthenticatedUser currentUser) {
        List<UserPlazaEntryResponse> entries = plazaService.listEntriesByOwner(currentUser.id()).stream()
                .map(this::toPlazaEntryResponse)
                .collect(Collectors.toList());

        return ApiResponse.success(entries);
    }

    @PatchMapping("/{userId}")
    public ApiResponse<UserProfileResponse> updateUser(
            @CurrentUser AuthenticatedUser currentUser,
            @PathVariable Long userId,
            @Valid @RequestBody UserProfileUpdateRequest request
    ) {
        requireSelf(currentUser, userId);
        return ApiResponse.success(toResponse(userService.updateProfile(
                userId,
                request.nickname(),
                request.currentPassword(),
                request.newPassword()
        )));
    }

    @PatchMapping("/me")
    public ApiResponse<UserProfileResponse> updateMe(
            @CurrentUser AuthenticatedUser currentUser,
            @Valid @RequestBody UserProfileUpdateRequest request
    ) {
        return ApiResponse.success(toResponse(userService.updateProfile(
                currentUser.id(),
                request.nickname(),
                request.currentPassword(),
                request.newPassword()
        )));
    }

    private UserProfileResponse toResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getIsAdmin(),
                user.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                user.getUpdatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
    }

    private void requireSelf(AuthenticatedUser currentUser, Long userId) {
        if (!currentUser.id().equals(userId)) {
            throw new com.woth.backend.global.exception.CustomException(
                    com.woth.backend.global.exception.ErrorCode.AUTH_INVALID
            );
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
                plaza.getUpdatedAt().toString()
        );
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
                toPlazaResponse(entry.getPlaza())
        );
    }

    public record UserProfileUpdateRequest(
            @Size(max = 10) String nickname,
            String currentPassword,
            @Size(min = 8) @Pattern(regexp = ".*[^A-Za-z0-9].*") String newPassword
    ) {
    }

    public record UserProfileResponse(
            Long id,
            String email,
            String nickname,
            Boolean isAdmin,
            String joinedAt,
            String updatedAt
    ) {
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
            String updatedAt
    ) {
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
            UserPlazaResponse plaza
    ) {
    }
}
