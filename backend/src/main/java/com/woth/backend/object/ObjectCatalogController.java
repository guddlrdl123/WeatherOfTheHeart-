package com.woth.backend.object;

import com.woth.backend.global.dto.ApiResponse;
import com.woth.backend.storage.S3ImageStorageService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/* 
    * ObjectCatalog 엔티티의 REST API 컨트롤러
    * /api/objects 엔드포인트에서 활성화된 오브젝트 목록을 조회하는 기능
*/

@RestController
@RequestMapping(path = "/api/objects", produces = MediaType.APPLICATION_JSON_VALUE)
public class ObjectCatalogController {

    private final ObjectCatalogService objectCatalogService;
    private final S3ImageStorageService s3ImageStorageService;

    public ObjectCatalogController(ObjectCatalogService objectCatalogService, S3ImageStorageService s3ImageStorageService) {
        this.objectCatalogService = objectCatalogService;
        this.s3ImageStorageService = s3ImageStorageService;
    }

    @GetMapping
    public ApiResponse<List<ObjectCatalogResponse>> list() {
        // 프론트의 하드코딩 오브젝트 목록 대신 DB object_catalogs 기준 카탈로그를 내려준다.
        List<ObjectCatalogResponse> objects = objectCatalogService.listActiveObjects().stream()
                .map(this::toResponse)
                .toList();
        return ApiResponse.success(objects);
    }
    
    private ObjectCatalogResponse toResponse(ObjectCatalog catalog) {
        return new ObjectCatalogResponse(
                catalog.getObjectKey(),
                catalog.getObjectName(),
                catalog.getSlotKey(),
                resolveImageUrl(catalog),
                catalog.getImageScale(),
                catalog.getRoomWidth(),
                catalog.getFlipX(),
                catalog.getTiltDeg(),
                catalog.getDescription(),
                catalog.getAllowPrivate(),
                catalog.getAllowPlaza()
        );
    }

    private String resolveImageUrl(ObjectCatalog catalog) {
        String imageUrl = catalog.getImageUrl();

        if (imageUrl == null || imageUrl.isBlank()) {
            imageUrl = "objects/" + catalog.getObjectKey() + ".png";
        }

        return s3ImageStorageService.createReadUrl(imageUrl);
    }

    public record ObjectCatalogResponse(
            String objectKey,
            String name,
            String slotKey,
            String imageUrl,
            Double imageScale,
            Integer roomWidth,
            Boolean flipX,
            Integer tiltDeg,
            String description,
            Boolean allowPrivate,
            Boolean allowPlaza
    ) {
    }
}
