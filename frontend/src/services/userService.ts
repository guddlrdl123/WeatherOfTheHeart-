import { readApiData, readJsonResponse, toApiUrl } from "./apiClient";

type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

export type UserProfile = {
  id: number | string;
  email: string;
  nickname: string;
  isAdmin?: boolean;
  joinedAt: string;
  updatedAt?: string;
};

type UserProfileUpdateRequest = {
  nickname: string;
};

async function readErrorMessage(response: Response, fallbackMessage: string) {
  const body = await readJsonResponse<ApiResponse<null>>(response).catch(() => null);

  return body?.message || fallbackMessage;
}

export async function fetchUserProfile(userId: string) {
  const response = await fetch(toApiUrl(`/api/users/${encodeURIComponent(userId)}`));

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "프로필 정보를 불러오지 못했습니다."));
  }

  return readApiData<UserProfile>(response);
}

export async function updateUserProfile(userId: string, value: UserProfileUpdateRequest) {
  const response = await fetch(toApiUrl(`/api/users/${encodeURIComponent(userId)}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "프로필 정보를 수정하지 못했습니다."));
  }

  return readApiData<UserProfile>(response);
}
