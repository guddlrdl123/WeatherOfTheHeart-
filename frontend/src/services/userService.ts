import { authFetch, readApiData, readApiError, toApiUrl } from "./apiClient";

export type UserProfile = {
  id: number | string;
  email: string;
  nickname: string;
  isAdmin?: boolean;
  authProvider?: string | null;
  joinedAt: string;
  updatedAt?: string;
};

type UserProfileUpdateRequest = {
  nickname?: string;
  currentPassword?: string;
  newPassword?: string;
};

type UserEmailChangeCodeRequest = {
  currentPassword: string;
  newEmail: string;
};

type UserEmailUpdateRequest = {
  newEmail: string;
  verificationCode: string;
};

type UserWithdrawalRequest = {
  currentPassword: string;
};

type SocialUserWithdrawalRequest = {
  verificationCode: string;
};

export async function fetchUserProfile() {
  const response = await authFetch(toApiUrl("/api/users/me"));

  if (!response.ok) {
    throw await readApiError(response, "프로필 정보를 불러오지 못했습니다.");
  }

  return readApiData<UserProfile>(response);
}

export async function deleteUserAccount(value: UserWithdrawalRequest) {
  const response = await authFetch(toApiUrl("/api/users/me"), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });

  if (!response.ok) {
    throw await readApiError(response, "회원탈퇴에 실패했습니다.");
  }
}

export async function sendSocialWithdrawalCode() {
  const response = await authFetch(toApiUrl("/api/users/me/social-withdraw/email/send"), {
    method: "POST",
  });

  if (!response.ok) {
    throw await readApiError(response, "회원탈퇴 인증번호 전송에 실패했습니다.");
  }
}

export async function deleteSocialUserAccount(value: SocialUserWithdrawalRequest) {
  const response = await authFetch(toApiUrl("/api/users/me/social-withdraw"), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: value.verificationCode,
    }),
  });

  if (!response.ok) {
    throw await readApiError(response, "회원탈퇴에 실패했습니다.");
  }
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

export async function sendUserEmailChangeCode(value: UserEmailChangeCodeRequest) {
  const response = await authFetch(toApiUrl("/api/users/me/email/change/send"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });

  if (!response.ok) {
    throw await readApiError(response, "인증번호 전송에 실패했습니다.");
  }
}

export async function updateUserEmail(value: UserEmailUpdateRequest) {
  const response = await authFetch(toApiUrl("/api/users/me/email"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newEmail: value.newEmail,
      code: value.verificationCode,
    }),
  });

  if (!response.ok) {
    throw await readApiError(response, "이메일 변경에 실패했습니다.");
  }

  return readApiData<UserProfile>(response);
}
