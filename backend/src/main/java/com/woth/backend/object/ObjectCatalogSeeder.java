package com.woth.backend.object;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/*
 * 애플리케이션 시작 시 기본 오브젝트 카탈로그를 시드(seed)하는 컴포넌트
 */
@Component
public class ObjectCatalogSeeder implements CommandLineRunner {

    private final ObjectCatalogService objectCatalogService;

    public ObjectCatalogSeeder(ObjectCatalogService objectCatalogService) {
        this.objectCatalogService = objectCatalogService;
    }

    @Override
    public void run(String... args) {
        // 애플리케이션 시작 시 기본 오브젝트를 DB에 upsert해서 프론트가 DB 카탈로그를 불러오게 합니다.
        objectCatalogService.seedDefaultCatalog();
    }
}