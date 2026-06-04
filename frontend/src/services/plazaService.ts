import type { Plaza, PlazaBackground, PlazaEntry, PlazaWeatherKey } from "../types/plaza";
import type { RoomObjectPosition } from "../types/roomObject";
import type { RoomObjectKey } from "../types/roomObject";
import { readApiData, readJsonResponse, toApiUrl } from "./apiClient";

type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

type PlazaResponse = {
  id: number | string;
  ownerId?: number | string | null;
  title?: string | null;
  topic?: string | null;
  maxObjects?: number | null;
  allowSearch?: boolean | null;
  allowInvite?: boolean | null;
  allowDuplicateObjects?: boolean | null;
  backgroundType?: "color" | "weather" | string | null;
  backgroundColor?: string | null;
  backgroundKey?: string | null;
  entryCount?: number | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

type PlazaEntryResponse = {
  id: number | string;
  plazaId: number | string;
  ownerId: number | string;
  title?: string | null;
  content: string;
  moodKey?: string | null;
  weatherKey?: string | null;
  objectKey: string;
  slotKey?: string | null;
  positionX?: number | null;
  positionY?: number | null;
  layer?: number | null;
  likeCount?: number | null;
  likedUserIds?: Array<number | string> | null;
  createdAt: string;
  updatedAt?: string | null;
  plaza?: PlazaResponse;
};

type PlazaWithFirstEntryResponse = {
  plaza: PlazaResponse;
  entry: PlazaEntryResponse;
};

type CreatePlazaEntryValue = Pick<PlazaEntry, "title" | "content" | "objectKey">;

export type UserPlazaEntry = {
  plaza: Plaza;
  entry: PlazaEntry;
};

async function readErrorMessage(response: Response, fallbackMessage: string) {
  const body = await readJsonResponse<ApiResponse<null>>(response).catch(() => null);

  return body?.message || fallbackMessage;
}

function toBackground(response: PlazaResponse): PlazaBackground {
  if (response.backgroundType === "color") {
    return {
      type: "color",
      color: response.backgroundColor || "#8fa7a0",
    };
  }

  return {
    type: "weather",
    weatherKey: (response.backgroundKey || "rain") as PlazaWeatherKey,
  };
}

function toPlaza(response: PlazaResponse): Plaza {
  const entryCount = response.entryCount ?? 0;
  const maxParticipants = response.maxObjects ?? 0;

  return {
    id: String(response.id),
    topic: response.title || "제목 없는 광장",
    description: response.topic || "",
    maxParticipants,
    allowSearch: response.allowSearch ?? true,
    allowInvite: response.allowInvite ?? true,
    allowDuplicateObjects: response.allowDuplicateObjects ?? false,
    background: toBackground(response),
    ownerId: response.ownerId == null ? "" : String(response.ownerId),
    status: response.completedAt || (maxParticipants > 0 && entryCount >= maxParticipants) ? "closed" : "open",
    entries: [],
    entryCount,
    createdAt: response.createdAt,
    endedAt: response.completedAt ?? undefined,
  };
}

function toEntry(response: PlazaEntryResponse): PlazaEntry {
  return {
    id: String(response.id),
    ownerId: String(response.ownerId),
    guestName: "",
    title: response.title ?? "",
    content: response.content,
    objectKey: response.objectKey as RoomObjectKey,
    positionX: response.positionX ?? 50,
    positionY: response.positionY ?? 78,
    layer: response.layer ?? undefined,
    likes: response.likeCount ?? 0,
    likedGuestIds: (response.likedUserIds ?? []).map(String),
    createdAt: response.createdAt,
  };
}

async function fetchAllPlazaEntries() {
  const response = await fetch(toApiUrl("/api/plazas/entries"));

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "광장 글을 불러오지 못했습니다."));
  }

  return readApiData<PlazaEntryResponse[]>(response);
}

export async function fetchPlazas() {
  const [plazaResponse, entries] = await Promise.all([
    fetch(toApiUrl("/api/plazas")),
    fetchAllPlazaEntries(),
  ]);

  if (!plazaResponse.ok) {
    throw new Error(await readErrorMessage(plazaResponse, "광장을 불러오지 못했습니다."));
  }

  const plazas = await readApiData<PlazaResponse[]>(plazaResponse);
  const entriesByPlazaId = new Map<string, PlazaEntry[]>();

  entries.forEach((entry) => {
    const plazaId = String(entry.plazaId);
    const plazaEntries = entriesByPlazaId.get(plazaId) ?? [];

    plazaEntries.push(toEntry(entry));
    entriesByPlazaId.set(plazaId, plazaEntries);
  });

  return plazas.map((plaza) => {
    const mappedPlaza = toPlaza(plaza);
    const plazaEntries = entriesByPlazaId.get(String(plaza.id)) ?? [];

    return {
      ...mappedPlaza,
      entries: plazaEntries,
      entryCount: plaza.entryCount ?? plazaEntries.length,
    };
  });
}

export async function createBackendPlaza(userId: string, plaza: Plaza) {
  const response = await fetch(toApiUrl("/api/plazas"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ownerId: Number(userId),
      title: plaza.topic,
      topic: plaza.description,
      maxObjects: plaza.maxParticipants,
      allowSearch: plaza.allowSearch,
      allowInvite: plaza.allowInvite,
      allowDuplicateObjects: plaza.allowDuplicateObjects,
      backgroundType: plaza.background.type,
      backgroundColor: plaza.background.type === "color" ? plaza.background.color : null,
      backgroundKey: plaza.background.type === "weather" ? plaza.background.weatherKey : "rain",
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "광장을 생성하지 못했습니다."));
  }

  return toPlaza(await readApiData<PlazaResponse>(response));
}

export async function createBackendPlazaWithFirstEntry(
  userId: string,
  plaza: Plaza,
  value: CreatePlazaEntryValue,
  position: RoomObjectPosition,
  layer: number,
) {
  const response = await fetch(toApiUrl("/api/plazas/with-first-entry"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ownerId: Number(userId),
      title: plaza.topic,
      topic: plaza.description,
      maxObjects: plaza.maxParticipants,
      allowSearch: plaza.allowSearch,
      allowInvite: plaza.allowInvite,
      allowDuplicateObjects: plaza.allowDuplicateObjects,
      backgroundType: plaza.background.type,
      backgroundColor: plaza.background.type === "color" ? plaza.background.color : null,
      backgroundKey: plaza.background.type === "weather" ? plaza.background.weatherKey : "rain",
      entryTitle: value.title,
      entryContent: value.content,
      moodKey: "plaza",
      weatherKey: "plaza",
      objectKey: value.objectKey,
      slotKey: value.objectKey,
      positionX: Math.round(position.x),
      positionY: Math.round(position.y),
      layer,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "첫 글과 함께 광장을 생성하지 못했습니다."));
  }

  const data = await readApiData<PlazaWithFirstEntryResponse>(response);
  const createdPlaza = toPlaza(data.plaza);
  const firstEntry = {
    ...toEntry(data.entry),
    layer,
  };

  return {
    ...createdPlaza,
    entries: [firstEntry],
    entryCount: 1,
  };
}

export async function createBackendPlazaEntry(
  plazaId: string,
  userId: string,
  value: CreatePlazaEntryValue,
  position: RoomObjectPosition,
  layer: number,
) {
  const response = await fetch(toApiUrl(`/api/plazas/${encodeURIComponent(plazaId)}/entries`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ownerId: Number(userId),
      title: value.title,
      content: value.content,
      moodKey: "plaza",
      weatherKey: "plaza",
      objectKey: value.objectKey,
      slotKey: value.objectKey,
      positionX: Math.round(position.x),
      positionY: Math.round(position.y),
      layer,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "광장 글을 저장하지 못했습니다."));
  }

  return {
    ...toEntry(await readApiData<PlazaEntryResponse>(response)),
    layer,
  };
}

export async function toggleBackendPlazaEntryLike(entryId: string, userId: string) {
  const response = await fetch(toApiUrl(`/api/plazas/entries/${encodeURIComponent(entryId)}/likes`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: Number(userId),
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "좋아요를 반영하지 못했습니다."));
  }

  return toEntry(await readApiData<PlazaEntryResponse>(response));
}

export async function updateBackendPlazaEntry(
  entryId: string,
  userId: string,
  value: Pick<PlazaEntry, "title" | "content">,
) {
  const response = await fetch(toApiUrl(`/api/plazas/entries/${encodeURIComponent(entryId)}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ownerId: Number(userId),
      title: value.title,
      content: value.content,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "광장 글을 수정하지 못했습니다."));
  }

  return toEntry(await readApiData<PlazaEntryResponse>(response));
}

export async function updateBackendPlazaEntryPosition(
  entryId: string,
  userId: string,
  position: RoomObjectPosition,
  layer: number,
) {
  const response = await fetch(toApiUrl(`/api/plazas/entries/${encodeURIComponent(entryId)}/position`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ownerId: Number(userId),
      positionX: Math.round(position.x),
      positionY: Math.round(position.y),
      layer,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "오브젝트 위치를 저장하지 못했습니다."));
  }

  return toEntry(await readApiData<PlazaEntryResponse>(response));
}

export async function deleteBackendPlazaEntry(entryId: string, userId: string) {
  const params = new URLSearchParams({
    ownerId: String(Number(userId)),
  });
  const response = await fetch(toApiUrl(`/api/plazas/entries/${encodeURIComponent(entryId)}?${params.toString()}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "광장 글을 삭제하지 못했습니다."));
  }
}

export async function fetchUserCreatedPlazas(userId: string) {
  const response = await fetch(toApiUrl(`/api/users/${encodeURIComponent(userId)}/plazas`));

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "내가 만든 광장을 불러오지 못했습니다."));
  }

  const data = await readApiData<PlazaResponse[]>(response);

  return data.map(toPlaza);
}

export async function fetchUserPlazaEntries(userId: string) {
  const response = await fetch(toApiUrl(`/api/users/${encodeURIComponent(userId)}/plaza-entries`));

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "내가 작성한 오브젝트를 불러오지 못했습니다."));
  }

  const data = await readApiData<PlazaEntryResponse[]>(response);

  return data.map((item) => ({
    plaza: item.plaza ? toPlaza(item.plaza) : toPlaza({
      id: item.plazaId,
      title: "알 수 없는 광장",
      topic: "",
      createdAt: item.createdAt,
    }),
    entry: toEntry(item),
  }));
}
