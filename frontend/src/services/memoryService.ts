import type { Memory } from "../types/memory";
import type { MoodKey } from "../types/mood";
import type { RoomObjectKey } from "../types/roomObject";
import type { WeatherKey } from "../types/weather";
import { readJsonResponse, toApiUrl } from "./apiClient";

type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

type CreateMemoryRequest = {
  memoryDate: string;
  title: string;
  content: string;
  moodKey: MoodKey;
  weatherKey: WeatherKey;
  objectKey: RoomObjectKey;
  slotKey?: string;
  positionX: number;
  positionY: number;
};

type MemoryResponse = {
  id: number | string;
  memoryDate: string;
  title?: string;
  content: string;
  moodKey: MoodKey;
  weatherKey: WeatherKey;
  objectKey?: RoomObjectKey;
  slotKey?: string;
  positionX?: number | null;
  positionY?: number | null;
  flipX?: boolean | null;
  tiltDeg?: number | null;
  createdAt: string;
  updatedAt?: string;
};

function toMemory(response: MemoryResponse): Memory {
  return {
    id: String(response.id),
    memoryDate: response.memoryDate,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
    title: response.title ?? "",
    content: response.content,
    moodKey: response.moodKey,
    weatherKey: response.weatherKey,
    objectKey: response.objectKey,
    objectPosition:
      response.positionX != null && response.positionY != null
        ? { x: response.positionX, y: response.positionY }
        : undefined,
  };
}

export async function createMemory(userId: string, value: CreateMemoryRequest) {
  const response = await fetch(toApiUrl(`/api/users/${encodeURIComponent(userId)}/memories`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });

  const payload = await readJsonResponse<ApiResponse<MemoryResponse>>(response);

  if (!response.ok) {
    throw new Error(payload.message || "기억 저장에 실패했습니다.");
  }

  return toMemory(payload.data);
}
