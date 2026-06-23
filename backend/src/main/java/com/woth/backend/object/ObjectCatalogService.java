package com.woth.backend.object;

import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.storage.S3ImageStorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ObjectCatalogService {

    private final ObjectCatalogRepository objectCatalogRepository;
    private final S3ImageStorageService imageStorageService;

    public ObjectCatalogService(
            ObjectCatalogRepository objectCatalogRepository,
            S3ImageStorageService imageStorageService
    ) {
        this.objectCatalogRepository = objectCatalogRepository;
        this.imageStorageService = imageStorageService;
    }

    @Transactional(readOnly = true)
    public List<ObjectCatalog> listActiveObjects() {
        return objectCatalogRepository.findByIsActiveTrueOrderByIdAsc();
    }

    @Transactional(readOnly = true)
    public S3ImageStorageService.StoredImage getActiveObjectImage(String objectKey) {
        ObjectCatalog catalog = objectCatalogRepository.findByObjectKeyAndIsActiveTrue(objectKey)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT));

        return imageStorageService.downloadImage(catalog.getImageUrl());
    }
}
