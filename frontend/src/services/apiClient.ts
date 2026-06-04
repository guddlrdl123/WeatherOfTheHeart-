export const API_BASE_URL = import.meta.env.NEXT_PUBLIC_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? "";
export const APP_NAME = import.meta.env.NEXT_PUBLIC_APP_NAME ?? "마음의 날씨";
export const S3_ASSET_BASE_URL = import.meta.env.NEXT_PUBLIC_S3_ASSET_BASE_URL ?? "";
// API 응답의 공통 구조를 정의, 실제 데이터는 data 필드에 있다.
export type ApiResponse<T> = {
  status: string;
  message: string;
  data: T;
};

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
