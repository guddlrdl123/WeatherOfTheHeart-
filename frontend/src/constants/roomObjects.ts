import type { RoomObjectKey } from "../types/roomObject";

type RoomObjectImageModule = {
    default: string;
};

export type RoomObjectOption = {
    key: RoomObjectKey;
    label: string;
    image: string;
    // 오브젝트가 방 안에 배치될 때 사용할 렌더링 너비 (높이는 가로세로 비율에 맞춰 자동 조정)
    roomWidth: number;
};

const MISSING_ROOM_OBJECT_IMAGE = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2080%2080'%3E%3Crect%20x='10'%20y='10'%20width='60'%20height='60'%20rx='10'%20fill='%23f8f1e8'%20stroke='%239b6b54'%20stroke-opacity='.35'%20stroke-width='4'/%3E%3Cpath%20d='M25%2028h30M25%2040h30M25%2052h18'%20stroke='%239b6b54'%20stroke-opacity='.5'%20stroke-width='5'%20stroke-linecap='round'/%3E%3C/svg%3E";

const ROOM_OBJECT_IMAGE_MODULES = import.meta.glob<RoomObjectImageModule>(
    "../assets/{animal,bedding,decor-objects,furniture-clean,furniture-modular,pets,plaza-objects}/*.png",
    { eager: true },
);

const LEGACY_KEY_BY_FILE_NAME: Record<string, RoomObjectKey> = {
    "furniture-plant.png": "plant",
    "furniture-books.png": "books",
    "furniture-frame.png": "frame",
    "furniture-dresser.png": "dresser",
};

const LABEL_BY_KEY: Record<RoomObjectKey, string> = {
    plant: "화분",
    books: "책",
    frame: "액자",
    dresser: "서랍장",
    "furniture-wood-chair": "나무 의자",
    "furniture-side-table": "사이드 테이블",
    "furniture-low-shelf": "낮은 선반",
    "furniture-floor-lamp": "스탠드 조명",
    "furniture-fireplace": "벽난로",
    "plaza-bench": "벤치",
    "plaza-puddle": "물 웅덩이",
    "plaza-trash": "쓰레기",
    "plaza-tree": "나무",
    "plaza-vending-machine": "자판기",
    "plaza-rainbow": "무지개",
    "plaza-flower": "꽃",
    "plaza-sea-floor": "바다",
    "decor-coffee-cup": "커피 컵",
    "decor-mini-lamp": "미니 램프",
    "decor-square-cushion": "사각 쿠션",
    "furniture-front-side-table": "테이블",
    "furniture-front-sofa": "소파",
};

const WIDTH_BY_KEY: Record<RoomObjectKey, number> = {
    plant: 86,
    books: 88,
    frame: 86,
    dresser: 188,
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
    "plaza-vending-machine": 150,
    "plaza-rainbow": 170,
    "plaza-flower": 70,
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
    "decor-outline-curtains": 400,
    "decor-outline-picture-frame": 100,
    "decor-outline-wall-calendar": 100,
    "decor-outline-wall-clock": 100,
    "plaza-tea-stand": 180,
    "plaza-wooden-fence": 200,
    "plaza-bush": 120,
};

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

// 오브젝트 선택 모달과 방 렌더링에서 사용하는 목록
export const ROOM_OBJECT_OPTIONS: RoomObjectOption[] = Object.entries(ROOM_OBJECT_IMAGE_MODULES)
    .map(([path, module]) => {
        const key = getObjectKey(path);

        return {
            key,
            label: getObjectLabel(key),
            image: module.default,
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
        roomWidth: object.roomWidth,
    }));

function createMissingRoomObjectOption(key: RoomObjectKey): RoomObjectOption {
    return {
        key,
        label: getObjectLabel(key),
        image: MISSING_ROOM_OBJECT_IMAGE,
        roomWidth: getRoomWidth(key),
    };
}

// 저장된 오브젝트를 그릴 때 key로 빠르게 찾기 위한 맵
const ROOM_OBJECT_BY_KEY_BASE = ROOM_OBJECT_OPTIONS.reduce<Record<RoomObjectKey, RoomObjectOption>>(
    (acc, object) => {
        acc[object.key] = object;
        return acc;
    },
    {},
);

export const ROOM_OBJECT_BY_KEY = new Proxy(ROOM_OBJECT_BY_KEY_BASE, {
    get(target, property) {
        if (typeof property !== "string") {
            return Reflect.get(target, property);
        }

        return target[property] ?? createMissingRoomObjectOption(property);
    },
}) as Record<RoomObjectKey, RoomObjectOption>;
