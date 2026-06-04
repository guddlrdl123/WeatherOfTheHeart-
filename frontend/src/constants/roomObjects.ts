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

const ROOM_OBJECT_IMAGE_MODULES = import.meta.glob<RoomObjectImageModule>(
    "../assets/{bedding,decor-objects,furniture-clean,furniture-modular,pets,plaza-objects}/*.png",
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
    "furniture-fireplace": "벽난로",
    "plaza-bench": "벤치",
    "plaza-puddle": "물 웅덩이",
    "plaza-trash": "쓰레기",
    "plaza-tree": "나무",
};

const WIDTH_BY_KEY: Record<RoomObjectKey, number> = {
    plant: 86,
    books: 88,
    frame: 86,
    dresser: 188,
    "furniture-fireplace": 210,
    "plaza-bench": 260,
    "plaza-puddle": 220,
    "plaza-trash": 86,
    "plaza-tree": 220,
};

const FOLDER_ORDER: Record<string, number> = {
    "furniture-modular": 0,
    "furniture-clean": 1,
    bedding: 2,
    "decor-objects": 3,
    pets: 4,
    "plaza-objects": 5,
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
        .replace(/^(bedding|decor|furniture|pet)-/, "")
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

// 저장된 오브젝트를 그릴 때 key로 빠르게 찾기 위한 맵
export const ROOM_OBJECT_BY_KEY = ROOM_OBJECT_OPTIONS.reduce<Record<RoomObjectKey, RoomObjectOption>>(
    (acc, object) => {
        acc[object.key] = object;
        return acc;
    },
    {},
);
