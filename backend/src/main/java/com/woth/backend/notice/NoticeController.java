package com.woth.backend.notice;

import com.woth.backend.auth.AuthenticatedUser;
import com.woth.backend.auth.CurrentUser;
import com.woth.backend.global.dto.ApiResponse;
import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 공지사항 REST API 컨트롤러입니다.
 * - 목록 조회: 로그인한 사용자라면 누구나 (내용 공개)
 * - 작성/수정/삭제: 관리자만 가능
 */
@RestController
@RequestMapping(path = "/api/notices", produces = MediaType.APPLICATION_JSON_VALUE)
public class NoticeController {

    private final NoticeService noticeService;

    public NoticeController(NoticeService noticeService) {
        this.noticeService = noticeService;
    }

    @GetMapping
    public ApiResponse<NoticePageResponse> list(@CurrentUser AuthenticatedUser currentUser,
                                                @RequestParam(name = "page", defaultValue = "0") int page) {
        Page<Notice> result = noticeService.list(page);

        List<NoticeResponse> items = result.getContent().stream()
                .map(this::toResponse)
                .toList();

        NoticePageResponse response = new NoticePageResponse(
                items,
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.hasNext(),
                isAdmin(currentUser));

        return ApiResponse.success(response);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<NoticeResponse> create(@CurrentUser AuthenticatedUser currentUser,
                                              @RequestBody NoticeRequest request) {
        requireAdmin(currentUser);
        Notice created = noticeService.create(currentUser.id(), currentUser.nickname(), request.title(), request.content());
        return ApiResponse.success(toResponse(created));
    }

    @PatchMapping(path = "/{noticeId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<NoticeResponse> update(@CurrentUser AuthenticatedUser currentUser,
                                              @PathVariable Long noticeId,
                                              @RequestBody NoticeRequest request) {
        requireAdmin(currentUser);
        Notice updated = noticeService.update(noticeId, request.title(), request.content());
        return ApiResponse.success(toResponse(updated));
    }

    @DeleteMapping("/{noticeId}")
    public ApiResponse<Void> delete(@CurrentUser AuthenticatedUser currentUser,
                                    @PathVariable Long noticeId) {
        requireAdmin(currentUser);
        noticeService.delete(noticeId);
        return ApiResponse.success(null);
    }

    private void requireAdmin(AuthenticatedUser currentUser) {
        if (!isAdmin(currentUser)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private boolean isAdmin(AuthenticatedUser currentUser) {
        return Boolean.TRUE.equals(currentUser.isAdmin());
    }

    private NoticeResponse toResponse(Notice notice) {
        return new NoticeResponse(
                notice.getId(),
                notice.getAuthorNickname(),
                notice.getTitle(),
                notice.getContent(),
                notice.getCreatedAt().toString(),
                notice.getUpdatedAt().toString());
    }

    public record NoticeRequest(
            String title,
            String content
    ) {
    }

    public record NoticeResponse(
            Long id,
            String authorNickname,
            String title,
            String content,
            String createdAt,
            String updatedAt
    ) {
    }

    public record NoticePageResponse(
            List<NoticeResponse> items,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean hasNext,
            boolean viewerIsAdmin
    ) {
    }
}
