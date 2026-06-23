import type { RoomObjectKey, RoomObjectPosition } from "../../types/roomObject";
import type { WeatherKey } from "../../types/weather";

type LandingDemoRoomObject = {
  id: string;
  objectKey: RoomObjectKey;
  position: RoomObjectPosition;
  layer: number;
};

// 랜딩에서는 실제 기록 대신, 기억이 차곡차곡 쌓인 방의 한 모습을 보여줍니다.
export const LANDING_DEMO_ROOM: {
  placedObjects: LandingDemoRoomObject[];
} = {
  placedObjects: [
    { id: "demo-rug", objectKey: "round-rug", position: { x: 53, y: 93 }, layer: 0 },
    { id: "demo-bed", objectKey: "empty-single-bed", position: { x: 73, y: 88 }, layer: 1 },
    { id: "demo-lamp", objectKey: "table-lamp", position: { x: 27, y: 53 }, layer: 2 },
    { id: "demo-cat", objectKey: "pet-sleeping-cat", position: { x: 78, y: 72 }, layer: 4 },
    { id: "demo-nightstand", objectKey: "nightstand", position: { x: 25, y: 78 }, layer: 0 },
    { id: "demo-planter", objectKey: "wall-wooden-ivy-planter", position: { x: 65, y: 38 }, layer: 0 },
    { id: "demo-folded-blanket", objectKey: "folded-blanket", position: { x: 25, y: 73 }, layer: 1 },
    { id: "demo-pot", objectKey: "snake-plant-floor-pot", position: { x: 90, y: 78 }, layer: 0 },
  ],
};

export const LANDING_DEMO_WEATHER_KEYS: WeatherKey[] = [
  "sunny",
  "rain",
  "cloud",
  "sunset",
  "night",
  "dawn",
  "cherry",
];
