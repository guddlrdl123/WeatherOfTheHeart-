package com.woth.backend.moderation;

import com.woth.backend.auth.AuthenticatedUser;
import com.woth.backend.auth.CurrentUser;
import com.woth.backend.global.dto.ApiResponse;
import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(path = "/api/admin", produces = MediaType.APPLICATION_JSON_VALUE)
public class ModerationController {

    private final ModerationService moderationService;

    public ModerationController(ModerationService moderationService) {
        this.moderationService = moderationService;
    }

    @GetMapping("/reports")
    public ApiResponse<List<ModerationService.ReportedEntryView>> listReports(
            @CurrentUser AuthenticatedUser currentUser
    ) {
        requireAdmin(currentUser);
        return ApiResponse.success(moderationService.listReportedEntries());
    }

    @DeleteMapping(path = "/reports/entries/{entryId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<ModerationService.ModerationActionResult> deleteEntryAndWarn(
            @CurrentUser AuthenticatedUser currentUser,
            @PathVariable Long entryId,
            @RequestBody WarningRequest request
    ) {
        requireAdmin(currentUser);
        return ApiResponse.success(moderationService.deleteEntryAndWarn(
                entryId,
                request.reason(),
                currentUser.nickname()
        ));
    }

    @PatchMapping(path = "/users/{userId}/suspension", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<ModerationService.ModerationActionResult> updateSuspension(
            @CurrentUser AuthenticatedUser currentUser,
            @PathVariable Long userId,
            @RequestBody SuspensionRequest request
    ) {
        requireAdmin(currentUser);
        return ApiResponse.success(moderationService.updateSuspension(
                userId,
                request.suspended(),
                request.reason()
        ));
    }

    private void requireAdmin(AuthenticatedUser currentUser) {
        if (!Boolean.TRUE.equals(currentUser.isAdmin())) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    public record WarningRequest(String reason) {
    }

    public record SuspensionRequest(boolean suspended, String reason) {
    }
}
