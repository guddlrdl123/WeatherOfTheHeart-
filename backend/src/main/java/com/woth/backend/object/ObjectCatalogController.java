package com.woth.backend.object;

import com.woth.backend.global.dto.ApiResponse;
import com.woth.backend.storage.S3ImageStorageService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping(path = "/api/objects")
public class ObjectCatalogController {

    private final ObjectCatalogService objectCatalogService;

    public ObjectCatalogController(ObjectCatalogService objectCatalogService) {
        this.objectCatalogService = objectCatalogService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<List<ObjectCatalogResponse>> list() {
        List<ObjectCatalogResponse> objects = objectCatalogService.listActiveObjects().stream()
                .map(this::toResponse)
                .toList();
        return ApiResponse.success(objects);
    }

    @GetMapping(value = "/{objectKey}/image")
    public ResponseEntity<byte[]> image(@PathVariable String objectKey) {
        S3ImageStorageService.StoredImage image = objectCatalogService.getActiveObjectImage(objectKey);
        MediaType contentType;

        try {
            contentType = MediaType.parseMediaType(image.contentType());
        } catch (IllegalArgumentException ignored) {
            contentType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic())
                .contentType(contentType)
                .body(image.bytes());
    }

    private ObjectCatalogResponse toResponse(ObjectCatalog catalog) {
        return new ObjectCatalogResponse(
                catalog.getObjectKey(),
                catalog.getObjectName(),
                catalog.getImageUrl(),
                catalog.getCategory(),
                catalog.getWidth()
        );
    }

    public record ObjectCatalogResponse(
            String objectKey,
            String name,
            String imageUrl,
            String category,
            Integer width
    ) {
    }
}
