import { readApiData, readJsonResponse, toApiUrl } from "./apiClient";

export type AuthResponse = {
  id?: number | string;
  userId?: number | string;
  email?: string;
  nickname?: string;
  accessToken?: string;
  accessTokenExpiresAt?: string;
};

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

type ApiErrorResponse = {
  code?: string;
  message?: string;
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
  USER_002: "이미 등록된 이메일입니다.",
  EMAIL_001: "인증번호가 올바르지 않습니다.",
  EMAIL_002: "인증번호가 만료되었습니다.",
  EMAIL_003: "이메일 인증을 완료해주세요.",
  EMAIL_004: "인증번호 전송에 실패했습니다. 다시 시도해주세요.",
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

  return fallbackMessage;
}

// 인증 관련 POST 요청은 에러 처리와 JSON 파싱 방식이 같아 공통 함수로 묶었습니다.
async function postAuth<TResponse>(path: string, body: object, errorMessage: string) {
  const response = await fetch(toApiUrl(path), {
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

export function login(value: LoginRequest) {
  return postAuth<AuthResponse>("/api/auth/login", value, "로그인에 실패했습니다.");
}

export function signup(value: SignupRequest) {
  return postAuth<AuthResponse>("/api/auth/signup", value, "회원가입에 실패했습니다.");
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
