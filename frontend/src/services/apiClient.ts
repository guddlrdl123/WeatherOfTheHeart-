import { clearAuthenticated, getAuthHeader } from "../utils/authSession";

export const API_BASE_URL = import.meta.env.NEXT_PUBLIC_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? "";
export const APP_NAME = import.meta.env.NEXT_PUBLIC_APP_NAME ?? "마음의 날씨";
export const S3_ASSET_BASE_URL = import.meta.env.VITE_S3_ASSET_BASE_URL ?? import.meta.env.NEXT_PUBLIC_S3_ASSET_BASE_URL ?? "";
export const API_NETWORK_ERROR_MESSAGE = "서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
// API 응답의 공통 구조를 정의, 실제 데이터는 data 필드에 있다.
export type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

type ApiErrorBody = Partial<ApiResponse<unknown>> & {
  code?: string;
};

type ReadApiErrorOptions = {
  messageByCode?: Record<string, string>;
};

export class ApiRequestError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

function getApiErrorCode(body: ApiErrorBody | null) {
  if (body?.code) {
    return body.code;
  }

  return body?.message?.match(/\[Code:\s*([^\]]+)\]/)?.[1];
}

function getApiErrorMessage(body: ApiErrorBody | null, fallbackMessage: string) {
  return body?.message?.replace(/\s*\[Code:\s*[^\]]+\]\s*$/, "").trim() || fallbackMessage;
}

function handleApiErrorCode(code?: string) {
  if (code === "USER_001" || code === "AUTH_001" || code === "AUTH_002" || code === "AUTH_003") {
    clearAuthenticated();
  }
}

export async function readApiError(
  response: Response,
  fallbackMessage: string,
  options: ReadApiErrorOptions = {},
) {
  const body = await readJsonResponse<ApiErrorBody>(response).catch(() => null);
  const code = getApiErrorCode(body);

  handleApiErrorCode(code);

  return new ApiRequestError(
    code && options.messageByCode?.[code]
      ? options.messageByCode[code]
      : getApiErrorMessage(body, fallbackMessage),
    response.status,
    code,
  );
}

// 모든 서비스 레이어가 같은 API base URL 규칙을 쓰도록 경로 조합을 한곳에 모았습니다.
export function toApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

// 응답 본문이 비어 있는 POST/PATCH도 안전하게 처리하기 위한 공통 JSON 파서입니다.
export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}
// API 응답에서 data 필드만 추출하는 유틸리티 함수입니다. 모든 API 응답이 ApiResponse<T> 형태를 따르므로, 이 함수를 통해 일관된 방식으로 데이터를 얻을 수 있습니다.
export async function readApiData<T>(response: Response): Promise<T> {
  const body = await readJsonResponse<ApiResponse<T>>(response);

  return body.data;
}

const NETWORK_RETRY_DELAYS_MS = [400, 800];
const RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function isRequestAborted(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getRequestMethod(input: RequestInfo | URL, init: RequestInit) {
  return (
    init.method
    ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")
  ).toUpperCase();
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const requestMethod = getRequestMethod(input, init);
  const retryCount = RETRYABLE_METHODS.has(requestMethod) ? NETWORK_RETRY_DELAYS_MS.length : 0;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (isRequestAborted(error)) {
        throw error;
      }

      if (attempt === retryCount) {
        throw new ApiRequestError(API_NETWORK_ERROR_MESSAGE, 0);
      }

      await wait(NETWORK_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new ApiRequestError(API_NETWORK_ERROR_MESSAGE, 0);
}

async function handleAuthenticationFailure(response: Response) {
  if (response.status === 401) {
    clearAuthenticated();
    return;
  }

  if (response.status !== 403) {
    return;
  }

  const body = await readJsonResponse<ApiErrorBody>(response.clone()).catch(() => null);
  handleApiErrorCode(getApiErrorCode(body));
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const authHeader = getAuthHeader();

  Object.entries(authHeader).forEach(([key, value]) => {
    headers.set(key, value);
  });

  const response = await apiFetch(input, {
    ...init,
    headers,
  });

  await handleAuthenticationFailure(response);

  return response;
}
