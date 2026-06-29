import { authFetch, readApiData, readApiError, toApiUrl } from "./apiClient";

export type ReportDetail = {
  reportId: number;
  reporterNickname: string;
  reason: string;
  detail: string | null;
  createdAt: string;
};

export type ReportedEntry = {
  entryId: number;
  plazaId: number;
  plazaTitle: string;
  entryTitle: string | null;
  entryContent: string;
  objectKey: string;
  reportedUserId: number;
  reportedUserNickname: string;
  reportedUserEmail: string;
  warningCount: number;
  suspended: boolean;
  reportCount: number;
  latestReportedAt: string;
  reports: ReportDetail[];
};

export type ModerationActionResult = {
  userId: number;
  warningId: number | null;
  warningCount: number;
  suspended: boolean;
};

export async function fetchReportedEntries() {
  const response = await authFetch(toApiUrl("/api/admin/reports"));

  if (!response.ok) {
    throw await readApiError(response, "신고 내역을 불러오지 못했습니다.");
  }

  return readApiData<ReportedEntry[]>(response);
}

export async function deleteReportedEntry(entryId: number, reason: string) {
  const response = await authFetch(toApiUrl(`/api/admin/reports/entries/${encodeURIComponent(entryId)}`), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw await readApiError(response, "신고된 글을 삭제하지 못했습니다.");
  }

  return readApiData<ModerationActionResult>(response);
}

export async function updateUserSuspension(userId: number, suspended: boolean, reason: string) {
  const response = await authFetch(toApiUrl(`/api/admin/users/${encodeURIComponent(userId)}/suspension`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suspended, reason }),
  });

  if (!response.ok) {
    throw await readApiError(response, suspended ? "사용자를 정지하지 못했습니다." : "정지를 해제하지 못했습니다.");
  }

  return readApiData<ModerationActionResult>(response);
}
