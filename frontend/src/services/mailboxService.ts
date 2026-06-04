import type { MailboxItem } from "../types/mailbox";
import { readApiData, toApiUrl } from "./apiClient";

// 백엔드 MailboxItemResponse record와 같은 필드명을 유지합니다.
export type MailboxItemResponse = {
  id: number | string;
  title: string;
  message: string;
  plazaTitle: string;
  plazaId: number | string;
  generatedImageData?: string | null;
  completedAt: string;
  read: boolean;
};

function toMailboxItem(response: MailboxItemResponse): MailboxItem {
  // 백엔드 숫자 ID를 화면/라우팅에서 다루기 편한 string으로 통일합니다.
  return {
    id: String(response.id),
    title: response.title,
    message: response.message,
    plazaTitle: response.plazaTitle,
    plazaId: String(response.plazaId),
    generatedImageData: response.generatedImageData ?? "",
    completedAt: response.completedAt,
    read: response.read,
  };
}

export async function fetchMailbox(userId: string) {
  // 완성된 광장 이미지가 담긴 우편 목록을 사용자 우편함에서 가져옵니다.
  const response = await fetch(toApiUrl(`/api/users/${encodeURIComponent(userId)}/mailbox`));

  if (!response.ok) {
    throw new Error("우편함을 불러오지 못했습니다.");
  }

  const data = await readApiData<MailboxItemResponse[]>(response);

  return data.map(toMailboxItem);
}

export async function markMailboxItemAsRead(userId: string, letterId: string) {
  // 상세 확인 시 서버에도 읽음 상태를 반영합니다.
  const response = await fetch(toApiUrl(`/api/users/${encodeURIComponent(userId)}/mailbox/${encodeURIComponent(letterId)}/read`), {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("우편 읽음 처리에 실패했습니다.");
  }

  await readApiData<MailboxItemResponse>(response);
}
