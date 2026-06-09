import { authFetch, readApiData, readApiError, toApiUrl } from "./apiClient";

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
  currentPassword?: string;
  newPassword?: string;
};

export async function fetchUserProfile() {
  const response = await authFetch(toApiUrl("/api/users/me"));

  if (!response.ok) {
    throw await readApiError(response, "프로필 정보를 불러오지 못했습니다.");
  }

  return readApiData<UserProfile>(response);
}

export async function updateUserProfile(value: UserProfileUpdateRequest) {
  const response = await authFetch(toApiUrl("/api/users/me"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });

  if (!response.ok) {
    throw await readApiError(response, "프로필 정보를 수정하지 못했습니다.");
  }

  return readApiData<UserProfile>(response);
}
