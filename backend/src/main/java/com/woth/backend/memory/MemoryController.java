package com.woth.backend.memory;

/**
 * 메모리 컨트롤러 클래스
 * 사용자의 메모 목록 조회와 새 메모 생성 요청을 처리
 * /api/users/{userId}/memories 엔드포인트에서 GET과 POST 요청을 담당하며, 메모 위치 업데이트 API도 포함
 */
import com.woth.backend.global.dto.ApiResponse;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping(path = "/api/users/{userId}/memories", produces = MediaType.APPLICATION_JSON_VALUE)
public class MemoryController {

    private final MemoryService memoryService;

    public MemoryController(MemoryService memoryService) {
        this.memoryService = memoryService;
    }

    // 개인 메모 목록 조회, 새 메모 생성, 메모 위치 업데이트 API를 제공하는 컨트롤러 메서드들
    @GetMapping
    @Transactional(readOnly = true)
    public ApiResponse<List<MemoryResponse>> list(@PathVariable Long userId) {
        List<MemoryResponse> memories = memoryService.listMemories(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ApiResponse.success(memories);
    }

    @PostMapping
    public ApiResponse<MemoryResponse> create(@PathVariable Long userId, @RequestBody MemoryRequest request) {
        var memory = memoryService.createMemory(userId, new MemoryService.CreateMemoryRequest(
                request.memoryDate(),
                request.title(),
                request.content(),
                request.moodKey(),
                request.weatherKey(),
                request.objectKey(),
                request.slotKey(),
                request.positionX(),
                request.positionY()
        ));
        return ApiResponse.success(toResponse(memory));
    }

    @PutMapping("/{memoryId}/position")
    public ApiResponse<MemoryResponse> updatePosition(
            @PathVariable Long userId,
            @PathVariable Long memoryId,
            @RequestBody MemoryPositionRequest request
    ) {
        // 이번 위치 저장 변경: 드래그로 바꾼 오브젝트 위치를 DB에 반영합니다.
        var memory = memoryService.updateMemoryPosition(userId, memoryId, new MemoryService.UpdateMemoryPositionRequest(
                request.positionX(),
                request.positionY(),
                request.flipX(),
                request.tiltDeg()
        ));
        return ApiResponse.success(toResponse(memory));
    }

    private MemoryResponse toResponse(PrivateMemory memory) {
        // 프론트가 방 장면을 복원할 수 있도록 위치/반전/기울기 값까지 응답
        return new MemoryResponse(
                memory.getId(),
                memory.getMemoryDate().toString(),
                memory.getTitle(),
                memory.getContent(),
                memory.getMoodKey(),
                memory.getWeatherKey(),
                memory.getObjectKey(),
                memory.getSlotKey(),
                memory.getPositionX(),
                memory.getPositionY(),
                memory.getFlipX(),
                memory.getTiltDeg(),
                memory.getCreatedAt().toString(),
                memory.getUpdatedAt().toString()
        );
    }

    public record MemoryRequest(
            String memoryDate,
            String title,
            String content,
            String moodKey,
            String weatherKey,
            String objectKey,
            String slotKey,
            Integer positionX,
            Integer positionY
    ) {
    }

    public record MemoryPositionRequest(
            Integer positionX,
            Integer positionY,
            Boolean flipX,
            Integer tiltDeg
    ) {
    }

    public record MemoryResponse(
            Long id,
            String memoryDate,
            String title,
            String content,
            String moodKey,
            String weatherKey,
            String objectKey,
            String slotKey,
            Integer positionX,
            Integer positionY,
            Boolean flipX,
            Integer tiltDeg,
            String createdAt,
            String updatedAt
    ) {
    }
}
