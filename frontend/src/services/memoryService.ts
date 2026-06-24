import type { Memory } from "../types/memory";
import type { MoodKey } from "../types/mood";
import type { RoomObjectKey, RoomObjectPosition } from "../types/roomObject";
import type { WeatherKey } from "../types/weather";
import { authFetch, readApiError, readJsonResponse, toApiUrl } from "./apiClient";

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
  layer: number;
};

type UpdateMemoryRequest = {
  title?: string;
  content: string;
  moodKey: MoodKey;
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
  layer?: number | null;
  contentUpdated?: boolean | null;
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
    isUpdated: response.contentUpdated ?? false,
    objectKey: response.objectKey,
    objectPosition:
      response.positionX != null && response.positionY != null
        ? { x: response.positionX, y: response.positionY }
        : undefined,
    objectLayer: response.layer ?? undefined,
  };
}

async function readErrorMessage(response: Response, fallbackMessage: string) {
  const error = await readApiError(response, fallbackMessage);

  return error.message;
}

export async function createMemory(value: CreateMemoryRequest) {
  const response = await authFetch(toApiUrl("/api/memories"), {
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

export async function fetchMemories() {
  const response = await authFetch(toApiUrl("/api/memories"));
  const payload = await readJsonResponse<ApiResponse<MemoryResponse[]>>(response);

  if (!response.ok) {
    throw new Error(payload.message || "기록 목록을 불러오지 못했습니다.");
  }

  return payload.data.map(toMemory);
}

export async function updateMemory(memoryId: string, value: UpdateMemoryRequest) {
  const response = await authFetch(toApiUrl(`/api/memories/${encodeURIComponent(memoryId)}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "이야기를 수정하지 못했습니다."));
  }

  const payload = await readJsonResponse<ApiResponse<MemoryResponse>>(response);

  return toMemory(payload.data);
}

export async function updateMemoryPosition(memoryId: string, position: RoomObjectPosition, layer: number) {
  const response = await authFetch(toApiUrl(`/api/memories/${encodeURIComponent(memoryId)}/position`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      positionX: Math.round(position.x),
      positionY: Math.round(position.y),
      layer,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "오브젝트 위치를 저장하지 못했습니다."));
  }

  const payload = await readJsonResponse<ApiResponse<MemoryResponse>>(response);

  return toMemory(payload.data);
}

export async function deleteMemory(memoryId: string) {
  const response = await authFetch(toApiUrl(`/api/memories/${encodeURIComponent(memoryId)}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "이야기를 삭제하지 못했습니다."));
  }
}
