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
    private static final String LEGACY_OBJECT_IMAGE_PREFIX = "image/";
    private static final String OBJECT_IMAGE_PREFIX = "objects/";

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
                            .roomWidth(seed.roomWidth())
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
                    seed.imageUrl() == null ? catalog.getImageUrl() : seed.imageUrl(),
                    seed.imageScale(),
                    seed.roomWidth(),
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

    // 기본 카탈로그 시딩에 사용할 오브젝트 메타데이터 리스트 (objectKey, objectName, mood, slotKey, imageUrl, imageScale, roomWidth, flipX, tiltDeg, description, allowPrivate, allowPlaza, isActive)
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
                object("trash", "Trash", "trash", "/objects/object-30.png", 1.0, false, 0),
                object("furniture-wood-chair", "나무 의자", "furniture-wood-chair", "/objects/furniture-wood-chair.png", 1.2, false, 0),
                object("furniture-side-table", "사이드 테이블", "furniture-side-table", "/objects/furniture-side-table.png", 1.25, false, 0),
                object("furniture-low-shelf", "낮은 선반", "furniture-low-shelf", "/objects/furniture-low-shelf.png", 1.8, false, 0),
                object("furniture-floor-lamp", "스탠드 조명", "furniture-floor-lamp", "/objects/furniture-floor-lamp.png", 0.78, false, 0),
                object("plaza-vending-machine", "자판기", "plaza-vending-machine", "/objects/plaza-vending-machine.png", 1.5, false, 0),
                object("plaza-rainbow", "무지개", "plaza-rainbow", "/objects/plaza-rainbow.png", 2.7, false, 0),
                object("plaza-flower", "꽃", "plaza-flower", "/objects/plaza-flower.png", 1.0, false, 0),
                object("01-empty-single-bed", "01-empty-single-bed", "01-empty-single-bed", null, 1.0, false, 0),
                object("02-pillow", "02-pillow", "02-pillow", null, 1.0, false, 0),
                object("03-lying-cushion", "03-lying-cushion", "03-lying-cushion", null, 1.0, false, 0),
                object("05-empty-bookshelf", "05-empty-bookshelf", "05-empty-bookshelf", null, 1.0, false, 0),
                object("10-front-storage-box", "10-front-storage-box", "10-front-storage-box", null, 1.0, false, 0),
                object("29-flat-notebook", "29-flat-notebook", "29-flat-notebook", null, 1.0, false, 0),
                object("animal1", "animal1", "animal1", null, 1.0, false, 0),
                object("animal2", "animal2", "animal2", null, 1.0, false, 0),
                object("animal3", "animal3", "animal3", null, 1.0, false, 0),
                object("animal4", "animal4", "animal4", null, 1.0, false, 0),
                object("animal5", "animal5", "animal5", null, 1.0, false, 0),
                object("animal6", "animal6", "animal6", null, 1.0, false, 0),
                object("animal7", "animal7", "animal7", null, 1.0, false, 0),
                object("animal8", "animal8", "animal8", null, 1.0, false, 0),
                object("decor-coffee-cup", "decor-coffee-cup", "decor-coffee-cup", null, 1.0, false, 0),
                object("furniture-front-side-table", "furniture-front-side-table", "furniture-front-side-table", null, 1.0, false, 0),
                object("image", "image", "image", null, 1.0, false, 0),
                object("image2", "image2", "image2", null, 1.0, false, 0),
                object("pet-lying-dog", "pet-lying-dog", "pet-lying-dog", null, 1.0, false, 0),
                object("pet-sitting-cat", "pet-sitting-cat", "pet-sitting-cat", null, 1.0, false, 0),
                object("pet-sitting-dog", "pet-sitting-dog", "pet-sitting-dog", null, 1.0, false, 0),
                object("pet-sleeping-cat", "pet-sleeping-cat", "pet-sleeping-cat", null, 1.0, false, 0),
                object("plaza-barrel", "plaza-barrel", "plaza-barrel", null, 1.0, false, 0),
                object("plaza-basket-stand", "plaza-basket-stand", "plaza-basket-stand", null, 1.0, false, 0),
                object("plaza-bench", "plaza-bench", "plaza-bench", null, 1.0, false, 0),
                object("plaza-bush", "plaza-bush", "plaza-bush", null, 1.0, false, 0),
                object("plaza-clay-pot", "plaza-clay-pot", "plaza-clay-pot", null, 1.0, false, 0),
                object("plaza-cushion-seat", "plaza-cushion-seat", "plaza-cushion-seat", null, 1.0, false, 0),
                object("plaza-garden-arch", "plaza-garden-arch", "plaza-garden-arch", null, 1.0, false, 0),
                object("plaza-market-sign", "plaza-market-sign", "plaza-market-sign", null, 1.0, false, 0),
                object("plaza-notice-board", "plaza-notice-board", "plaza-notice-board", null, 1.0, false, 0),
                object("plaza-planter-box", "plaza-planter-box", "plaza-planter-box", null, 1.0, false, 0),
                object("plaza-puddle", "plaza-puddle", "plaza-puddle", null, 1.0, false, 0),
                object("plaza-round-table", "plaza-round-table", "plaza-round-table", null, 1.0, false, 0),
                object("plaza-shade-umbrella", "plaza-shade-umbrella", "plaza-shade-umbrella", null, 1.0, false, 0),
                object("plaza-small-bridge", "plaza-small-bridge", "plaza-small-bridge", null, 1.0, false, 0),
                object("plaza-small-well", "plaza-small-well", "plaza-small-well", null, 1.0, false, 0),
                object("plaza-stone-lantern", "plaza-stone-lantern", "plaza-stone-lantern", null, 1.0, false, 0),
                object("plaza-stone-marker", "plaza-stone-marker", "plaza-stone-marker", null, 1.0, false, 0),
                object("plaza-tea-stand", "plaza-tea-stand", "plaza-tea-stand", null, 1.0, false, 0),
                object("plaza-trash", "plaza-trash", "plaza-trash", null, 1.0, false, 0),
                object("plaza-tree", "plaza-tree", "plaza-tree", null, 1.0, false, 0),
                object("plaza-watering-can", "plaza-watering-can", "plaza-watering-can", null, 1.0, false, 0),
                object("plaza-wood-crate", "plaza-wood-crate", "plaza-wood-crate", null, 1.0, false, 0),
                object("plaza-wooden-fence", "plaza-wooden-fence", "plaza-wooden-fence", null, 1.0, false, 0),
                object("plaza-wooden-stool", "plaza-wooden-stool", "plaza-wooden-stool", null, 1.0, false, 0),
                object("노을_뜨개바구니", "노을_뜨개바구니", "노을_뜨개바구니", null, 1.0, false, 0),
                object("노을_화병", "노을_화병", "노을_화병", null, 1.0, false, 0),
                object("맑음_과일접시", "맑음_과일접시", "맑음_과일접시", null, 1.0, false, 0),
                object("맑음_말린허브묶음", "맑음_말린허브묶음", "맑음_말린허브묶음", null, 1.0, false, 0),
                object("맑음_바람종", "맑음_바람종", "맑음_바람종", null, 1.0, false, 0),
                object("맑음_빨래건조대", "맑음_빨래건조대", "맑음_빨래건조대", null, 1.0, false, 0),
                object("맑음_운동화", "맑음_운동화", "맑음_운동화", null, 1.0, false, 0),
                object("맑음_유리과일볼", "맑음_유리과일볼", "맑음_유리과일볼", null, 1.0, false, 0),
                object("맑음_자외선차단제", "맑음_자외선차단제", "맑음_자외선차단제", null, 1.0, false, 0),
                object("맑음_커튼", "맑음_커튼", "맑음_커튼", null, 1.0, false, 0),
                object("맑음_해바라기", "맑음_해바라기", "맑음_해바라기", null, 1.0, false, 0),
                object("밤_모기향", "밤_모기향", "밤_모기향", null, 1.0, false, 0),
                object("밤_무드등", "밤_무드등", "밤_무드등", null, 1.0, false, 0),
                object("밤_알람시계", "밤_알람시계", "밤_알람시계", null, 1.0, false, 0),
                object("밤_오르골", "밤_오르골", "밤_오르골", null, 1.0, false, 0),
                object("벚꽃_", "벚꽃_", "벚꽃_", null, 1.0, false, 0),
                object("벚꽃_가지장식", "벚꽃_가지장식", "벚꽃_가지장식", null, 1.0, false, 0),
                object("벚꽃_나무이름표", "벚꽃_나무이름표", "벚꽃_나무이름표", null, 1.0, false, 0),
                object("벚꽃_노리개", "벚꽃_노리개", "벚꽃_노리개", null, 1.0, false, 0),
                object("벚꽃_리본상자", "벚꽃_리본상자", "벚꽃_리본상자", null, 1.0, false, 0),
                object("벚꽃_손수건", "벚꽃_손수건", "벚꽃_손수건", null, 1.0, false, 0),
                object("벚꽃_작은나무", "벚꽃_작은나무", "벚꽃_작은나무", null, 1.0, false, 0),
                object("비_무드등", "비_무드등", "비_무드등", null, 1.0, false, 0),
                object("비_비모양쿠션", "비_비모양쿠션", "비_비모양쿠션", null, 1.0, false, 0),
                object("비_신문지묶음", "비_신문지묶음", "비_신문지묶음", null, 1.0, false, 0),
                object("흐림_담요", "흐림_담요", "흐림_담요", null, 1.0, false, 0),
                object("흐림_무광컵", "흐림_무광컵", "흐림_무광컵", null, 1.0, false, 0),
                object("흐림_바늘꽂이", "흐림_바늘꽂이", "흐림_바늘꽂이", null, 1.0, false, 0),
                object("흐림_빨래바구니", "흐림_빨래바구니", "흐림_빨래바구니", null, 1.0, false, 0)
        );
    }

    private DefaultObjectSeed object(String key, String name, String slotKey, String imageUrl, Double imageScale, Boolean flipX, Integer tiltDeg) {
        return new DefaultObjectSeed(
                key,
                name,
                "neutral",
                slotKey,
                defaultImageUrl(key, imageUrl),
                imageScale,
                defaultRoomWidth(key, imageScale),
                flipX,
                tiltDeg,
                DEFAULT_DESCRIPTION,
                true,
                true,
                true
        );
    }

    private String defaultImageUrl(String key, String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return OBJECT_IMAGE_PREFIX + key + ".png";
        }

        String normalizedImageUrl = imageUrl.trim().replaceAll("^/+", "");

        if (normalizedImageUrl.startsWith(LEGACY_OBJECT_IMAGE_PREFIX)) {
            return OBJECT_IMAGE_PREFIX + normalizedImageUrl.substring(LEGACY_OBJECT_IMAGE_PREFIX.length());
        }

        return normalizedImageUrl;
    }

    private Integer defaultRoomWidth(String key, Double imageScale) {
        return switch (key) {
            case "plant" -> 86;
            case "books" -> 55;
            case "frame" -> 86;
            case "dresser" -> 160;
            case "pet-sitting-cat", "pet-sitting-dog" -> 85;
            case "pet-sleeping-cat" -> 105;
            case "pet-lying-dog" -> 125;
            case "furniture-wood-chair" -> 120;
            case "furniture-side-table" -> 125;
            case "furniture-low-shelf" -> 180;
            case "furniture-floor-lamp" -> 100;
            case "furniture-fireplace" -> 210;
            case "plaza-bench" -> 260;
            case "plaza-puddle" -> 180;
            case "plaza-trash" -> 86;
            case "plaza-tree" -> 320;
            case "plaza-rainbow" -> 170;
            case "plaza-flower" -> 60;
            case "plaza-sea-floor" -> 1080;
            case "decor-coffee-cup" -> 50;
            case "decor-mini-lamp" -> 70;
            case "decor-square-cushion" -> 80;
            case "furniture-front-side-table" -> 210;
            case "furniture-front-sofa" -> 320;
            case "furniture-single-daybed" -> 280;
            case "furniture-teacup", "furniture-bowl" -> 58;
            case "plaza-clay-pot" -> 70;
            case "plaza-garden-arch" -> 170;
            case "plaza-planter-box", "plaza-tea-stand" -> 180;
            case "plaza-shade-umbrella", "plaza-wooden-fence" -> 200;
            case "plaza-bush" -> 120;
            case "01-empty-single-bed" -> 260;
            case "04-folded-blanket" -> 110;
            case "09-shelf-plant" -> 50;
            case "10-front-storage-box" -> 90;
            case "12-small-vase" -> 50;
            case "13-study-desk" -> 260;
            case "15-nightstand" -> 160;
            case "17-small-dresser" -> 140;
            case "19-table-lamp" -> 60;
            case "20-empty-wall-shelf" -> 200;
            case "22-standing-mirror" -> 140;
            case "23-storage-basket" -> 130;
            case "24-alarm-clock" -> 40;
            case "25-small-side-table" -> 100;
            case "26-ceramic-mug" -> 45;
            case "30-pencil-cup" -> 30;
            case "31-back-facing-chair" -> 110;
            case "33-laptop" -> 80;
            case "34-low-coffee-table" -> 240;
            case "36-plush-doll" -> 80;
            case "37-rectangular-carpet" -> 300;
            default -> imageScale == null ? 92 : Math.max(40, (int) Math.round(imageScale * 80));
        };
    }

    private record DefaultObjectSeed(
            String objectKey,
            String objectName,
            String mood,
            String slotKey,
            String imageUrl,
            Double imageScale,
            Integer roomWidth,
            Boolean flipX,
            Integer tiltDeg,
            String description,
            Boolean allowPrivate,
            Boolean allowPlaza,
            Boolean isActive
    ) {
    }
}
