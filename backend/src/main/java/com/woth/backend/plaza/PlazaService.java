package com.woth.backend.plaza;





import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.like.ObjectLike;
import com.woth.backend.like.ObjectLikeRepository;
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
    private final ObjectLikeRepository objectLikeRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final SecureRandom secureRandom = new SecureRandom();

    public PlazaService(
            PlazaRepository plazaRepository,
            PlazaEntryRepository plazaEntryRepository,
            ObjectLikeRepository objectLikeRepository,
            UserRepository userRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.plazaRepository = plazaRepository;
        this.plazaEntryRepository = plazaEntryRepository;
        this.objectLikeRepository = objectLikeRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public List<Plaza> listPlazas() {
        return plazaRepository.findAllByIsActiveTrueOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<Plaza> listPlazasByOwner(Long ownerId) {
        if (!userRepository.existsById(ownerId)) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }

        return plazaRepository.findByOwnerIdAndIsActiveTrueOrderByCreatedAtDesc(ownerId);
    }

    @Transactional(readOnly = true)
    public Plaza findPlaza(Long plazaId) {
        return plazaRepository.findById(plazaId)
                .orElseThrow(() -> new CustomException(ErrorCode.PLAZA_NOT_FOUND));
    }

    @Transactional
    public Plaza createPlaza(CreatePlazaRequest request) {
        if (request.ownerId() == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        User owner = userRepository.findById(request.ownerId())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Plaza plaza = Plaza.builder()
                .owner(owner)
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

    @Transactional
    public CreatedPlazaWithFirstEntry createPlazaWithFirstEntry(
            CreatePlazaRequest plazaRequest,
            CreatePlazaEntryRequest entryRequest
    ) {
        Plaza plaza = createPlaza(plazaRequest);
        PlazaEntry entry = createEntry(plaza.getId(), entryRequest);

        return new CreatedPlazaWithFirstEntry(plaza, entry);
    }

    @Transactional(readOnly = true)
    public List<PlazaEntry> listEntries(Long plazaId) {
        return plazaEntryRepository.findByPlazaId(plazaId);
    }

    @Transactional(readOnly = true)
    public List<PlazaEntry> listAllEntries() {
        return plazaEntryRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<PlazaEntry> listEntriesByOwner(Long ownerId) {
        if (!userRepository.existsById(ownerId)) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }

        return plazaEntryRepository.findByOwnerId(ownerId);
    }

    @Transactional(readOnly = true)
    public long countEntries(Long plazaId) {
        return plazaEntryRepository.countByPlazaId(plazaId);
    }

    @Transactional(readOnly = true)
    public long countEntryLikes(Long entryId) {
        return objectLikeRepository.countByPlazaEntryId(entryId);
    }

    @Transactional(readOnly = true)
    public List<Long> listEntryLikedUserIds(Long entryId) {
        return objectLikeRepository.findByPlazaEntryId(entryId).stream()
                .map(like -> like.getUser().getId())
                .toList();
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
                .layerIndex(request.layer())
                .build();

        PlazaEntry savedEntry = plazaEntryRepository.save(entry);

        // 엔트리 저장 트랜잭션이 커밋된 뒤 별도 비동기 흐름에서 완성 이미지/우편을 처리해 deadlock을 피합니다.
        eventPublisher.publishEvent(new PlazaEntryCreatedEvent(plazaId));
        return savedEntry;
    }

    @Transactional
    public Plaza completePlaza(Long plazaId, Long ownerId) {
        Plaza plaza = plazaRepository.findById(plazaId)
                .orElseThrow(() -> new CustomException(ErrorCode.PLAZA_NOT_FOUND));

        if (ownerId == null || plaza.getOwner() == null || !plaza.getOwner().getId().equals(ownerId)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        eventPublisher.publishEvent(new PlazaEntryCreatedEvent(plazaId, true));
        return plaza;
    }

    @Transactional
    public void deletePlaza(Long plazaId, Long ownerId) {
        Plaza plaza = plazaRepository.findById(plazaId)
                .orElseThrow(() -> new CustomException(ErrorCode.PLAZA_NOT_FOUND));

        if (ownerId == null || plaza.getOwner() == null || !plaza.getOwner().getId().equals(ownerId)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        plaza.deactivate();
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

    @Transactional
    public PlazaEntry toggleEntryLike(Long entryId, Long userId) {
        if (userId == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        PlazaEntry entry = plazaEntryRepository.findById(entryId)
                .orElseThrow(() -> new CustomException(ErrorCode.PLAZA_ENTRY_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        objectLikeRepository.findByUserIdAndPlazaEntryId(user.getId(), entry.getId())
                .ifPresentOrElse(
                        objectLikeRepository::delete,
                        () -> objectLikeRepository.save(ObjectLike.builder()
                                .user(user)
                                .plazaEntry(entry)
                                .build())
                );

        return entry;
    }

    @Transactional
    public PlazaEntry updateEntry(Long entryId, UpdatePlazaEntryRequest request) {
        if (request.ownerId() == null || request.content() == null || request.content().isBlank()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        PlazaEntry entry = plazaEntryRepository.findById(entryId)
                .orElseThrow(() -> new CustomException(ErrorCode.PLAZA_ENTRY_NOT_FOUND));

        if (!entry.getOwner().getId().equals(request.ownerId())
                || entry.getPlaza().getOwner() == null
                || !entry.getPlaza().getOwner().getId().equals(request.ownerId())) {
            throw new CustomException(ErrorCode.PLAZA_ENTRY_FORBIDDEN);
        }

        entry.updateContent(request.title(), request.content());
        return entry;
    }

    @Transactional
    public PlazaEntry updateEntryPosition(Long entryId, UpdatePlazaEntryPositionRequest request) {
        if (request.ownerId() == null || request.positionX() == null || request.positionY() == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        PlazaEntry entry = plazaEntryRepository.findById(entryId)
                .orElseThrow(() -> new CustomException(ErrorCode.PLAZA_ENTRY_NOT_FOUND));

        if (!entry.getOwner().getId().equals(request.ownerId())) {
            throw new CustomException(ErrorCode.PLAZA_ENTRY_FORBIDDEN);
        }

        entry.updatePosition(request.positionX(), request.positionY(), request.layer());
        return entry;
    }

    @Transactional
    public void deleteEntry(Long entryId, Long ownerId) {
        if (ownerId == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        PlazaEntry entry = plazaEntryRepository.findById(entryId)
                .orElseThrow(() -> new CustomException(ErrorCode.PLAZA_ENTRY_NOT_FOUND));

        if (!entry.getOwner().getId().equals(ownerId)
                || entry.getPlaza().getOwner() == null
                || entry.getPlaza().getOwner().getId().equals(ownerId)) {
            throw new CustomException(ErrorCode.PLAZA_ENTRY_FORBIDDEN);
        }

        objectLikeRepository.deleteByPlazaEntryId(entryId);
        plazaEntryRepository.delete(entry);
    }

    public record CreatePlazaRequest(
            Long ownerId,
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
            Integer positionY,
            Integer layer
    ) {
    }

    public record CreatedPlazaWithFirstEntry(
            Plaza plaza,
            PlazaEntry entry
    ) {
    }

    public record UpdatePlazaEntryRequest(
            Long ownerId,
            String title,
            String content
    ) {
    }

    public record UpdatePlazaEntryPositionRequest(
            Long ownerId,
            Integer positionX,
            Integer positionY,
            Integer layer
    ) {
    }
}




