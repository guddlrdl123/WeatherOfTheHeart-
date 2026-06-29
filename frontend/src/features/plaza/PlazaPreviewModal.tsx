import { useState } from "react";
import { Flag, Heart, Loader2, Pencil, Trash2, X } from "lucide-react";
import { ROOM_OBJECT_BY_KEY } from "../../constants/roomObjects";
import type { PlazaEntry } from "../../types/plaza";
import { getPlazaEntryLikeCount, hasLikedPlazaEntry } from "./plazaHelpers";

const PLAZA_CONTENT_MAX_LENGTH = 200;
const PLAZA_REPORT_DETAIL_MAX_LENGTH = 500;
const PLAZA_REPORT_REASONS = [
  { value: "ABUSIVE_CONTENT", label: "욕설/비방" },
  { value: "HARASSMENT", label: "괴롭힘" },
  { value: "HATE_OR_DISCRIMINATION", label: "혐오/차별" },
  { value: "SPAM", label: "스팸/홍보" },
  { value: "OTHER", label: "기타" },
] as const;
type PlazaReportReason = typeof PLAZA_REPORT_REASONS[number]["value"];

export type PlazaPreviewUpdate = {
  title: string;
  content: string;
};

export type PlazaReportValue = {
  reason: string;
  detail: string;
};

type Props = {
  entry: PlazaEntry;
  currentGuestId?: string;
  onClose: () => void;
  onUpdate?: (entryId: string, value: PlazaPreviewUpdate) => void;
  onDelete?: (entryId: string) => void;
  onReport?: (entryId: string, value: PlazaReportValue) => void | Promise<void>;
};

type DeleteConfirmModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

type ReportConfirmModalProps = {
  onCancel: () => void;
  onConfirm: (value: PlazaReportValue) => void | Promise<void>;
};

function DeleteConfirmModal({ onCancel, onConfirm }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/25 px-4 py-8 backdrop-blur-[2px]">
      <div className="w-full max-w-[360px] max-h-[calc(100vh-64px)] overflow-y-auto rounded-xl border border-[#b36a5e]/25 bg-[#fffbf6f2] p-5 text-[#5a4632] shadow-xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9] text-[#b36a5e]">
            <Trash2 size={17} />
          </div>
          <div>
            <h4 className="text-base font-semibold text-[#5a4632]">광장 글을 삭제할까요?</h4>
            <p className="mt-1 text-xs leading-6 text-[#5a4632]/65">
              이 글과 광장에 놓인 오브젝트가 함께 삭제돼요.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[#9b6b54]/40 bg-white/30 px-4 py-2 text-sm text-[#9b6b54]/80 hover:bg-white/60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9] px-4 py-2 text-sm text-[#b36a5e] hover:bg-[#faebe7]"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportConfirmModal({ onCancel, onConfirm }: ReportConfirmModalProps) {
  const [reason, setReason] = useState<PlazaReportReason>(PLAZA_REPORT_REASONS[0].value);
  const [detail, setDetail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm({
        reason,
        detail: detail.trim(),
      });
    } catch (caughtError) {
      window.alert(caughtError instanceof Error ? caughtError.message : "신고를 접수하지 못했습니다.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/25 px-4 py-8 backdrop-blur-[2px]">
      <div className="w-full max-w-[420px] max-h-[calc(100vh-64px)] overflow-y-auto rounded-xl border border-[#b36a5e]/25 bg-[#fffbf6f2] p-5 text-[#5a4632] shadow-xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9] text-[#b36a5e]">
            <Flag size={17} />
          </div>
          <div>
            <h4 className="text-base font-semibold text-[#5a4632]">이 글을 신고할까요?</h4>
            <p className="mt-1 text-xs leading-6 text-[#5a4632]/65">
              운영자가 확인할 수 있도록 신고 사유를 남겨주세요.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
            신고 사유
            <select
              className="mw-input h-10 px-3 text-sm"
              value={reason}
              disabled={isSubmitting}
              onChange={(event) => setReason(event.target.value as PlazaReportReason)}
            >
              {PLAZA_REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
            상세 내용
            <textarea
              className="mw-input min-h-[110px] resize-none p-3 text-sm leading-6"
              value={detail}
              maxLength={PLAZA_REPORT_DETAIL_MAX_LENGTH}
              disabled={isSubmitting}
              placeholder="어떤 점이 문제였는지 적어주세요."
              onChange={(event) => setDetail(event.target.value)}
            />
            <span className="text-right text-[0.68rem] text-[#5a4632]">
              {detail.length}/{PLAZA_REPORT_DETAIL_MAX_LENGTH}
            </span>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="rounded-md border border-[#9b6b54]/40 bg-white/30 px-4 py-2 text-sm text-[#9b6b54]/80 hover:bg-white/60 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9] px-4 py-2 text-sm text-[#b36a5e] hover:bg-[#faebe7] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />}
            신고
          </button>
        </div>
      </div>
    </div>
  );
}

export function PlazaPreviewModal({ entry, currentGuestId, onClose, onUpdate, onDelete, onReport }: Props) {
  const object = ROOM_OBJECT_BY_KEY[entry.objectKey];
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isConfirmingReport, setIsConfirmingReport] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const likedByCurrentGuest = currentGuestId ? hasLikedPlazaEntry(entry, currentGuestId) : false;
  const likeCount = getPlazaEntryLikeCount(entry);
  const canSaveEdit = content.trim().length > 0;

  function handleCancelEdit() {
    setIsEditing(false);
    setIsConfirmingDelete(false);
    setIsConfirmingReport(false);
    setTitle(entry.title);
    setContent(entry.content);
  }

  function handleSaveEdit() {
    const nextTitle = title.trim() || "어느 나그네의 발자취";
    const nextContent = content.trim();

    if (!nextContent) {
      return;
    }

    onUpdate?.(entry.id, {
      title: nextTitle,
      content: nextContent,
    });
    setIsEditing(false);
    setIsConfirmingDelete(false);
    setIsConfirmingReport(false);
  }

  function handleDelete() {
    onDelete?.(entry.id);
  }

  async function handleReport(value: PlazaReportValue) {
    await onReport?.(entry.id, value);
    setIsConfirmingReport(false);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-sm select-none">
      <div className="w-full max-w-[560px] max-h-[calc(100vh-64px)] overflow-y-auto rounded-xl bg-[#fffbf6f2] p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {/* <p className="text-xs text-[#5a4632]/55">{entry.guestName}</p> */}
            <h2 className="mt-1 text-xl font-normal text-[#5a4632]">
              {isEditing ? "광장 글 수정" : entry.title || "어느 나그네의 발자취"}
            </h2>
          </div>

          <div className="flex gap-2">
            {!isEditing && onUpdate && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#5a4632]/10 text-[#5a4632] hover:bg-black/5"
                aria-label="수정하기"
                title="수정하기"
              >
                <Pencil size={17} />
              </button>
            )}
            {!isEditing && onDelete && (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9]/70 text-[#b36a5e] hover:bg-[#faebe7]"
                aria-label="삭제하기"
                title="삭제하기"
              >
                <Trash2 size={17} />
              </button>
            )}
            {!isEditing && onReport && (
              <button
                type="button"
                onClick={() => setIsConfirmingReport(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9]/70 text-[#b36a5e] hover:bg-[#faebe7]"
                aria-label="신고하기"
                title="신고하기"
              >
                <Flag size={17} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#5a4632]/10 text-[#5a4632] hover:bg-black/5"
              aria-label="닫기"
              title="닫기"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#5a4632]/15 bg-white/45 px-3 py-1.5 text-xs text-[#5a4632]/70">
          <img src={object.image} alt="" className="h-6 w-6 object-contain" />
          <span>{object.label}</span>
          <Heart
            size={13}
            fill={likedByCurrentGuest ? "currentColor" : "none"}
            className={likedByCurrentGuest ? "text-[#b65f55]" : ""}
          />
          <span>{likeCount}</span>
        </div>

        {isEditing ? (
          <>
            <div className="grid gap-4">
              <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
                제목
                <input
                  className="mw-input h-10 px-3 text-sm"
                  value={title}
                  placeholder="어느 나그네의 발자취"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
                내용
                <textarea
                  className="mw-input min-h-[170px] resize-none p-3 text-sm leading-7"
                  value={content}
                  maxLength={PLAZA_CONTENT_MAX_LENGTH}
                  onChange={(event) => setContent(event.target.value)}
                />
                <span className="text-right text-[0.68rem] text-[#5a4632]">
                  {content.length}/{PLAZA_CONTENT_MAX_LENGTH}
                </span>
              </label>
            </div>

            <div className="mt-6 flex items-start justify-between">
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9] px-4 py-2 text-sm text-[#b36a5e] hover:bg-[#faebe7]"
                >
                  삭제
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-md border border-[#9b6b54]/40 bg-white/30 px-4 py-2 text-sm text-[#9b6b54]/80 hover:bg-white/60"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={!canSaveEdit}
                  onClick={handleSaveEdit}
                  className="mw-button-solid rounded-md px-4 py-2 text-sm disabled:opacity-50"
                >
                  저장
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="max-h-[280px] overflow-y-auto whitespace-pre-wrap rounded-md border border-[#5a4632]/15 bg-white/35 p-4 text-sm leading-7 text-[#5a4632]/70">
            {entry.content}
          </p>
        )}
      </div>

      {isConfirmingDelete && (
        <DeleteConfirmModal
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={handleDelete}
        />
      )}

      {isConfirmingReport && (
        <ReportConfirmModal
          onCancel={() => setIsConfirmingReport(false)}
          onConfirm={handleReport}
        />
      )}
    </div>
  );
}
