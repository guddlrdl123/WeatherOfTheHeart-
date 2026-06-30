import { apiFetch, readApiData, readJsonResponse, toApiUrl } from "./apiClient";

export type AuthResponse = {
  id?: number | string;
  userId?: number | string;
  email?: string;
  nickname?: string;
  isAdmin?: boolean;
  accessToken?: string;
  accessTokenExpiresAt?: string;
  isNewUser?: boolean;
};

export type SocialProvider = "google" | "kakao" | "naver";

type LoginRequest = {
  email: string;
  password: string;
};

type SignupRequest = LoginRequest & {
  nickname: string;
};

type VerifyEmailRequest = {
  email: string;
  verificationCode: string;
};

type PasswordResetCodeRequest = {
  email: string;
  token: string;
};

type PasswordResetConfirmRequest = PasswordResetCodeRequest & {
  newPassword: string;
};

type ApiErrorResponse = {
  code?: string;
  message?: string;
};

type OAuthAuthorizeResponse = {
  authorizationUrl: string;
};

type OAuthLoginRequest = {
  code: string;
  redirectUri: string;
  state: string;
};

export class AuthApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
  }
}

const AUTH_ERROR_MESSAGE_BY_CODE: Record<string, string> = {
  USER_001: "이메일 또는 비밀번호를 확인해 주세요.",
  USER_002: "이미 등록된 이메일입니다.",
  EMAIL_001: "인증번호가 올바르지 않습니다.",
  EMAIL_002: "인증번호가 만료되었습니다.",
  EMAIL_003: "이메일 인증을 완료해 주세요.",
  EMAIL_004: "인증번호 전송에 실패했습니다. 다시 시도해 주세요.",
  EMAIL_005: "인증코드가 올바르지 않습니다.",
  EMAIL_006: "인증코드가 만료되었습니다.",
  OAUTH_001: "소셜 로그인 설정이 누락되었습니다. 관리자에게 문의해 주세요.",
  OAUTH_002: "소셜 로그인 인증 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  OAUTH_003: "소셜 계정의 이메일 제공 동의가 필요합니다.",
  GLOBAL_001: "입력값을 다시 확인해 주세요.",
};

function getErrorCode(body: ApiErrorResponse | null) {
  if (body?.code) {
    return body.code;
  }

  return body?.message?.match(/\[Code:\s*([^\]]+)\]/)?.[1];
}

function getAuthErrorMessage(body: ApiErrorResponse | null, fallbackMessage: string) {
  const code = getErrorCode(body);

  if (code && AUTH_ERROR_MESSAGE_BY_CODE[code]) {
    return AUTH_ERROR_MESSAGE_BY_CODE[code];
  }

  return body?.message?.replace(/\s*\[Code:\s*[^\]]+\]\s*$/, "").trim() || fallbackMessage;
}

async function postAuth<TResponse>(path: string, body: object, errorMessage: string) {
  const response = await apiFetch(toApiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const body = await readJsonResponse<ApiErrorResponse>(response).catch(() => null);
    throw new AuthApiError(getAuthErrorMessage(body, errorMessage), getErrorCode(body));
  }

  return readApiData<TResponse>(response);
}

async function getAuth<TResponse>(path: string, errorMessage: string) {
  const response = await apiFetch(toApiUrl(path));

  if (!response.ok) {
    const body = await readJsonResponse<ApiErrorResponse>(response).catch(() => null);
    throw new AuthApiError(getAuthErrorMessage(body, errorMessage), getErrorCode(body));
  }

  return readApiData<TResponse>(response);
}

export function login(value: LoginRequest) {
  return postAuth<AuthResponse>("/api/auth/login", value, "로그인에 실패했습니다.");
}

export function signup(value: SignupRequest) {
  return postAuth<AuthResponse>("/api/auth/signup", value, "회원가입에 실패했습니다.");
}

export function getSocialAuthorizeUrl(provider: SocialProvider, redirectUri: string, state: string) {
  const params = new URLSearchParams({ redirectUri, state });

  return getAuth<OAuthAuthorizeResponse>(
    `/api/auth/oauth/${provider}/authorize?${params.toString()}`,
    "소셜 로그인 주소를 가져오지 못했습니다.",
  );
}

export function socialLogin(provider: SocialProvider, value: OAuthLoginRequest) {
  return postAuth<AuthResponse>(
    `/api/auth/oauth/${provider}/login`,
    value,
    "소셜 로그인에 실패했습니다.",
  );
}

export async function sendEmailVerification(email: string) {
  await postAuth("/api/auth/email/send", { email }, "인증번호 전송에 실패했습니다.");
}

export async function verifyEmail({ email, verificationCode }: VerifyEmailRequest) {
  await postAuth(
    "/api/auth/email/verify",
    { email, code: verificationCode },
    "이메일 인증에 실패했습니다.",
  );
}

export async function requestPasswordReset(email: string) {
  await postAuth("/api/auth/password/reset/request", { email }, "비밀번호 재설정 메일 발송에 실패했습니다.");
}

export async function verifyPasswordResetCode(value: PasswordResetCodeRequest) {
  await postAuth("/api/auth/password/reset/verify", value, "인증코드 확인에 실패했습니다.");
}

export async function confirmPasswordReset(value: PasswordResetConfirmRequest) {
  await postAuth("/api/auth/password/reset/confirm", value, "비밀번호 재설정에 실패했습니다.");
}
