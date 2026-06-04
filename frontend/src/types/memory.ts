// import type { ObjectSlotKey } from "./object";
import type { MoodKey } from "./mood";
import type { RoomObjectKey, RoomObjectPosition } from "./roomObject";
import type { WeatherKey } from "./weather";

// 개인 방에 남기는 하루 기록
// 기록 하나가 날씨와 오브젝트 하나로 방 안에 표현
export type Memory = {
    id: string;
    memoryDate: string;
    createdAt: string;
    updatedAt?: string;
    title?: string;
    content: string;
    moodKey: MoodKey;
    weatherKey: WeatherKey;
    objectKey?: RoomObjectKey;
    objectLayer?: number;
    // 사용자가 방 안 위치를 체크 버튼으로 확정한 뒤 저장되는 좌표. 배치 중에는 placementDraft로 임시 위치를 보관
    objectPosition?: RoomObjectPosition;
};
