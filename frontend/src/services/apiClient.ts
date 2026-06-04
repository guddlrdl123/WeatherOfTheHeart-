export const API_BASE_URL = import.meta.env.NEXT_PUBLIC_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? "";
export const APP_NAME = import.meta.env.NEXT_PUBLIC_APP_NAME ?? "마음의 날씨";
export const S3_ASSET_BASE_URL = import.meta.env.NEXT_PUBLIC_S3_ASSET_BASE_URL ?? "";

export function toApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}
