package com.woth.backend.plaza;

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
    public ApiResponse<PlazaResponse> create(@RequestBody CreatePlazaRequest request) {
        return ApiResponse.success(toResponse(plazaService.createPlaza(
                new PlazaService.CreatePlazaRequest(
                        request.ownerId(),
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
    public ApiResponse<PlazaEntryResponse> createEntry(@PathVariable Long plazaId, @RequestBody CreatePlazaEntryRequest request) {
        var entry = plazaService.createEntry(plazaId, new PlazaService.CreatePlazaEntryRequest(
                request.ownerId(),
                request.title(),
                request.content(),
                request.moodKey(),
                request.weatherKey(),
                request.objectKey(),
                request.slotKey(),
                request.positionX(),
                request.positionY()
        ));
        return ApiResponse.success(toEntryResponse(entry));
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
            Integer positionY
    ) {
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
            String createdAt,
            String updatedAt
    ) {
    }
}
