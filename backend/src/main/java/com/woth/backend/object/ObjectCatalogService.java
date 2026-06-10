package com.woth.backend.object;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ObjectCatalogService {

    private final ObjectCatalogRepository objectCatalogRepository;

    public ObjectCatalogService(ObjectCatalogRepository objectCatalogRepository) {
        this.objectCatalogRepository = objectCatalogRepository;
    }

    @Transactional(readOnly = true)
    public List<ObjectCatalog> listActiveObjects() {
        return objectCatalogRepository.findByIsActiveTrueOrderByIdAsc();
    }
}
