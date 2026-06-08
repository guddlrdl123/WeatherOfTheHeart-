import type { MailboxItem } from "../types/mailbox";
import { readApiData, readApiError, toApiUrl } from "./apiClient";

export type MailboxItemResponse = {
  id: number | string;
  title: string;
  message: string;
  plazaTitle: string;
  plazaId: number | string;
  generatedImageData?: string | null;
  completedAt: string;
  plazaCreatedAt?: string | null;
  participantCount?: number | null;
  myObjectKey?: string | null;
  myObjectTitle?: string | null;
  read: boolean;
};

type MailboxUnreadCountResponse = {
  unreadCount: number;
};

export const MAILBOX_CHANGED_EVENT = "mw-mailbox-changed";

export function notifyMailboxChanged() {
  window.dispatchEvent(new Event(MAILBOX_CHANGED_EVENT));
}

function toMailboxItem(response: MailboxItemResponse): MailboxItem {
  return {
    id: String(response.id),
    title: response.title,
    message: response.message,
    plazaTitle: response.plazaTitle,
    plazaId: String(response.plazaId),
    generatedImageData: response.generatedImageData ?? "",
    completedAt: response.completedAt,
    plazaCreatedAt: response.plazaCreatedAt ?? response.completedAt,
    participantCount: response.participantCount ?? 0,
    myObjectKey: response.myObjectKey ?? "",
    myObjectTitle: response.myObjectTitle ?? "",
    read: response.read,
  };
}

export async function fetchMailbox(userId: string) {
  const response = await fetch(toApiUrl(`/api/users/${encodeURIComponent(userId)}/mailbox`));

  if (!response.ok) {
    throw await readApiError(response, "우편함을 불러오지 못했습니다.");
  }

  const data = await readApiData<MailboxItemResponse[]>(response);

  return data.map(toMailboxItem);
}

export async function fetchMailboxUnreadCount(userId: string) {
  const response = await fetch(toApiUrl(`/api/users/${encodeURIComponent(userId)}/mailbox/unread-count`));

  if (!response.ok) {
    throw await readApiError(response, "읽지 않은 우편 개수를 불러오지 못했습니다.");
  }

  const data = await readApiData<MailboxUnreadCountResponse>(response);

  return data.unreadCount;
}

export async function markMailboxItemAsRead(userId: string, letterId: string) {
  const response = await fetch(toApiUrl(`/api/users/${encodeURIComponent(userId)}/mailbox/${encodeURIComponent(letterId)}/read`), {
    method: "PATCH",
  });

  if (!response.ok) {
    throw await readApiError(response, "우편 읽음 처리에 실패했습니다.");
  }

  await readApiData<MailboxItemResponse>(response);
  notifyMailboxChanged();
}
