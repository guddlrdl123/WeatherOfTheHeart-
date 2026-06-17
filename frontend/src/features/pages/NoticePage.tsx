import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Megaphone, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { AppHeader } from "../../components/layout/AppHeader";
import {
  createNotice,
  deleteNotice,
  fetchNotices,
  updateNotice,
  type NoticeItem,
  type NoticePage as NoticePageData,
} from "../../services/noticeService";

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function NoticeRow({
  notice,
  viewerIsAdmin,
  onChanged,
}: {
  notice: NoticeItem;
  viewerIsAdmin: boolean;
  onChanged: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(notice.title);
  const [draftContent, setDraftContent] = useState(notice.content);
  const [isSaving, setIsSaving] = useState(false);
  const [rowError, setRowError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = draftTitle.trim().length > 0 && draftContent.trim().length > 0 && !isSaving;

  async function handleSave() {
    if (!canSave) {
      return;
    }

    try {
      setIsSaving(true);
      setRowError("");
      await updateNotice(notice.id, { title: draftTitle.trim(), content: draftContent });
      setIsEditing(false);
      onChanged();
    } catch (caughtError) {
      setRowError(caughtError instanceof Error ? caughtError.message : "공지 수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    try {
      setIsSaving(true);
      setRowError("");
      await deleteNotice(notice.id);
      onChanged();
    } catch (caughtError) {
      setRowError(caughtError instanceof Error ? caughtError.message : "공지 삭제에 실패했습니다.");
      setIsSaving(false);
      setConfirmDelete(false);
    }
  }

  if (isEditing) {
    return (
      <div className="mw-surface flex flex-col gap-3 rounded-xl p-5">
        <input
          type="text"
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          placeholder="공지 제목"
          className="mw-input h-10 px-3 text-sm"
          maxLength={100}
        />
        <textarea
          value={draftContent}
          onChange={(event) => setDraftContent(event.target.value)}
          placeholder="공지 내용"
          rows={5}
          className="mw-input resize-y px-3 py-2 text-sm leading-6"
          maxLength={5000}
        />
        {rowError && <p className="text-xs text-[#c86f67]">{rowError}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setDraftTitle(notice.title);
              setDraftContent(notice.content);
              setRowError("");
            }}
            disabled={isSaving}
            className="rounded-md border border-[#5a4632]/20 px-3 py-1.5 text-xs text-[#5a4632]/70 hover:bg-[#5a4632]/10 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="mw-button-solid inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs disabled:opacity-50"
          >
            <Send size={13} />
            {isSaving ? "저장 중" : "저장"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mw-surface rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="min-w-0 text-sm font-semibold text-[#5a4632]">{notice.title}</h3>
        <span className="shrink-0 text-xs text-[#5a4632]/42">{formatDateTime(notice.createdAt)}</span>
      </div>
      {notice.authorNickname && (
        <p className="mt-1 text-xs text-[#5a4632]/50">{notice.authorNickname}</p>
      )}
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5a4632]/72">{notice.content}</p>

      {viewerIsAdmin && (
        <div className="mt-3 flex items-center justify-end gap-2">
          {rowError && <span className="mr-auto text-xs text-[#c86f67]">{rowError}</span>}
          {confirmDelete ? (
            <>
              <span className="mr-1 text-xs text-[#5a4632]/60">삭제할까요?</span>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isSaving}
                className="rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9] px-3 py-1.5 text-xs text-[#b36a5e] hover:bg-[#faebe7] disabled:opacity-50"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isSaving}
                className="rounded-md border border-[#5a4632]/20 px-3 py-1.5 text-xs text-[#5a4632]/70 hover:bg-[#5a4632]/10 disabled:opacity-50"
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraftTitle(notice.title);
                  setDraftContent(notice.content);
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#5a4632]/20 px-3 py-1.5 text-xs text-[#5a4632]/80 hover:bg-[#5a4632]/10"
              >
                <Pencil size={13} />
                수정
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#5a4632]/20 px-3 py-1.5 text-xs text-[#5a4632]/80 hover:bg-[#5a4632]/10"
              >
                <Trash2 size={13} />
                삭제
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NoticePage() {
  const [page, setPage] = useState(0);
  const [noticePage, setNoticePage] = useState<NoticePageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadNotices = useCallback(async (targetPage: number) => {
    try {
      setIsLoading(true);
      setListError("");
      const result = await fetchNotices(targetPage);
      setNoticePage(result);
    } catch (caughtError) {
      setListError(caughtError instanceof Error ? caughtError.message : "공지사항을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadNotices(page);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadNotices, page]);

  const viewerIsAdmin = noticePage?.viewerIsAdmin ?? false;
  const totalPages = noticePage?.totalPages ?? 0;
  const currentPage = noticePage?.page ?? page;
  const items = noticePage?.items ?? [];

  const canSubmit = newTitle.trim().length > 0 && newContent.trim().length > 0 && !isSubmitting;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);
      setCreateError("");
      await createNotice({ title: newTitle.trim(), content: newContent });
      setNewTitle("");
      setNewContent("");
      setIsCreating(false);

      if (page === 0) {
        void loadNotices(0);
      } else {
        setPage(0);
      }
    } catch (caughtError) {
      setCreateError(caughtError instanceof Error ? caughtError.message : "공지 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mw-app flex min-h-screen flex-col select-none">
      <AppHeader />

      <main className="min-h-0 flex-1 overflow-auto px-6 py-10">
        <div className="mx-auto w-full max-w-[760px]">
          <section className="text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#5a4632]/15 bg-white/35 text-[#9b6b54]">
              <Megaphone size={22} />
            </div>
            <h1 className="text-2xl font-normal text-[#5a4632]">공지사항</h1>
            <p className="mt-2 text-sm text-[#5a4632]/58">마음의 날씨의 새로운 소식과 안내를 확인하세요.</p>
          </section>

          {/* 관리자만 공지 작성 */}
          {viewerIsAdmin && (
            <section className="mt-8">
              {isCreating ? (
                <form onSubmit={handleCreate} className="mw-surface flex flex-col gap-3 rounded-xl p-6">
                  <h2 className="text-sm font-medium text-[#5a4632]">새 공지 작성</h2>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    placeholder="공지 제목"
                    className="mw-input h-10 px-3 text-sm"
                    maxLength={100}
                  />
                  <textarea
                    value={newContent}
                    onChange={(event) => setNewContent(event.target.value)}
                    placeholder="공지 내용을 입력해 주세요."
                    rows={5}
                    className="mw-input resize-y px-3 py-2 text-sm leading-6"
                    maxLength={5000}
                  />
                  {createError && <p className="text-xs text-[#c86f67]">{createError}</p>}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setNewTitle("");
                        setNewContent("");
                        setCreateError("");
                      }}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#5a4632]/20 px-3 py-2 text-sm text-[#5a4632]/70 hover:bg-[#5a4632]/10 disabled:opacity-50"
                    >
                      <X size={14} />
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="mw-button-solid inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm disabled:opacity-50"
                    >
                      <Send size={14} />
                      {isSubmitting ? "등록 중" : "공지 등록"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="mw-button inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm"
                  >
                    <Plus size={15} />
                    새 공지 작성
                  </button>
                </div>
              )}
            </section>
          )}

          <section className="mt-8">
            {listError && (
              <div className="mb-3 rounded-xl border border-[#a76c5d]/25 bg-[#a76c5d]/10 px-4 py-3 text-sm text-[#c86f67]">
                {listError}
              </div>
            )}

            {isLoading ? (
              <div className="mw-surface grid min-h-[140px] place-items-center rounded-xl p-6 text-sm text-[#5a4632]/55">
                공지사항을 불러오는 중입니다.
              </div>
            ) : items.length === 0 ? (
              <div className="mw-surface grid min-h-[140px] place-items-center rounded-xl p-6 text-sm text-[#5a4632]/55">
                아직 등록된 공지가 없어요.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {items.map((notice) => (
                  <NoticeRow
                    key={notice.id}
                    notice={notice}
                    viewerIsAdmin={viewerIsAdmin}
                    onChanged={() => void loadNotices(currentPage)}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={currentPage <= 0 || isLoading}
                  className="grid h-8 w-8 place-items-center rounded-md border border-[#5a4632]/20 text-[#5a4632]/80 hover:bg-[#5a4632]/10 disabled:opacity-40"
                  aria-label="이전 페이지"
                >
                  <ChevronLeft size={15} />
                </button>

                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setPage(index)}
                    disabled={isLoading}
                    aria-current={index === currentPage ? "page" : undefined}
                    className={`h-8 min-w-8 rounded-md border px-2 text-sm transition-colors ${
                      index === currentPage
                        ? "border-[#9b6b54]/60 bg-[#9b6b54]/15 text-[#9b6b54]"
                        : "border-[#5a4632]/20 text-[#5a4632]/80 hover:bg-[#5a4632]/10"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!noticePage?.hasNext || isLoading}
                  className="grid h-8 w-8 place-items-center rounded-md border border-[#5a4632]/20 text-[#5a4632]/80 hover:bg-[#5a4632]/10 disabled:opacity-40"
                  aria-label="다음 페이지"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default NoticePage;
