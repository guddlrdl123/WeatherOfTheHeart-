package com.woth.backend.plaza;





import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.user.User;
import com.woth.backend.user.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

/**
 * 광장 관련 비즈니스 로직을 수행하는 서비스입니다.
 * 광장 조회, 생성, 엔트리 등록 및 참가 제한 검증 등을 처리합니다.
 */


@Service
public class PlazaService {

    private static final String INVITE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int INVITE_CODE_LENGTH = 7;
    private static final int MAX_INVITE_CODE_ATTEMPTS = 20;

    private final PlazaRepository plazaRepository;
    private final PlazaEntryRepository plazaEntryRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final SecureRandom secureRandom = new SecureRandom();

    public PlazaService(
            PlazaRepository plazaRepository,
            PlazaEntryRepository plazaEntryRepository,
            UserRepository userRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.plazaRepository = plazaRepository;
        this.plazaEntryRepository = plazaEntryRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public List<Plaza> listPlazas() {
        return plazaRepository.findAllByIsActiveTrueOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Plaza findPlaza(Long plazaId) {
        return plazaRepository.findById(plazaId)
                .orElseThrow(() -> new CustomException(ErrorCode.PLAZA_NOT_FOUND));
    }

    @Transactional
    public Plaza createPlaza(CreatePlazaRequest request) {
        Plaza plaza = Plaza.builder()
                .title(request.title())
                .topic(request.topic())
                .maxObjects(request.maxObjects())
                .allowSearch(request.allowSearch())
                .allowInvite(request.allowInvite())
                .inviteCode(generateUniqueInviteCode())
                .allowDuplicateObjects(request.allowDuplicateObjects())
                .backgroundType(request.backgroundType() == null ? "weather" : request.backgroundType())
                .backgroundColor(request.backgroundColor())
                .backgroundKey(request.backgroundKey())
                .build();
        return plazaRepository.save(plaza);
    }

    @Transactional(readOnly = true)
    public List<PlazaEntry> listEntries(Long plazaId) {
        return plazaEntryRepository.findByPlazaId(plazaId);
    }

    @Transactional(readOnly = true)
    public List<PlazaEntry> listAllEntries() {
        return plazaEntryRepository.findAll();
    }

    @Transactional
    public PlazaEntry createEntry(Long plazaId, CreatePlazaEntryRequest request) {
        Plaza plaza = plazaRepository.findById(plazaId)
                .orElseThrow(() -> new CustomException(ErrorCode.PLAZA_NOT_FOUND));

        User owner = userRepository.findById(request.ownerId())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (plazaEntryRepository.existsByPlazaIdAndOwnerId(plazaId, owner.getId())) {
            throw new CustomException(ErrorCode.PLAZA_ALREADY_JOINED);
        }

        if (!plaza.getAllowDuplicateObjects() && plazaEntryRepository.existsByPlazaIdAndObjectKey(plazaId, request.objectKey())) {
            throw new CustomException(ErrorCode.PLAZA_DUPLICATE_OBJECT);
        }

        List<PlazaEntry> entries = plazaEntryRepository.findByPlazaId(plazaId);
        if (entries.size() >= plaza.getMaxObjects()) {
            throw new CustomException(ErrorCode.PLAZA_COMPLETE);
        }

        PlazaEntry entry = PlazaEntry.builder()
                .plaza(plaza)
                .owner(owner)
                .title(request.title())
                .content(request.content())
                .moodKey(request.moodKey())
                .weatherKey(request.weatherKey())
                .objectKey(request.objectKey())
                .slotKey(request.slotKey())
                .positionX(request.positionX())
                .positionY(request.positionY())
                .build();

        PlazaEntry savedEntry = plazaEntryRepository.save(entry);

        // 엔트리 저장 트랜잭션이 커밋된 뒤 별도 비동기 흐름에서 완성 이미지/우편을 처리해 deadlock을 피합니다.
        eventPublisher.publishEvent(new PlazaEntryCreatedEvent(plazaId));
        return savedEntry;
    }

    private String generateUniqueInviteCode() {
        for (int attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt++) {
            String inviteCode = generateInviteCode();
            if (!plazaRepository.existsByInviteCode(inviteCode)) {
                return inviteCode;
            }
        }

        throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    private String generateInviteCode() {
        StringBuilder builder = new StringBuilder(INVITE_CODE_LENGTH);
        for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
            int index = secureRandom.nextInt(INVITE_ALPHABET.length());
            builder.append(INVITE_ALPHABET.charAt(index));
        }

        return builder.toString();
    }

    public record CreatePlazaRequest(
            String title,
            String topic,
            Integer maxObjects,
            Boolean allowSearch,
            Boolean allowInvite,
            Boolean allowDuplicateObjects,
            String backgroundType,
            String backgroundColor,
            String backgroundKey
    ) {
    }

    public record CreatePlazaEntryRequest(
            Long ownerId,
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
}






