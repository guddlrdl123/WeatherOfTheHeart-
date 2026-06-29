package com.woth.backend.inquiry;

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
 * 1:1 문의 REST API 컨트롤러입니다.
 * - 문의 작성: 로그인한 사용자라면 누구나 가능
 * - 문의 목록: 모든 사용자에게 노출하되 내용 열람 권한은 제한합니다.
 *   · 관리자: 모든 문의 내용/답변 열람 + 답변 작성 가능
 *   · 작성자 본인: 자신이 쓴 문의 내용과 그에 달린 답변 열람 가능
 *   · 그 외 사용자: "비공개된 문의"로 마스킹되어 내용이 보이지 않습니다.
 */
@RestController
@RequestMapping(path = "/api/inquiries", produces = MediaType.APPLICATION_JSON_VALUE)
public class InquiryController {

    private final InquiryService inquiryService;

    public InquiryController(InquiryService inquiryService) {
        this.inquiryService = inquiryService;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<InquiryResponse> create(@CurrentUser AuthenticatedUser currentUser,
                                               @RequestBody CreateInquiryRequest request) {
        Inquiry created = inquiryService.create(
                currentUser.id(),
                currentUser.nickname(),
                currentUser.email(),
                request.title(),
                request.content());

        return ApiResponse.success(toResponse(created, currentUser));
    }

    @GetMapping
    public ApiResponse<InquiryPageResponse> list(@CurrentUser AuthenticatedUser currentUser,
                                                 @RequestParam(name = "page", defaultValue = "0") int page) {
        Page<Inquiry> result = inquiryService.list(page);

        List<InquiryResponse> items = result.getContent().stream()
                .map(inquiry -> toResponse(inquiry, currentUser))
                .toList();

        InquiryPageResponse response = new InquiryPageResponse(
                items,
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.hasNext(),
                isAdmin(currentUser));

        return ApiResponse.success(response);
    }

    // 관리자만 문의에 답변을 작성/수정할 수 있습니다.
    @PatchMapping(path = "/{inquiryId}/answer", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<InquiryResponse> answer(@CurrentUser AuthenticatedUser currentUser,
                                               @PathVariable Long inquiryId,
                                               @RequestBody AnswerInquiryRequest request) {
        if (!isAdmin(currentUser)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        Inquiry answered = inquiryService.answer(inquiryId, currentUser.nickname(), request.answer());

        return ApiResponse.success(toResponse(answered, currentUser));
    }

    private boolean isAdmin(AuthenticatedUser currentUser) {
        return Boolean.TRUE.equals(currentUser.isAdmin());
    }

    // 열람 권한(관리자 또는 작성자 본인)이 없으면 제목/내용/답변/작성자를 내려보내지 않습니다(서버 차단).
    private InquiryResponse toResponse(Inquiry inquiry, AuthenticatedUser currentUser) {
        Long authorId = inquiry.getAuthor() == null ? null : inquiry.getAuthor().getId();
        boolean mine = authorId != null && authorId.equals(currentUser.id());
        boolean canView = isAdmin(currentUser) || mine;

        if (!canView) {
            return new InquiryResponse(
                    inquiry.getId(),
                    null, null, null, null, null, null, null,
                    false,
                    inquiry.getCreatedAt().toString(),
                    true,
                    false,
                    null);
        }

        return new InquiryResponse(
                inquiry.getId(),
                inquiry.getAuthorNickname(),
                inquiry.getAuthorEmail(),
                inquiry.getTitle(),
                inquiry.getContent(),
                inquiry.getAnswer(),
                inquiry.getAnswererNickname(),
                inquiry.getAnsweredAt() == null ? null : inquiry.getAnsweredAt().toString(),
                inquiry.isAnswered(),
                inquiry.getCreatedAt().toString(),
                false,
                mine,
                isAdmin(currentUser) ? inquiryService.countWarnings(authorId) : null);
    }

    public record CreateInquiryRequest(
            String title,
            String content
    ) {
    }

    public record AnswerInquiryRequest(
            String answer
    ) {
    }

    public record InquiryResponse(
            Long id,
            String authorNickname,
            String authorEmail,
            String title,
            String content,
            String answer,
            String answererNickname,
            String answeredAt,
            boolean answered,
            String createdAt,
            boolean masked,
            boolean mine,
            Long warningCount
    ) {
    }

    public record InquiryPageResponse(
            List<InquiryResponse> items,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean hasNext,
            boolean viewerIsAdmin
    ) {
    }
}
