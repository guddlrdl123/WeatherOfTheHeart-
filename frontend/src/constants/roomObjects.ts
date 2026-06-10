import type { RoomObjectKey } from "../types/roomObject";
import { authFetch, readApiData, S3_ASSET_BASE_URL, S3_OBJECT_IMAGE_PREFIX, toApiUrl } from "../services/apiClient";

export type RoomObjectOption = {
    key: RoomObjectKey;
    label: string;
    image: string;
    // 오브젝트가 방 안에 배치될 때 사용할 렌더링 너비 (높이는 가로세로 비율에 맞춰 자동 조정)
    roomWidth: number;
};

type ObjectCatalogResponse = {
    objectKey: string;
    name: string;
    imageUrl?: string | null;
    imageScale?: number | null;
    allowPrivate?: boolean | null;
    allowPlaza?: boolean | null;
};

type ObjectCatalogMode = "api" | "local" | "merge";

const MISSING_ROOM_OBJECT_IMAGE = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2080%2080'%3E%3Crect%20x='10'%20y='10'%20width='60'%20height='60'%20rx='10'%20fill='%23f8f1e8'%20stroke='%239b6b54'%20stroke-opacity='.35'%20stroke-width='4'/%3E%3Cpath%20d='M25%2028h30M25%2040h30M25%2052h18'%20stroke='%239b6b54'%20stroke-opacity='.5'%20stroke-width='5'%20stroke-linecap='round'/%3E%3C/svg%3E";

const LOCAL_KEY_BY_CATALOG_KEY: Record<string, RoomObjectKey> = {
    "furniture-plant": "plant",
    "furniture-books": "books",
    "furniture-frame": "frame",
    "furniture-dresser": "dresser",
};

const LABEL_BY_KEY: Record<RoomObjectKey, string> = {
    plant: "화분",
    books: "책",
    frame: "액자",
    dresser: "서랍장",
    "furniture-side-table": "사이드 테이블",
    "furniture-floor-lamp": "스탠드 조명",
    "furniture-fireplace": "벽난로",
    "plaza-bench": "벤치",
    "plaza-puddle": "물 웅덩이",
    "plaza-trash": "쓰레기",
    "plaza-tree": "나무",
    "plaza-flower": "꽃",
    "plaza-aurora-crystal-arch": "오로라 수정 아치",
    "plaza-aurora-lantern": "오로라 랜턴",
    "plaza-aurora-pine": "오로라 전나무",
    "plaza-aurora-telescope": "오로라 망원경",
    "plaza-aurora-moon-bench": "달빛 벤치",
    "plaza-aurora-signpost": "별빛 표지판",
    "plaza-aurora-fountain": "오로라 분수",
    "plaza-aurora-campfire": "오로라 모닥불",
    "plaza-rain-umbrella-stand": "비 우산꽂이",
    "plaza-rain-boots-planter": "장화 화분",
    "plaza-rain-barrel": "빗물통",
    "plaza-rain-lantern": "비 랜턴",
    "plaza-rain-puddle-stones": "물웅덩이 디딤돌",
    "plaza-rain-cloud-stand": "비구름 장식",
    "plaza-raincoat-rack": "레인코트 걸이",
    "plaza-rain-drain-grate": "빗물 배수구",
    "plaza-cherry-blossom-arch": "벚꽃 아치",
    "plaza-cherry-picnic-bench": "벚꽃 피크닉 벤치",
    "plaza-cherry-lantern-stand": "벚꽃 등불",
    "plaza-cherry-tea-cart": "벚꽃 찻수레",
    "plaza-cherry-mailbox": "벚꽃 우체통",
    "plaza-cherry-planter-box": "벚꽃 화분 상자",
    "plaza-cherry-pinwheel": "벚꽃 바람개비",
    "plaza-cherry-stepping-stone": "벚꽃 디딤돌",
    "plaza-front-sunny-tea-cart": "정면 맑음 찻수레",
    "plaza-front-sunny-picnic-bench": "정면 맑음 피크닉 벤치",
    "plaza-front-sunny-fruit-crate": "정면 맑음 과일 상자",
    "plaza-front-sunny-small-fountain": "정면 맑음 작은 분수",
    "plaza-front-sunny-wooden-signpost": "정면 맑음 나무 표지판",
    "plaza-front-sunny-flower-arch": "정면 맑음 꽃 아치",
    "plaza-front-rain-umbrella-stand": "정면 비 우산꽂이",
    "plaza-front-rain-rain-barrel": "정면 비 빗물통",
    "plaza-front-rain-puddle-stones": "정면 비 물웅덩이 돌",
    "plaza-front-rain-rain-lantern": "정면 비 랜턴",
    "plaza-front-rain-raincoat-rack": "정면 비 우비 걸이",
    "plaza-front-rain-drain-grate": "정면 비 배수구",
    "plaza-front-night-moon-bench": "정면 밤 달 벤치",
    "plaza-front-night-star-lantern": "정면 밤 별 랜턴",
    "plaza-front-night-telescope": "정면 밤 망원경",
    "plaza-front-night-midnight-fountain": "정면 밤 분수",
    "plaza-front-night-constellation-signpost": "정면 밤 별자리 표지판",
    "plaza-front-night-candle-pedestal": "정면 밤 촛불 받침대",
    "plaza-front-cloud-cloud-bench": "정면 흐림 구름 벤치",
    "plaza-front-cloud-mist-lantern": "정면 흐림 안개 랜턴",
    "plaza-front-cloud-gray-planter": "정면 흐림 회색 화분",
    "plaza-front-cloud-fabric-notice-board": "정면 흐림 천 게시판",
    "plaza-front-cloud-low-shelf": "정면 흐림 낮은 선반",
    "plaza-front-cloud-round-table": "정면 흐림 원형 탁자",
    "plaza-front-snow-stone-lantern": "정면 눈 석등",
    "plaza-front-snow-cocoa-stall": "정면 눈 코코아 가판대",
    "plaza-front-snow-pine-planter": "정면 눈 소나무 화분",
    "plaza-front-snow-mitten-signpost": "정면 눈 장갑 표지판",
    "plaza-front-snow-icy-stones": "정면 눈 얼음 디딤돌",
    "plaza-front-snow-winter-bench": "정면 눈 겨울 벤치",
    "plaza-front-dawn-dawn-lantern": "정면 새벽 랜턴",
    "plaza-front-dawn-dew-fountain": "정면 새벽 이슬 분수",
    "plaza-front-dawn-morning-bench": "정면 새벽 아침 벤치",
    "plaza-front-dawn-glass-greenhouse": "정면 새벽 유리 온실",
    "plaza-front-dawn-dawn-signpost": "정면 새벽 표지판",
    "plaza-front-dawn-misty-planter": "정면 새벽 안개 화분",
    "plaza-front-sunset-street-lamp": "정면 노을 가로등",
    "plaza-front-sunset-terracotta-planter": "정면 노을 테라코타 화분",
    "plaza-front-sunset-copper-fountain": "정면 노을 구리 분수",
    "plaza-front-sunset-sunset-bench": "정면 노을 벤치",
    "plaza-front-sunset-lantern-gate": "정면 노을 랜턴 문",
    "plaza-front-sunset-tea-stall": "정면 노을 차 가판대",
    "plaza-front-cherry-branch-planter": "정면 벚꽃 가지 화분",
    "plaza-front-cherry-picnic-bench": "정면 벚꽃 피크닉 벤치",
    "plaza-front-cherry-lantern-stand": "정면 벚꽃 등불",
    "plaza-front-cherry-tea-cart": "정면 벚꽃 찻수레",
    "plaza-front-cherry-ribbon-mailbox": "정면 벚꽃 우체통",
    "plaza-front-cherry-stepping-stones": "정면 벚꽃 디딤돌",
    "plaza-front-ocean-lifebuoy-stand": "정면 바다 구명튜브",
    "plaza-front-ocean-lighthouse": "정면 바다 등대",
    "plaza-front-ocean-driftwood-bench": "정면 바다 유목 벤치",
    "plaza-front-ocean-shell-planter": "정면 바다 조개 화분",
    "plaza-front-ocean-anchor-signpost": "정면 바다 닻 표지판",
    "plaza-front-ocean-coral-fountain": "정면 바다 산호 분수",
    "plaza-sea-floor": "바다",
    "decor-coffee-cup": "커피 컵",
};

const WIDTH_BY_KEY: Record<RoomObjectKey, number> = {
    plant: 86,
    books: 55,
    frame: 86,
    dresser: 160,
    "pet-sitting-cat": 85,
    "pet-sitting-dog": 85,
    "pet-sleeping-cat": 105,
    "pet-lying-dog": 125,
    "furniture-wood-chair": 120,
    "furniture-side-table": 125,
    "furniture-low-shelf": 180,
    "furniture-floor-lamp": 100,
    "furniture-fireplace": 210,
    "plaza-bench": 260,
    "plaza-puddle": 180,
    "plaza-trash": 86,
    "plaza-tree": 320,
    "plaza-rainbow": 170,
    "plaza-flower": 60,
    "plaza-sea-floor": 1080,
    "decor-coffee-cup": 50,
    "decor-mini-lamp": 70,
    "decor-square-cushion": 80,
    "furniture-front-side-table": 210,
    "furniture-front-sofa": 320,
    "furniture-single-daybed": 280,
    "furniture-teacup": 58,
    "furniture-bowl": 58,
    "plaza-clay-pot": 70,
    "plaza-garden-arch": 170,
    "plaza-planter-box": 180,
    "plaza-shade-umbrella": 200,
    "plaza-tea-stand": 180,
    "plaza-wooden-fence": 200,
    "plaza-bush": 120,
    "01-empty-single-bed": 260,
    "04-folded-blanket": 110,
    "09-shelf-plant": 50,
    "10-front-storage-box": 90,
    "12-small-vase": 50,
    "13-study-desk": 260,
    "15-nightstand": 160,
    "17-small-dresser": 140,
    "19-table-lamp": 60,
    "20-empty-wall-shelf": 200,
    "22-standing-mirror": 140,
    "23-storage-basket": 130,
    "24-alarm-clock": 40,
    "25-small-side-table": 100,
    "26-ceramic-mug": 45,
    "30-pencil-cup": 30,
    "31-back-facing-chair": 110,
    "33-laptop": 80,
    "34-low-coffee-table": 240,
    "36-plush-doll": 80,
    "37-rectangular-carpet": 300,
    "plaza-aurora-crystal-arch": 210,
    "plaza-aurora-lantern": 90,
    "plaza-aurora-pine": 170,
    "plaza-aurora-telescope": 130,
    "plaza-aurora-moon-bench": 190,
    "plaza-aurora-signpost": 120,
    "plaza-aurora-fountain": 180,
    "plaza-aurora-campfire": 130,
    "plaza-rain-umbrella-stand": 125,
    "plaza-rain-boots-planter": 125,
    "plaza-rain-barrel": 130,
    "plaza-rain-lantern": 90,
    "plaza-rain-puddle-stones": 170,
    "plaza-rain-cloud-stand": 120,
    "plaza-raincoat-rack": 115,
    "plaza-rain-drain-grate": 150,
    "plaza-cherry-blossom-arch": 210,
    "plaza-cherry-picnic-bench": 180,
    "plaza-cherry-lantern-stand": 110,
    "plaza-cherry-tea-cart": 160,
    "plaza-cherry-mailbox": 105,
    "plaza-cherry-planter-box": 165,
    "plaza-cherry-pinwheel": 85,
    "plaza-cherry-stepping-stone": 145,
    "plaza-front-sunny-tea-cart": 165,
    "plaza-front-sunny-picnic-bench": 185,
    "plaza-front-sunny-fruit-crate": 155,
    "plaza-front-sunny-small-fountain": 165,
    "plaza-front-sunny-wooden-signpost": 115,
    "plaza-front-sunny-flower-arch": 210,
    "plaza-front-rain-umbrella-stand": 120,
    "plaza-front-rain-rain-barrel": 125,
    "plaza-front-rain-puddle-stones": 170,
    "plaza-front-rain-rain-lantern": 100,
    "plaza-front-rain-raincoat-rack": 120,
    "plaza-front-rain-drain-grate": 150,
    "plaza-front-night-moon-bench": 175,
    "plaza-front-night-star-lantern": 95,
    "plaza-front-night-telescope": 120,
    "plaza-front-night-midnight-fountain": 165,
    "plaza-front-night-constellation-signpost": 120,
    "plaza-front-night-candle-pedestal": 115,
    "plaza-front-cloud-cloud-bench": 180,
    "plaza-front-cloud-mist-lantern": 105,
    "plaza-front-cloud-gray-planter": 130,
    "plaza-front-cloud-fabric-notice-board": 165,
    "plaza-front-cloud-low-shelf": 170,
    "plaza-front-cloud-round-table": 165,
    "plaza-front-snow-stone-lantern": 105,
    "plaza-front-snow-cocoa-stall": 170,
    "plaza-front-snow-pine-planter": 130,
    "plaza-front-snow-mitten-signpost": 115,
    "plaza-front-snow-icy-stones": 165,
    "plaza-front-snow-winter-bench": 180,
    "plaza-front-dawn-dawn-lantern": 95,
    "plaza-front-dawn-dew-fountain": 160,
    "plaza-front-dawn-morning-bench": 180,
    "plaza-front-dawn-glass-greenhouse": 165,
    "plaza-front-dawn-dawn-signpost": 115,
    "plaza-front-dawn-misty-planter": 135,
    "plaza-front-sunset-street-lamp": 85,
    "plaza-front-sunset-terracotta-planter": 135,
    "plaza-front-sunset-copper-fountain": 165,
    "plaza-front-sunset-sunset-bench": 180,
    "plaza-front-sunset-lantern-gate": 190,
    "plaza-front-sunset-tea-stall": 170,
    "plaza-front-cherry-branch-planter": 130,
    "plaza-front-cherry-picnic-bench": 180,
    "plaza-front-cherry-lantern-stand": 100,
    "plaza-front-cherry-tea-cart": 160,
    "plaza-front-cherry-ribbon-mailbox": 110,
    "plaza-front-cherry-stepping-stones": 155,
    "plaza-front-ocean-lifebuoy-stand": 115,
    "plaza-front-ocean-lighthouse": 125,
    "plaza-front-ocean-driftwood-bench": 180,
    "plaza-front-ocean-shell-planter": 150,
    "plaza-front-ocean-anchor-signpost": 125,
    "plaza-front-ocean-coral-fountain": 170,
};

function getObjectLabel(key: RoomObjectKey) {
    const label = LABEL_BY_KEY[key];

    if (label) {
        return label;
    }

    return key
        .replace(/^(animal|bedding|decor|furniture|pet)-/, "")
        .replace(/-cropped/g, "")
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function getRoomWidth(key: RoomObjectKey) {
    const width = WIDTH_BY_KEY[key];

    if (width) {
        return width;
    }

    if (key.includes("single-daybed")) return 280;
    if (key.includes("wardrobe") || key.includes("bookshelf") || key.includes("clothes-rack")) return 220;
    if (key.includes("desk") || key.includes("cabinet") || key.includes("dresser") || key.includes("bench")) return 190;
    if (key.includes("chair") || key.includes("screen") || key.includes("cat-tower")) return 170;
    if (key.includes("table") || key.includes("hamper") || key.includes("storage-box")) return 130;
    if (key.includes("rug")) return 220;
    if (key.includes("blanket") || key.includes("pillow") || key.includes("cushion")) return 110;
    if (key.includes("picture") || key.includes("photo") || key.includes("clock") || key.includes("coat") || key.includes("shirt")) return 86;
    if (key.includes("book")) return 80;
    if (key.includes("lamp") || key.includes("mirror") || key.includes("vase")) return 90;
    if (key.includes("cat") || key.includes("dog")) return 105;
    if (key.includes("candle") || key.includes("mug") || key.includes("teacup") || key.includes("bowl")) return 58;

    return 92;
}

function normalizeS3Path(path: string) {
    return path.replace(/^\/+/, "");
}

function joinS3AssetUrl(path: string) {
    return `${S3_ASSET_BASE_URL.replace(/\/+$/, "")}/${normalizeS3Path(path)}`;
}

function getBucketObjectImage(key: string) {
    const normalizedPrefix = S3_OBJECT_IMAGE_PREFIX.replace(/^\/+/, "").replace(/\/+$/, "");
    const normalizedKey = LOCAL_KEY_BY_CATALOG_KEY[key] ?? key;

    return joinS3AssetUrl(`${normalizedPrefix}/${normalizedKey}.png`);
}

const FALLBACK_BUCKET_OBJECT_KEYS = Array.from(new Set([
    ...Object.keys(LABEL_BY_KEY),
    ...Object.keys(WIDTH_BY_KEY),
    ...Object.values(LOCAL_KEY_BY_CATALOG_KEY),
])) as RoomObjectKey[];

function createLocalRoomObjectOptions() {
    return FALLBACK_BUCKET_OBJECT_KEYS
        .map((key) => ({
            key,
            label: getObjectLabel(key),
            image: getBucketObjectImage(key),
            roomWidth: getRoomWidth(key),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
}

function createMissingRoomObjectOption(key: RoomObjectKey): RoomObjectOption {
    return {
        key,
        label: getObjectLabel(key),
        image: MISSING_ROOM_OBJECT_IMAGE,
        roomWidth: getRoomWidth(key),
    };
}

function createRoomObjectMap(objects: RoomObjectOption[]) {
    return objects.reduce<Record<RoomObjectKey, RoomObjectOption>>((acc, object) => {
        acc[object.key] = object;
        return acc;
    }, {});
}

function findLocalObjectOption(key: string) {
    return localRoomObjectByKey[key] ?? localRoomObjectByKey[LOCAL_KEY_BY_CATALOG_KEY[key] ?? ""];
}

function isLegacyObjectImagePath(imageUrl: string) {
    return /^\/?objects\//.test(imageUrl);
}

function resolveCatalogImage(catalog: ObjectCatalogResponse) {
    const imageUrl = catalog.imageUrl?.trim();

    if (!imageUrl || isLegacyObjectImagePath(imageUrl)) {
        return getBucketObjectImage(catalog.objectKey);
    }

    if (/^(https?:|data:|blob:)/.test(imageUrl)) {
        return imageUrl;
    }

    if (S3_ASSET_BASE_URL) {
        return joinS3AssetUrl(imageUrl);
    }

    return MISSING_ROOM_OBJECT_IMAGE;
}

function toCatalogRoomObjectOption(catalog: ObjectCatalogResponse): RoomObjectOption {
    const key = catalog.objectKey;
    const localObject = findLocalObjectOption(key);
    const catalogLabel = catalog.name?.trim();

    return {
        key,
        label: catalogLabel && catalogLabel !== key ? catalogLabel : localObject?.label || getObjectLabel(key),
        image: resolveCatalogImage(catalog),
        roomWidth: localObject?.roomWidth ?? getRoomWidth(key),
    };
}

function applyRoomObjectCatalog(objects: RoomObjectOption[]) {
    ROOM_OBJECT_OPTIONS.splice(0, ROOM_OBJECT_OPTIONS.length, ...objects);
    roomObjectByKey = createRoomObjectMap(objects);
}

function getObjectCatalogMode(): ObjectCatalogMode {
    const mode = import.meta.env.VITE_OBJECT_CATALOG_MODE?.toLowerCase();

    if (mode === "api" || mode === "local" || mode === "merge") {
        return mode;
    }

    return "merge";
}

function appendLocalOnlyObjects(catalogOptions: RoomObjectOption[]) {
    const catalogKeys = new Set(catalogOptions.map((object) => object.key));

    return [
        ...catalogOptions,
        ...localRoomObjectOptions.filter((object) => !catalogKeys.has(object.key)),
    ];
}

function mergeCatalogObjects(catalogObjects: ObjectCatalogResponse[], mode: ObjectCatalogMode) {
    const catalogOptions = catalogObjects
        .filter((catalog) => catalog.allowPrivate !== false || catalog.allowPlaza !== false)
        .map(toCatalogRoomObjectOption);

    if (mode === "merge") {
        return appendLocalOnlyObjects(catalogOptions);
    }

    return catalogOptions.length > 0
        ? catalogOptions
        : localRoomObjectOptions;
}

const localRoomObjectOptions = createLocalRoomObjectOptions();
const localRoomObjectByKey = createRoomObjectMap(localRoomObjectOptions);

// 오브젝트 선택 모달과 방 렌더링에서 사용하는 목록입니다. 앱 시작 시 로컬 fallback을 먼저 쓰고,
// /api/objects 응답을 받으면 DB 카탈로그 기준 목록으로 교체합니다.
export const ROOM_OBJECT_OPTIONS: RoomObjectOption[] = [...localRoomObjectOptions];
let roomObjectByKey = createRoomObjectMap(ROOM_OBJECT_OPTIONS);
let roomObjectCatalogPromise: Promise<RoomObjectOption[]> | null = null;

export async function loadRoomObjectCatalog() {
    if (roomObjectCatalogPromise) {
        return roomObjectCatalogPromise;
    }

    const catalogMode = getObjectCatalogMode();

    if (catalogMode === "local") {
        applyRoomObjectCatalog(localRoomObjectOptions);
        return ROOM_OBJECT_OPTIONS;
    }

    roomObjectCatalogPromise = authFetch(toApiUrl("/api/objects"))
        .then(async (response) => {
            if (!response.ok) {
                throw new Error("오브젝트 목록을 불러오지 못했습니다.");
            }

            const data = await readApiData<ObjectCatalogResponse[]>(response);
            const nextObjects = mergeCatalogObjects(data, catalogMode);
            applyRoomObjectCatalog(nextObjects);

            return ROOM_OBJECT_OPTIONS;
        })
        .catch((error) => {
            roomObjectCatalogPromise = null;
            throw error;
        });

    return roomObjectCatalogPromise;
}

export const ROOM_OBJECT_BY_KEY = new Proxy({} as Record<RoomObjectKey, RoomObjectOption>, {
    get(target, property) {
        if (typeof property !== "string") {
            return Reflect.get(target, property);
        }

        return roomObjectByKey[property] ?? createMissingRoomObjectOption(property);
    },
}) as Record<RoomObjectKey, RoomObjectOption>;
