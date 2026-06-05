package com.woth.backend.mailbox;

import com.woth.backend.global.dto.ApiResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

/**
 * 사용자 우편함 관련 REST API 컨트롤러입니다.
 * 수신된 편지 목록 조회와 편지 읽음 처리 엔드포인트를 제공합니다.
 */

@RestController
@RequestMapping(path = "/api/users/{userId}/mailbox", produces = MediaType.APPLICATION_JSON_VALUE)
public class MailboxController {

    private final MailboxService mailboxService;

    public MailboxController(MailboxService mailboxService) {
        this.mailboxService = mailboxService;
    }
    @GetMapping
    public ApiResponse<List<MailboxItemResponse>> list(@PathVariable Long userId) {
        List<MailboxItemResponse> items = mailboxService.listLetters(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ApiResponse.success(items);
    }

    @GetMapping("/unread-count")
    public ApiResponse<MailboxUnreadCountResponse> unreadCount(@PathVariable Long userId) {
        return ApiResponse.success(new MailboxUnreadCountResponse(mailboxService.countUnreadLetters(userId)));
    }

    @PatchMapping("/{letterId}/read")
    public ApiResponse<MailboxItemResponse> markRead(@PathVariable Long userId,
                                                     @PathVariable Long letterId) {
        var letter = mailboxService.markRead(letterId);
        return ApiResponse.success(toResponse(letter));
    }
    private MailboxItemResponse toResponse(Letter letter) {
        return new MailboxItemResponse(
                letter.getId(),
                letter.getTitle(),
                letter.getMessage(),
                letter.getPlazaTitle(),
                letter.getPlazaId(),
                letter.getGeneratedImageData(),
                letter.getCompletedAt().toString(),
                letter.getIsRead()
        );
    }
    public record MailboxItemResponse(
            Long id,
            String title,
            String message,
            String plazaTitle,
            Long plazaId,
            String generatedImageData,
            String completedAt,
            Boolean read
    ){
    }

    public record MailboxUnreadCountResponse(
            Long unreadCount
    ){
    }


}

































