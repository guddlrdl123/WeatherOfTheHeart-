import { useState } from "react";
import { Heart, Trash2, X } from "lucide-react";
import { ROOM_OBJECT_BY_KEY } from "../../constants/roomObjects";
import type { PlazaEntry } from "../../types/plaza";
import { getPlazaEntryLikeCount, hasLikedPlazaEntry } from "./plazaHelpers";

type Props = {
  entry: PlazaEntry;
  currentGuestId?: string;
  onClose: () => void;
  onDelete?: (entryId: string) => void;
};

type DeleteConfirmModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

function DeleteConfirmModal({ onCancel, onConfirm }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/25 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[360px] rounded-xl border border-[#b36a5e]/25 bg-[#fffbf6f2] p-5 text-[#5a4632] shadow-xl">
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

export function PlazaPreviewModal({ entry, currentGuestId, onClose, onDelete }: Props) {
  const object = ROOM_OBJECT_BY_KEY[entry.objectKey];
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const likedByCurrentGuest = currentGuestId ? hasLikedPlazaEntry(entry, currentGuestId) : false;
  const likeCount = getPlazaEntryLikeCount(entry);

  function handleDelete() {
    onDelete?.(entry.id);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm select-none">
      <div className="w-full max-w-[560px] rounded-xl bg-[#fffbf6f2] p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {/* <p className="text-xs text-[#5a4632]/55">{entry.guestName}</p> */}
            <h2 className="mt-1 text-xl font-normal text-[#5a4632]">{entry.title || "어느 나그네의 발자취"}</h2>
          </div>

          <div className="flex gap-2">
            {onDelete && (
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

        <p className="max-h-[280px] overflow-y-auto whitespace-pre-wrap rounded-md border border-[#5a4632]/15 bg-white/35 p-4 text-sm leading-7 text-[#5a4632]/70">
          {entry.content}
        </p>
      </div>

      {isConfirmingDelete && (
        <DeleteConfirmModal
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
