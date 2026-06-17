import { authFetch, readApiData, readApiError, toApiUrl } from "./apiClient";

// 한 페이지에 보여줄 공지 개수입니다. (백엔드 NoticeService.PAGE_SIZE와 동일)
export const NOTICE_PAGE_SIZE = 10;

export type NoticeItem = {
  id: number;
  authorNickname: string | null;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type NoticePage = {
  items: NoticeItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  viewerIsAdmin: boolean;
};

export async function fetchNotices(page: number) {
  const response = await authFetch(toApiUrl(`/api/notices?page=${encodeURIComponent(page)}`));

  if (!response.ok) {
    throw await readApiError(response, "공지사항을 불러오지 못했습니다.");
  }

  return readApiData<NoticePage>(response);
}

// 관리자: 공지 작성
export async function createNotice(input: { title: string; content: string }) {
  const response = await authFetch(toApiUrl("/api/notices"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await readApiError(response, "공지 등록에 실패했습니다.");
  }

  return readApiData<NoticeItem>(response);
}

// 관리자: 공지 수정
export async function updateNotice(noticeId: number, input: { title: string; content: string }) {
  const response = await authFetch(toApiUrl(`/api/notices/${encodeURIComponent(noticeId)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await readApiError(response, "공지 수정에 실패했습니다.");
  }

  return readApiData<NoticeItem>(response);
}

// 관리자: 공지 삭제
export async function deleteNotice(noticeId: number) {
  const response = await authFetch(toApiUrl(`/api/notices/${encodeURIComponent(noticeId)}`), {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await readApiError(response, "공지 삭제에 실패했습니다.");
  }
}
