import { authFetch, readApiData, readApiError, toApiUrl } from "./apiClient";

// 한 페이지에 보여줄 문의 개수입니다. (백엔드 InquiryService.PAGE_SIZE와 동일)
export const INQUIRY_PAGE_SIZE = 10;

export type InquiryItem = {
  id: number;
  authorNickname: string | null;
  authorEmail: string | null;
  title: string | null;
  content: string | null;
  answer: string | null;
  answererNickname: string | null;
  answeredAt: string | null;
  answered: boolean;
  createdAt: string;
  masked: boolean;
  mine: boolean;
  isPublic: boolean;
  warningCount: number | null;
};

export type InquiryPage = {
  items: InquiryItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  viewerIsAdmin: boolean;
};

export async function createInquiry(input: { title: string; content: string; isPublic: boolean }) {
  const response = await authFetch(toApiUrl("/api/inquiries"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await readApiError(response, "문의 등록에 실패했습니다.");
  }

  return readApiData<InquiryItem>(response);
}

export async function fetchInquiries(page: number) {
  const response = await authFetch(toApiUrl(`/api/inquiries?page=${encodeURIComponent(page)}`));

  if (!response.ok) {
    throw await readApiError(response, "문의 목록을 불러오지 못했습니다.");
  }

  return readApiData<InquiryPage>(response);
}

// 관리자가 특정 문의에 답변을 작성/수정합니다.
export async function answerInquiry(inquiryId: number, answer: string) {
  const response = await authFetch(toApiUrl(`/api/inquiries/${encodeURIComponent(inquiryId)}/answer`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ answer }),
  });

  if (!response.ok) {
    throw await readApiError(response, "답변 등록에 실패했습니다.");
  }

  return readApiData<InquiryItem>(response);
}
