package com.woth.backend.object;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/*
 * ObjectCatalog 엔티티의 비즈니스 로직을 담당하는 서비스 클래스
 * DB에서 활성화된 오브젝트 목록 조회와 애플리케이션 시작 시 기본 카탈로그 시딩 기능을 제공
*/

@Service
public class ObjectCatalogService {

    private static final String DEFAULT_DESCRIPTION = "Imported from the objects folder.";

    private final ObjectCatalogRepository objectCatalogRepository;

    public ObjectCatalogService(ObjectCatalogRepository objectCatalogRepository) {
        this.objectCatalogRepository = objectCatalogRepository;
    }

    @Transactional(readOnly = true)
    public List<ObjectCatalog> listActiveObjects() {
        return objectCatalogRepository.findByIsActiveTrueOrderByIdAsc();
    }

    @Transactional
    public void seedDefaultCatalog() {
        // 기존 프론트 상수에 있던 오브젝트 메타데이터를 DB 카탈로그로 옮겨 API의 기준 데이터를 만든다.
        List<DefaultObjectSeed> seeds = defaultObjects();
        Set<String> defaultObjectKeys = seeds.stream()
                .map(DefaultObjectSeed::objectKey)
                .collect(Collectors.toSet());

        objectCatalogRepository.findAll().stream()
                .filter(catalog -> !defaultObjectKeys.contains(catalog.getObjectKey()))
                .forEach(catalog -> {
                    catalog.deactivate();
                    objectCatalogRepository.save(catalog);
                });

        seeds.forEach(seed -> {
            ObjectCatalog catalog = objectCatalogRepository.findByObjectKey(seed.objectKey())
                    .orElseGet(() -> ObjectCatalog.builder()
                            .objectKey(seed.objectKey())
                            .objectName(seed.objectName())
                            .mood(seed.mood())
                            .slotKey(seed.slotKey())
                            .imageUrl(seed.imageUrl())
                            .imageScale(seed.imageScale())
                            .flipX(seed.flipX())
                            .tiltDeg(seed.tiltDeg())
                            .description(seed.description())
                            .allowPrivate(seed.allowPrivate())
                            .allowPlaza(seed.allowPlaza())
                            .isActive(seed.isActive())
                            .build());

            catalog.syncCatalogData(
                    seed.objectName(),
                    seed.mood(),
                    seed.slotKey(),
                    seed.imageUrl(),
                    seed.imageScale(),
                    seed.flipX(),
                    seed.tiltDeg(),
                    seed.description(),
                    seed.allowPrivate(),
                    seed.allowPlaza(),
                    seed.isActive()
            );
            objectCatalogRepository.save(catalog);
        });
    }

    // 기본 카탈로그 시딩에 사용할 오브젝트 메타데이터 리스트 (objectKey, objectName, mood, slotKey, imageUrl, imageScale, flipX, tiltDeg, description, allowPrivate, allowPlaza, isActive)
    private List<DefaultObjectSeed> defaultObjects() {
        return List.of(
                object("carpet", "Carpet", "carpet", "/objects/object-01.png", 3.9, false, 0),
                object("poster", "Poster", "poster", "/objects/object-02.png", 2.3, false, 0),
                object("letter", "Letter", "letter", "/objects/object-03.png", 0.6, false, 0),
                object("mug", "Mug", "mug", "/objects/object-04.png", 0.6, false, 0),
                object("plant", "Plant", "plant", "/objects/object-05.png", 1.2, false, 0),
                object("radio", "Radio", "radio", "/objects/object-06.png", 1.3, false, 0),
                object("curtain", "Curtain", "curtain", "/objects/object-07.png", 5.0, false, 0),
                object("shoes", "Shoes", "shoes", "/objects/object-08.png", 1.1, false, 0),
                object("frame", "Frame", "frame", "/objects/object-09.png", 1.3, false, 0),
                object("bed", "Bed", "bed", "/objects/object-10.png", 5.7, false, 0),
                object("umbrella", "Umbrella", "umbrella", "/objects/object-11.png", 1.7, false, 0),
                object("book", "Book", "book", "/objects/object-12.png", 0.8, false, 0),
                object("desk", "책상", "desk", "/objects/object-13.png", 4.0, false, 0),
                object("cat", "고양이", "cat", "/objects/object-14.png", 1.2, false, 0),
                object("candle", "양초", "candle", "/objects/object-15.png", 0.7, false, 0),
                object("rug", "러그", "rug", "/objects/object-16.png", 3.0, false, 0),
                object("clock", "시계", "clock", "/objects/object-17.png", 0.9, false, 0),
                object("stand_lamp", "스탠드조명", "stand_lamp", "/objects/object-18.png", 2.7, false, 0),
                object("bookshelf", "책장", "bookshelf", "/objects/object-19.png", 4.2, false, 0),
                object("shelf", "선반", "shelf", "/objects/object-20.png", 3.2, false, 0),
                object("laptop", "Laptop", "laptop", "/objects/object-21.png", 1.2, true, 7),
                object("monitor", "Monitor", "monitor", "/objects/object-22.png", 3.0, true, 0),
                object("dog", "Dog", "dog", "/objects/object-23.png", 1.0, false, 0),
                object("fireplace", "Fireplace", "fireplace", "/objects/object-24.png", 3.2, false, -1),
                object("lp_player", "LP Player", "lp_player", "/objects/object-25.png", 1.0, false, 0),
                object("mirror", "Mirror", "mirror", "/objects/object-26.png", 3.0, true, 0),
                object("drawer", "Drawer", "drawer", "/objects/object-27.png", 2.0, false, -1),
                object("chair", "Chair", "chair", "/objects/object-28.png", 2.0, true, 2),
                object("trash_can", "Trash Can", "trash_can", "/objects/object-29.png", 1.5, true, 0),
                object("trash", "Trash", "trash", "/objects/object-30.png", 1.0, false, 0)
        );
    }

    private DefaultObjectSeed object(String key, String name, String slotKey, String imageUrl, Double imageScale, Boolean flipX, Integer tiltDeg) {
        return new DefaultObjectSeed(key, name, "neutral", slotKey, imageUrl, imageScale, flipX, tiltDeg, DEFAULT_DESCRIPTION, true, true, true);
    }

    private record DefaultObjectSeed(
            String objectKey,
            String objectName,
            String mood,
            String slotKey,
            String imageUrl,
            Double imageScale,
            Boolean flipX,
            Integer tiltDeg,
            String description,
            Boolean allowPrivate,
            Boolean allowPlaza,
            Boolean isActive
    ) {
    }
}
