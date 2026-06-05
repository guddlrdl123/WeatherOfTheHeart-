package com.woth.backend.memory;

/*
  메모리 서비스 클래스
  사용자의 개인 방 생성, 메모 중복 검사, 메모 저장을 담당
 */
import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.ai.service.AiService;
import com.woth.backend.room.PrivateRoom;
import com.woth.backend.room.PrivateRoomRepository;
import com.woth.backend.user.User;
import com.woth.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class MemoryService {

    private final UserRepository userRepository;
    private final PrivateRoomRepository privateRoomRepository;
    private final PrivateMemoryRepository privateMemoryRepository;
    private final AiService aiService;

    public MemoryService(
            UserRepository userRepository,
            PrivateRoomRepository privateRoomRepository,
            PrivateMemoryRepository privateMemoryRepository,
            AiService aiService
    ) {
        this.userRepository = userRepository;
        this.privateRoomRepository = privateRoomRepository;
        this.privateMemoryRepository = privateMemoryRepository;
        this.aiService = aiService;
    }
    // 개인 메모 조회, 생성, 위치 업데이트 기능을 제공하는 서비스 메서드들
    @Transactional(readOnly = true)
    public List<PrivateMemory> listMemories(Long userId) {
        return privateMemoryRepository.findByPrivateRoomUserId(userId);
    }

    @Transactional
    public PrivateMemory createMemory(Long userId, CreateMemoryRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        LocalDate memoryDate = LocalDate.parse(request.memoryDate());

        if (privateMemoryRepository.existsByPrivateRoomUserIdAndMemoryDate(userId, memoryDate)) {
            throw new CustomException(ErrorCode.MEMORY_DUPLICATE);
        }

        int year = memoryDate.getYear();
        int month = memoryDate.getMonthValue();

        // 해당 월의 개인 방이 없으면 메모리 저장 전에 자동으로 생성
        PrivateRoom privateRoom = privateRoomRepository.findByUserIdAndYearAndMonth(userId, year, month)
                .orElseGet(() -> privateRoomRepository.save(
                        PrivateRoom.builder()
                                .user(user)
                                .year(year)
                                .month(month)
                                .title("나만의 방")
                                .build()
                ));

        PrivateMemory memory = PrivateMemory.builder()
                .privateRoom(privateRoom)
                .title(normalizeTitle(request.title()))
                .content(request.content())
                .moodKey(request.moodKey())
                .weatherKey(resolveWeatherKey(userId, request.content()))
                .objectKey(request.objectKey())
                .slotKey(request.slotKey())
                .memoryDate(memoryDate)
                // 최초 배치 좌표가 함께 넘어온 경우 DB에 같이 저장
                .positionX(request.positionX())
                .positionY(request.positionY())
                .build();

        return privateMemoryRepository.save(memory);
    }

    @Transactional
    public PrivateMemory updateMemoryPosition(Long userId, Long memoryId, UpdateMemoryPositionRequest request) {
        // 다른 사용자의 기억을 수정하지 못하도록 memoryId와 userId를 함께 확인
        PrivateMemory memory = privateMemoryRepository.findByIdAndPrivateRoomUserId(memoryId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMORY_NOT_FOUND));

        memory.updatePosition(
                request.positionX(),
                request.positionY(),
                request.flipX(),
                request.tiltDeg()
        );

        return memory;
    }

    @Transactional
    public void deleteMemory(Long userId, Long memoryId) {
        PrivateMemory memory = privateMemoryRepository.findByIdAndPrivateRoomUserId(memoryId, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMORY_NOT_FOUND));

        privateMemoryRepository.delete(memory);
    }

    private String normalizeTitle(String title) {
        // 프론트에서 제목을 비워도 DB의 NOT NULL 제약을 만족하도록 기본 제목을 사용
        if (title == null || title.isBlank()) {
            return "제목 없는 기억";
        }

        return title;
    }

    private String resolveWeatherKey(Long userId, String content) {
        String aiWeatherKey = aiService.analyze(userId, content).weatherKey();

        return switch (aiWeatherKey) {
            case "cloudy" -> "cloud";
            case "rainy" -> "rain";
            case "cherry blossom" -> "cherry";
            default -> aiWeatherKey;
        };
    }

    public record CreateMemoryRequest(
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

    public record UpdateMemoryPositionRequest(
            Integer positionX,
            Integer positionY,
            Boolean flipX,
            Integer tiltDeg
    ) {
    }
}
