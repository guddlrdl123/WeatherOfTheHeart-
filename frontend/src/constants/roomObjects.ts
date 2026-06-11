import type { RoomObjectKey } from "../types/roomObject";
import { authFetch, readApiData, S3_ASSET_BASE_URL, toApiUrl } from "../services/apiClient";

type RoomObjectImageModule = {
    default: string;
};

export type RoomObjectCategoryKey =
    | "furniture"
    | "lighting"
    | "plant"
    | "fabric"
    | "decor"
    | "animal"
    | "food"
    | "outdoor";

export type RoomObjectCategoryFilterKey = "all" | RoomObjectCategoryKey;

export const ROOM_OBJECT_CATEGORIES: Array<{ key: RoomObjectCategoryFilterKey; label: string }> = [
    { key: "all", label: "전체" },
    { key: "furniture", label: "가구" },
    { key: "lighting", label: "조명" },
    { key: "plant", label: "식물" },
    { key: "fabric", label: "패브릭" },
    { key: "decor", label: "소품" },
    { key: "animal", label: "동물" },
    { key: "food", label: "음식" },
    { key: "outdoor", label: "야외" },
];

export type RoomObjectOption = {
    key: RoomObjectKey;
    label: string;
    image: string;
    category: RoomObjectCategoryKey;
    // 오브젝트가 방 안에 배치될 때 사용할 렌더링 너비 (높이는 가로세로 비율에 맞춰 자동 조정)
    roomWidth: number;
};

type ObjectCatalogResponse = {
    objectKey: string;
    name: string;
    imageUrl?: string | null;
    category?: string | null;
    width?: number | null;
};

type ObjectCatalogMode = "api" | "local" | "merge";

const MISSING_ROOM_OBJECT_IMAGE = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2080%2080'%3E%3Crect%20x='10'%20y='10'%20width='60'%20height='60'%20rx='10'%20fill='%23f8f1e8'%20stroke='%239b6b54'%20stroke-opacity='.35'%20stroke-width='4'/%3E%3Cpath%20d='M25%2028h30M25%2040h30M25%2052h18'%20stroke='%239b6b54'%20stroke-opacity='.5'%20stroke-width='5'%20stroke-linecap='round'/%3E%3C/svg%3E";

const ROOM_OBJECT_IMAGE_MODULES = import.meta.glob<RoomObjectImageModule>(
    "../assets/{furniture-clean,room-objects}/*.png",
    { eager: true },
);

const LEGACY_KEY_BY_FILE_NAME: Record<string, RoomObjectKey> = {
    "furniture-plant.png": "plant",
    "furniture-books.png": "books",
    "furniture-frame.png": "frame",
    "furniture-dresser.png": "dresser",
};

const LOCAL_KEY_BY_CATALOG_KEY: Record<string, RoomObjectKey> = {
    "furniture-plant": "plant",
    "furniture-dresser": "dresser",
};

const LABEL_BY_KEY: Record<RoomObjectKey, string> = {
    plant: "화분",
    dresser: "서랍장",
    "furniture-side-table": "사이드 테이블",
    "furniture-floor-lamp": "스탠드 조명",
    bench: "벤치",
    puddle: "물 웅덩이",
    trash: "쓰레기",
    tree: "나무",
    flower: "꽃",
    "decor-coffee-cup": "커피 컵",
};

const WIDTH_BY_KEY: Record<RoomObjectKey, number> = {
    plant: 86,
    dresser: 160,
    "pet-sitting-cat": 75,
    "pet-sitting-dog": 75,
    "pet-sleeping-cat": 95,
    "pet-lying-dog": 115,
    "furniture-side-table": 125,
    "furniture-floor-lamp": 100,
    bench: 260,
    puddle: 160,
    trash: 66,
    tree: 320,
    flower: 60,
    "decor-coffee-cup": 50,
    "clay-pot": 60,
    "garden-arch": 170,
    "planter-box": 180,
    "shade-umbrella": 230,
    "tea-stand": 180,
    "wooden-fence": 160,
    bush: 120,
    "empty-single-bed": 260,
    "folded-blanket": 110,
    "shelf-plant": 50,
    "front-storage-box": 90,
    "small-vase": 50,
    "study-desk": 260,
    nightstand: 160,
    "small-dresser": 140,
    "table-lamp": 60,
    "empty-wall-shelf": 200,
    "standing-mirror": 140,
    "storage-basket": 130,
    "alarm-clock": 40,
    "small-side-table": 100,
    "ceramic-mug": 45,
    "pencil-cup": 30,
    "back-facing-chair": 110,
    laptop: 80,
    "low-coffee-table": 240,
    "plush-doll": 60,
    "rectangular-carpet": 300,
    "oval-braided-carpet": 300,
    "patchwork-carpet": 300,
    "blue-runner-carpet": 400,
    "solid-sage-carpet": 300,
    "solid-rose-carpet": 300,
    "solid-blue-runner-carpet": 400,
    "broad-leaf-plant": 50,
    "cactus-pot": 50,
    "sitting-calico-cat": 55,
    "sitting-brown-puppy": 75,
    "long-floor-planter": 250,
    "wall-wooden-ivy-planter": 150,
    "wall-propagation-bottles": 150,
    "retro-mini-fridge": 120,
    "grass-tufts": 120,
    "wildflower-patch": 220,
    "ornamental-grass": 220,
    "clover-flower-patch": 220,
    "crumpled-trash-pile": 150,
    "floating-otter-water": 120,
    "outdoor-public-trash-bin": 100,
    "fluttering-butterfly": 60,
    "small-crumpled-trash-pile": 120,
    "crumpled-can": 90,
    "red-crumpled-can": 90,
    "wire-mesh-trash-bin": 70,
    "danger-zone-sign": 140,
    "no-entry-sign": 140,
    "market-sign": 120,
    "no-littering-sign": 140,
    "notice-board": 130,
    "keep-off-grass-sign": 140,
    "small-trash-can": 50,
    "small-well": 180,
    "standing-penguin": 60,
    "wall-star-garland": 260,
    "paper-airplane": 60,
    "stone-lantern": 70,
    "wooden-stool": 75,
    "sitting-fox": 80,
    "watermelon": 140,
    "bingsu": 95,
    "green-tea-bingsu": 95,
    "mango-bingsu": 95,
};

const CATEGORY_BY_KEY: Record<string, RoomObjectCategoryKey> = {
    "decor-coffee-cup": "food",
    "ceramic-mug": "food",
    "bread-snack": "food",
    "crumpled-snack-bag": "food",
    "watermelon": "food",
    "bingsu": "food",
    "green-tea-bingsu": "food",
    "mango-bingsu": "food",
    "토스트": "food",
    "접시 트레이": "food",
    "꽃모양 사탕병": "food",
    "젬 바구니": "food",
    "picnic-basket": "food",
    "fruit-stand": "food",
    "tea-cart-cherry": "food",
    "tea-cart-sunny": "food",
    "tea-stall": "food",
    "cocoa-stand": "food",
    "keep-off-grass-sign": "outdoor",
    "꽃잎 수거함": "outdoor",
    "나무 데크 조각": "outdoor",
    "lighthouse": "outdoor",
    "moon-wall-poster": "decor",
    "moon-bench": "furniture",
    "moon-fountain": "outdoor",
    "wall-star-garland": "decor",
    "constellation-sign": "outdoor",
    "starfish": "outdoor",
    "star-lantern": "lighting",
    "message-bottle": "outdoor",
    "sand-castle": "outdoor",
    "seashells": "outdoor",
    "seaweed": "outdoor",
    "coral": "outdoor",
    "driftwood": "outdoor",
    "life-ring": "outdoor",
    "소라게 껍질": "outdoor",
    "파도조각 오브제": "decor",
    "하늘 퍼즐 조각": "decor",
    "sitting-brown-puppy": "animal",
    "nightstand": "furniture",
    "tea-stand": "furniture",
    "wall-propagation-bottles": "plant",
    "greenhouse": "plant",
};

function hasAnyKeyword(value: string, keywords: string[]) {
    return keywords.some((keyword) => value.includes(keyword));
}

function getRoomObjectCategory(key: RoomObjectKey): RoomObjectCategoryKey {
    const explicitCategory = CATEGORY_BY_KEY[key];

    if (explicitCategory) {
        return explicitCategory;
    }

    if (hasAnyKeyword(key, [
        "cat",
        "dog",
        "puppy",
        "fox",
        "penguin",
        "bird",
        "butterfly",
        "otter",
        "고양이",
        "강아지",
        "여우",
        "펭귄",
        "나비",
        "수달",
    ])) {
        return "animal";
    }

    if (hasAnyKeyword(key, [
        "lamp",
        "lantern",
        "candle",
        "light",
        "조명",
        "랜턴",
        "가로등",
        "촛대",
    ])) {
        return "lighting";
    }

    if (hasAnyKeyword(key, [
        "plant",
        "flower",
        "tree",
        "bush",
        "grass",
        "clover",
        "cactus",
        "planter",
        "fern",
        "ivy",
        "pothos",
        "monstera",
        "vase",
        "watering-can",
        "화분",
        "꽃",
        "나무",
        "잔디",
        "씨앗",
    ])) {
        return "plant";
    }

    if (hasAnyKeyword(key, [
        "carpet",
        "rug",
        "cushion",
        "pillow",
        "blanket",
        "runner",
        "카펫",
        "러그",
        "쿠션",
        "베개",
        "담요",
    ])) {
        return "fabric";
    }

    if (hasAnyKeyword(key, [
        "table",
        "desk",
        "chair",
        "bench",
        "bed",
        "dresser",
        "shelf",
        "wardrobe",
        "stool",
        "sofa",
        "fridge",
        "storage",
        "basket-stand",
        "공용 테이블",
        "원형 테이블",
        "책상",
        "의자",
        "벤치",
        "침대",
        "서랍장",
        "선반",
        "옷장",
        "스툴",
        "소파",
        "냉장고",
    ])) {
        return "furniture";
    }

    if (hasAnyKeyword(key, [
        "sign",
        "board",
        "fence",
        "well",
        "arch",
        "umbrella",
        "fountain",
        "gate",
        "mailbox",
        "marker",
        "stone",
        "trash-bin",
        "public-trash",
        "crate",
        "deck",
        "표지판",
        "간판",
        "게시판",
        "울타리",
        "우물",
        "우산",
        "분수",
        "대문",
        "우체통",
        "나무 데크",
        "꽃잎 수거함",
    ])) {
        return "outdoor";
    }

    return "decor";
}

function normalizeRoomObjectCategory(category: string | null | undefined): RoomObjectCategoryKey | null {
    if (
        category === "furniture"
        || category === "lighting"
        || category === "plant"
        || category === "fabric"
        || category === "decor"
        || category === "animal"
        || category === "food"
        || category === "outdoor"
    ) {
        return category;
    }

    return null;
}

const FOLDER_ORDER: Record<string, number> = {
    "furniture-modular": 0,
    "furniture-clean": 1,
    bedding: 2,
    "decor-objects": 3,
    animal: 4,
    pets: 5,
    "plaza-objects": 6,
};

function getFileName(path: string) {
    return path.split("/").pop() ?? path;
}

function getFolderName(path: string) {
    const parts = path.split("/");
    return parts.at(-2) ?? "";
}

function getObjectKey(path: string): RoomObjectKey {
    const fileName = getFileName(path);

    return LEGACY_KEY_BY_FILE_NAME[fileName] ?? fileName
        .replace(/\.png$/, "")
        .replace(/-clean$/, "");
}

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

function createLocalRoomObjectOptions() {
    return Object.entries(ROOM_OBJECT_IMAGE_MODULES)
        .map(([path, module]) => {
            const key = getObjectKey(path);

            return {
                key,
                label: getObjectLabel(key),
                image: module.default,
                category: getRoomObjectCategory(key),
                roomWidth: getRoomWidth(key),
                folder: getFolderName(path),
            };
        })
        .sort((a, b) => {
            const folderOrder = (FOLDER_ORDER[a.folder] ?? 99) - (FOLDER_ORDER[b.folder] ?? 99);

            if (folderOrder !== 0) {
                return folderOrder;
            }

            return a.label.localeCompare(b.label);
        })
        .map((object) => ({
            key: object.key,
            label: object.label,
            image: object.image,
            category: object.category,
            roomWidth: object.roomWidth,
        }));
}

function createMissingRoomObjectOption(key: RoomObjectKey): RoomObjectOption {
    return {
        key,
        label: getObjectLabel(key),
        image: MISSING_ROOM_OBJECT_IMAGE,
        category: getRoomObjectCategory(key),
        roomWidth: getRoomWidth(key),
    };
}

function createRoomObjectMap(objects: RoomObjectOption[]) {
    return objects.reduce<Record<RoomObjectKey, RoomObjectOption>>((acc, object) => {
        acc[object.key] = object;
        return acc;
    }, {});
}

function normalizeRenamedObjectKey(key: string) {
    return key
        .replace(/^\d+-/, "")
        .replace(/^plaza-/, "");
}

function findLocalObjectOption(key: string) {
    const normalizedKey = normalizeRenamedObjectKey(key);

    return localRoomObjectByKey[key]
        ?? localRoomObjectByKey[normalizedKey]
        ?? localRoomObjectByKey[LOCAL_KEY_BY_CATALOG_KEY[key] ?? ""]
        ?? localRoomObjectByKey[LOCAL_KEY_BY_CATALOG_KEY[normalizedKey] ?? ""];
}

function getCatalogImageUrl(catalog: ObjectCatalogResponse) {
    return catalog.imageUrl?.trim() ?? "";
}

function isAbsoluteImageUrl(imageUrl: string) {
    return /^(https?:|data:|blob:)/.test(imageUrl);
}

function canResolveCatalogImage(catalog: ObjectCatalogResponse) {
    const imageUrl = getCatalogImageUrl(catalog);

    return Boolean(imageUrl) && (isAbsoluteImageUrl(imageUrl) || Boolean(S3_ASSET_BASE_URL));
}

function resolveCatalogImage(catalog: ObjectCatalogResponse, mode: ObjectCatalogMode, localObject?: RoomObjectOption) {
    const imageUrl = getCatalogImageUrl(catalog);

    if (!imageUrl) {
        return mode === "api" ? MISSING_ROOM_OBJECT_IMAGE : localObject?.image ?? MISSING_ROOM_OBJECT_IMAGE;
    }

    if (isAbsoluteImageUrl(imageUrl)) {
        return imageUrl;
    }

    if (S3_ASSET_BASE_URL) {
        return `${S3_ASSET_BASE_URL.replace(/\/+$/, "")}/${imageUrl.replace(/^\/+/, "")}`;
    }

    return mode === "api" ? MISSING_ROOM_OBJECT_IMAGE : localObject?.image ?? MISSING_ROOM_OBJECT_IMAGE;
}

function toCatalogRoomObjectOption(catalog: ObjectCatalogResponse, mode: ObjectCatalogMode): RoomObjectOption {
    const key = catalog.objectKey;
    const localObject = findLocalObjectOption(key);
    const catalogLabel = catalog.name?.trim();

    return {
        key,
        label: catalogLabel && catalogLabel !== key ? catalogLabel : localObject?.label || getObjectLabel(key),
        image: resolveCatalogImage(catalog, mode, localObject),
        category: normalizeRoomObjectCategory(catalog.category) ?? localObject?.category ?? getRoomObjectCategory(key),
        roomWidth: catalog.width ?? localObject?.roomWidth ?? getRoomWidth(key),
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

    return import.meta.env.DEV ? "local" : "api";
}

function appendLocalOnlyObjects(catalogOptions: RoomObjectOption[]) {
    const catalogKeys = new Set(catalogOptions.flatMap((object) => [
        object.key,
        normalizeRenamedObjectKey(object.key),
    ]));

    return [
        ...catalogOptions,
        ...localRoomObjectOptions.filter((object) => !catalogKeys.has(object.key)),
    ];
}

function mergeCatalogObjects(catalogObjects: ObjectCatalogResponse[], mode: ObjectCatalogMode) {
    const catalogOptions = catalogObjects
        .filter((catalog) => mode !== "api" || canResolveCatalogImage(catalog))
        .map((catalog) => toCatalogRoomObjectOption(catalog, mode));

    if (mode === "merge") {
        return appendLocalOnlyObjects(catalogOptions);
    }

    return catalogOptions;
}

const localRoomObjectOptions = createLocalRoomObjectOptions();
const localRoomObjectByKey = createRoomObjectMap(localRoomObjectOptions);
const initialCatalogMode = getObjectCatalogMode();

// 오브젝트 선택 모달과 방 렌더링에서 사용하는 목록입니다. 앱 시작 시 로컬 fallback을 먼저 쓰고,
// /api/objects 응답을 받으면 DB 카탈로그 기준 목록으로 교체합니다.
export const ROOM_OBJECT_OPTIONS: RoomObjectOption[] = initialCatalogMode === "api" ? [] : [...localRoomObjectOptions];
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
        .catch(() => {
            roomObjectCatalogPromise = null;

            if (catalogMode === "api") {
                applyRoomObjectCatalog([]);
                return ROOM_OBJECT_OPTIONS;
            }

            throw new Error("?ㅻ툕?앺듃 紐⑸줉??遺덈윭?ㅼ? 紐삵뻽?듬땲??");
        });

    return roomObjectCatalogPromise;
}

export const ROOM_OBJECT_BY_KEY = new Proxy({} as Record<RoomObjectKey, RoomObjectOption>, {
    get(target, property) {
        if (typeof property !== "string") {
            return Reflect.get(target, property);
        }

        const normalizedKey = normalizeRenamedObjectKey(property);

        return roomObjectByKey[property]
            ?? roomObjectByKey[normalizedKey]
            ?? createMissingRoomObjectOption(normalizedKey);
    },
}) as Record<RoomObjectKey, RoomObjectOption>;
