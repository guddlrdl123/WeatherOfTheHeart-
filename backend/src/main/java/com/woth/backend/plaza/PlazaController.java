package com.woth.backend.plaza;

import com.woth.backend.auth.AuthenticatedUser;
import com.woth.backend.auth.CurrentUser;
import com.woth.backend.global.dto.ApiResponse;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 광장(플라자) 관련 REST API 컨트롤러입니다.
 * 광장 목록 조회, 단일 광장 조회, 광장 생성 및 광장 엔트리 등록 기능을 제공합니다.
 */


@RestController
@RequestMapping(path = "/api/plazas", produces = MediaType.APPLICATION_JSON_VALUE)
public class PlazaController {

    private final PlazaService plazaService;

    public PlazaController(PlazaService plazaService) {
        this.plazaService = plazaService;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ApiResponse<List<PlazaResponse>> list() {
        List<PlazaResponse> plazas = plazaService.listPlazas().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ApiResponse.success(plazas);
    }

    @GetMapping("/{plazaId}")
    @Transactional(readOnly = true)
    public ApiResponse<PlazaResponse> detail(@PathVariable Long plazaId) {
        return ApiResponse.success(toResponse(plazaService.findPlaza(plazaId)));
    }

    @PostMapping
    public ApiResponse<PlazaResponse> create(@CurrentUser AuthenticatedUser currentUser, @RequestBody CreatePlazaRequest request) {
        return ApiResponse.success(toResponse(plazaService.createPlaza(
                new PlazaService.CreatePlazaRequest(
                        currentUser.id(),
                        request.title(),
                        request.topic(),
                        request.maxObjects(),
                        request.allowSearch(),
                        request.allowInvite(),
                        request.allowDuplicateObjects(),
                        request.backgroundType(),
                        request.backgroundColor(),
                        request.backgroundKey()
                )
        )));
    }

    @PostMapping("/with-first-entry")
    public ApiResponse<PlazaWithFirstEntryResponse> createWithFirstEntry(
            @CurrentUser AuthenticatedUser currentUser,
            @RequestBody CreatePlazaWithFirstEntryRequest request
    ) {
        var result = plazaService.createPlazaWithFirstEntry(
                new PlazaService.CreatePlazaRequest(
                        currentUser.id(),
                        request.title(),
                        request.topic(),
                        request.maxObjects(),
                        request.allowSearch(),
                        request.allowInvite(),
                        request.allowDuplicateObjects(),
                        request.backgroundType(),
                        request.backgroundColor(),
                        request.backgroundKey()
                ),
                new PlazaService.CreatePlazaEntryRequest(
                        currentUser.id(),
                        request.entryTitle(),
                        request.entryContent(),
                        request.moodKey(),
                        request.weatherKey(),
                        request.objectKey(),
                        request.slotKey(),
                        request.positionX(),
                        request.positionY(),
                        request.layer()
                )
        );

        return ApiResponse.success(new PlazaWithFirstEntryResponse(
                toResponse(result.plaza()),
                toEntryResponse(result.entry())
        ));
    }

    @GetMapping("/entries")
    @Transactional(readOnly = true)
    public ApiResponse<List<PlazaEntryResponse>> listAllEntries() {
        List<PlazaEntryResponse> entries = plazaService.listAllEntries().stream()
                .map(this::toEntryResponse)
                .collect(Collectors.toList());
        return ApiResponse.success(entries);
    }

    @GetMapping("/{plazaId}/entries")
    @Transactional(readOnly = true)
    public ApiResponse<List<PlazaEntryResponse>> listEntries(@PathVariable Long plazaId) {
        List<PlazaEntryResponse> entries = plazaService.listEntries(plazaId).stream()
                .map(this::toEntryResponse)
                .collect(Collectors.toList());
        return ApiResponse.success(entries);
    }

    @PostMapping("/{plazaId}/entries")
    public ApiResponse<PlazaEntryResponse> createEntry(
            @CurrentUser AuthenticatedUser currentUser,
            @PathVariable Long plazaId,
            @RequestBody CreatePlazaEntryRequest request
    ) {
        var entry = plazaService.createEntry(plazaId, new PlazaService.CreatePlazaEntryRequest(
                currentUser.id(),
                request.title(),
                request.content(),
                request.moodKey(),
                request.weatherKey(),
                request.objectKey(),
                request.slotKey(),
                request.positionX(),
                request.positionY(),
                request.layer()
        ));
        return ApiResponse.success(toEntryResponse(entry));
    }


    @PostMapping("/entries/{entryId}/likes")
    public ApiResponse<PlazaEntryResponse> toggleEntryLike(
            @CurrentUser AuthenticatedUser currentUser,
            @PathVariable Long entryId
    ) {
        return ApiResponse.success(toEntryResponse(plazaService.toggleEntryLike(entryId, currentUser.id())));
    }

    @PatchMapping("/entries/{entryId}")
    public ApiResponse<PlazaEntryResponse> updateEntry(
            @CurrentUser AuthenticatedUser currentUser,
            @PathVariable Long entryId,
            @RequestBody UpdatePlazaEntryRequest request
    ) {
        return ApiResponse.success(toEntryResponse(plazaService.updateEntry(
                entryId,
                new PlazaService.UpdatePlazaEntryRequest(
                        currentUser.id(),
                        request.title(),
                        request.content()
                )
        )));
    }

    @PatchMapping("/entries/{entryId}/position")
    public ApiResponse<PlazaEntryResponse> updateEntryPosition(
            @CurrentUser AuthenticatedUser currentUser,
            @PathVariable Long entryId,
            @RequestBody UpdatePlazaEntryPositionRequest request
    ) {
        return ApiResponse.success(toEntryResponse(plazaService.updateEntryPosition(
                entryId,
                new PlazaService.UpdatePlazaEntryPositionRequest(
                        currentUser.id(),
                        request.positionX(),
                        request.positionY(),
                        request.layer()
                )
        )));
    }

    @DeleteMapping("/entries/{entryId}")
    public ApiResponse<Void> deleteEntry(
            @CurrentUser AuthenticatedUser currentUser,
            @PathVariable Long entryId
    ) {
        plazaService.deleteEntry(entryId, currentUser.id());
        return ApiResponse.success(null);
    }

    @DeleteMapping("/{plazaId}")
    public ApiResponse<Void> delete(
            @CurrentUser AuthenticatedUser currentUser,
            @PathVariable Long plazaId
    ) {
        plazaService.deletePlaza(plazaId, currentUser.id());
        return ApiResponse.success(null);
    }

    @PatchMapping("/{plazaId}/complete")
    public ApiResponse<PlazaResponse> complete(@CurrentUser AuthenticatedUser currentUser, @PathVariable Long plazaId) {
        return ApiResponse.success(toResponse(plazaService.completePlaza(plazaId, currentUser.id())));
    }

    private PlazaResponse toResponse(Plaza plaza) {
        return new PlazaResponse(
                plaza.getId(),
                plaza.getOwner() == null ? null : plaza.getOwner().getId(),
                plaza.getTitle(),
                plaza.getTopic(),
                plaza.getMaxObjects(),
                plaza.getAllowSearch(),
                plaza.getAllowInvite(),
                plaza.getInviteCode(),
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

    private PlazaEntryResponse toEntryResponse(PlazaEntry entry) {
        return new PlazaEntryResponse(
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
                entry.getLayerIndex(),
                plazaService.countEntryLikes(entry.getId()),
                plazaService.listEntryLikedUserIds(entry.getId()),
                entry.getCreatedAt().toString(),
                entry.getUpdatedAt().toString()
        );
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

    public record CreatePlazaWithFirstEntryRequest(
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
            String entryTitle,
            String entryContent,
            String moodKey,
            String weatherKey,
            String objectKey,
            String slotKey,
            Integer positionX,
            Integer positionY,
            Integer layer
    ) {
    }

    public record ToggleEntryLikeRequest(
            Long userId
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

    public record CompletePlazaRequest(Long ownerId) {
    }

    public record PlazaResponse(
            Long id,
            Long ownerId,
            String title,
            String topic,
            Integer maxObjects,
            Boolean allowSearch,
            Boolean allowInvite,
            String inviteCode,
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

    public record PlazaEntryResponse(
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
            Integer layer,
            Long likeCount,
            List<Long> likedUserIds,
            String createdAt,
            String updatedAt
    ) {
    }

    public record PlazaWithFirstEntryResponse(
            PlazaResponse plaza,
            PlazaEntryResponse entry
    ) {
    }
}
