import { X } from "lucide-react";
import { useState } from "react";
import type { RoomObjectKey } from "../../types/roomObject";
import { MemoryObjectSelectModal } from "../memory/MemoryObjectSelectModal";

const PLAZA_CONTENT_MAX_LENGTH = 200;

export type PlazaWriteValue = {
  title: string;
  content: string;
  objectKey: RoomObjectKey;
};

type Props = {
  unavailableObjectKeys: RoomObjectKey[];
  allowDuplicateObjects: boolean;
  modalTitle?: string;
  guideMessage?: string;
  onClose: () => void;
  onSave: (value: PlazaWriteValue) => void;
};

export function PlazaWriteModal({
  unavailableObjectKeys,
  allowDuplicateObjects,
  modalTitle = "광장 글 작성",
  guideMessage,
  onClose,
  onSave,
}: Props) {
  // 광장 글 작성은 개인 방과 달리 기분/날씨 선택 없이 글 작성 -> 오브젝트 선택 두 단계로 진행합니다.
  const [step, setStep] = useState<"write" | "object">("write");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const canContinue = content.trim().length > 0;

  function handleSave(objectKey: RoomObjectKey) {
    // 실제 위치 확정은 광장 공간에서 드래그 후 체크 버튼을 누를 때 처리합니다.
    onSave({
      title: title.trim() || "어느 나그네의 발자취",
      content: content.trim(),
      objectKey,
    });
  }

  if (step === "object") {
    return (
      <MemoryObjectSelectModal
        title="오브젝트 선택"
        saveLabel="배치하기"
        unavailableObjectKeys={unavailableObjectKeys}
        allowDuplicateObjects={allowDuplicateObjects}
        onBack={() => setStep("write")}
        onClose={onClose}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm select-none">
      <div className="w-full max-w-[760px] rounded-xl bg-[#fffbf6f2] p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-normal text-[#5a4632]">
              {modalTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md border border-[#5a4632]/10 text-[#5a4632] hover:bg-black/5"
            aria-label="닫기"
            title="닫기"
          >
            <X size={17} />
          </button>
        </div>

        {guideMessage && (
          <p className="mb-5 rounded-md border border-[#9b6b54]/20 bg-white/35 px-3 py-2 text-xs leading-5 text-[#5a4632]/62">
            {guideMessage}
          </p>
        )}

        <div className="grid gap-4">
          <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
            제목
            <input
              className="mw-input h-11 px-3 text-sm"
              value={title}
              placeholder="어느 나그네의 발자취"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
            내용
            <textarea
              className="mw-input min-h-[210px] resize-none p-3 text-sm leading-7"
              value={content}
              maxLength={PLAZA_CONTENT_MAX_LENGTH}
              onChange={(event) => setContent(event.target.value)}
            />
            <span className="text-right text-[0.68rem] text-[#5a4632]">
              {content.length}/{PLAZA_CONTENT_MAX_LENGTH}
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep("object")}
            className="mw-button-solid rounded-md px-5 py-2 text-sm disabled:opacity-50"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
