export const API_BASE_URL = import.meta.env.NEXT_PUBLIC_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? "";
export const APP_NAME = import.meta.env.NEXT_PUBLIC_APP_NAME ?? "마음의 날씨";
export const S3_ASSET_BASE_URL = import.meta.env.NEXT_PUBLIC_S3_ASSET_BASE_URL ?? "";

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
