package com.woth.backend.object;

import com.woth.backend.global.dto.ApiResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(path = "/api/objects", produces = MediaType.APPLICATION_JSON_VALUE)
public class ObjectCatalogController {

    private final ObjectCatalogService objectCatalogService;

    public ObjectCatalogController(ObjectCatalogService objectCatalogService) {
        this.objectCatalogService = objectCatalogService;
    }

    @GetMapping
    public ApiResponse<List<ObjectCatalogResponse>> list() {
        List<ObjectCatalogResponse> objects = objectCatalogService.listActiveObjects().stream()
                .map(this::toResponse)
                .toList();
        return ApiResponse.success(objects);
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
