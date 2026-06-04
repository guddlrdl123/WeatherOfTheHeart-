import { readJsonResponse, toApiUrl } from "./apiClient";

export type AuthResponse = {
  id?: number | string;
  userId?: number | string;
  nickname?: string;
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
    throw new Error(errorMessage);
  }

  return readJsonResponse<TResponse>(response);
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
