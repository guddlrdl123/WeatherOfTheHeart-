import { useState } from "react";
import { CalendarDays, Pencil, Trash2, X } from "lucide-react";
import { MOOD_BY_KEY, MOOD_OPTIONS } from "../../constants/mood";
import { ROOM_OBJECT_BY_KEY } from "../../constants/roomObjects";
import { WEATHER_BY_KEY } from "../../constants/weather";
import type { Memory } from "../../types/memory";
import type { MoodKey } from "../../types/mood";
import { formatDotDate } from "../../utils/date";

export type MemoryPreviewUpdate = {
    title?: string;
    content: string;
    moodKey: MoodKey;
};

type Props = {
    memory: Memory;
    onClose: () => void;
    onUpdate: (memoryId: string, value: MemoryPreviewUpdate) => void;
    onDelete: (memoryId: string) => void;
};

type DeleteConfirmModalProps = {
    onCancel: () => void;
    onConfirm: () => void;
};

function DeleteConfirmModal({ onCancel, onConfirm }: DeleteConfirmModalProps) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 px-4 py-8 backdrop-blur-[2px]">
            <div className="w-full max-w-[360px] max-h-[calc(100vh-64px)] overflow-y-auto rounded-xl border border-[#b36a5e]/25 bg-[#fffbf6f2] p-5 text-[#5a4632] shadow-xl">
                <div className="mb-4 flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9] text-[#b36a5e]">
                        <Trash2 size={17} />
                    </div>
                    <div>
                        <h4 className="text-base font-semibold text-[#5a4632]">이야기를 삭제할까요?</h4>
                        <p className="mt-1 text-xs leading-6 text-[#5a4632]/65">
                            이 글과 방에 놓인 오브젝트가 함께 삭제돼요.
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

export function MemoryPreviewModal({ memory, onClose, onUpdate, onDelete }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [title, setTitle] = useState(memory.title ?? "");
    const [content, setContent] = useState(memory.content);
    const [moodKey, setMoodKey] = useState<MoodKey>(memory.moodKey);
    const mood = MOOD_BY_KEY[memory.moodKey];
    const weather = WEATHER_BY_KEY[memory.weatherKey];
    const selectedObject = memory.objectKey ? ROOM_OBJECT_BY_KEY[memory.objectKey] : null;

    const handleCancelEdit = () => {
        setIsEditing(false);
        setIsConfirmingDelete(false);
        setTitle(memory.title ?? "");
        setContent(memory.content);
        setMoodKey(memory.moodKey);
    };

    const handleSaveEdit = () => {
        const nextTitle = title.trim();
        const nextContent = content.trim();

        onUpdate(memory.id, {
            title: nextTitle || undefined,
            content: nextContent,
            moodKey,
        });
        setIsEditing(false);
        setIsConfirmingDelete(false);
    };

    const handleDelete = () => {
        onDelete(memory.id);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-sm select-none">
            <div className="w-full max-w-[580px] max-h-[calc(100vh-64px)] overflow-y-auto rounded-xl bg-[#fffbf6f2] p-6 shadow-xl">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold text-[#5a4632]">
                                {isEditing ? "이야기 수정" : memory.title || "어느 날의 이야기"}
                            </h3>
                            {!isEditing && memory.updatedAt && (
                                <span className="rounded-full border border-[#5a4632]/15 bg-white/45 px-2 py-0.5 text-[0.68rem] text-[#5a4632]/60">
                                    수정됨
                                </span>
                            )}
                        </div>
                        {selectedObject && (
                            <p className="mt-1 text-xs text-[#5a4632]/55">
                                {selectedObject.label}에 남긴 이야기에요.
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {!isEditing && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                aria-label="수정하기"
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#5a4632]/10 text-[#5a4632] hover:bg-black/5"
                            >
                                <Pencil size={17} />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="닫기"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#5a4632]/10 text-[#5a4632] hover:bg-black/5"
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>

                <div className="mb-4 flex items-center justify-between gap-3 text-sm text-[#5a4632]/75">
                    <div className="flex items-center gap-2">
                        <CalendarDays size={16} />
                        <span>{formatDotDate(memory.memoryDate)}</span>
                    </div>

                    {!isEditing && (
                        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#5a4632]/15 bg-white/45 px-2.5 py-1 text-xs">
                            <span aria-hidden="true">{mood.icon}</span>
                            <span>{mood.label}</span>
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <>
                        <p className="mb-4 rounded-md border border-[#5a4632]/15 bg-white/35 px-3 py-2 text-xs leading-6 text-[#5a4632]/65">
                            글을 수정해도 처음 적용된 날씨({weather.icon} {weather.label})는 유지돼요. 날씨를 바꾸려면 글을 삭제한 뒤 다시 작성해주세요.
                        </p>

                        <div className="grid gap-4">
                            <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
                                제목
                                <input
                                    className="mw-input h-11 px-3 text-sm"
                                    value={title}
                                    placeholder="어느 날의 이야기"
                                    onChange={(event) => setTitle(event.target.value)}
                                />
                            </label>

                            <div>
                                <p className="mb-2 text-sm text-[#5a4632]">기분</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {MOOD_OPTIONS.map((option) => {
                                        const selected = moodKey === option.key;

                                        return (
                                            <button
                                                key={option.key}
                                                type="button"
                                                onClick={() => setMoodKey(option.key)}
                                                className="rounded-md border px-3 py-2 text-left text-sm transition hover:bg-white/85"
                                                style={{
                                                    borderColor: selected ? "rgba(200,150,106,0.62)" : "rgba(73, 63, 61, 0.13)",
                                                    background: selected ? "rgba(200,150,106,0.12)" : "rgba(73, 63, 61, 0.07)",
                                                }}
                                            >
                                                <span className="mr-2">{option.icon}</span>
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
                                내용
                                <textarea
                                    className="mw-input min-h-[170px] resize-none p-3 text-sm leading-7"
                                    value={content}
                                    maxLength={500}
                                    onChange={(event) => setContent(event.target.value)}
                                />
                                <span className="text-right text-[0.68rem] text-[#5a4632]">{content.length}/500</span>
                            </label>
                        </div>

                        <div className="mt-6 flex items-start justify-between">
                            <button
                                type="button"
                                onClick={() => setIsConfirmingDelete(true)}
                                className="inline-flex items-center gap-2 rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9] px-4 py-2 text-sm text-[#b36a5e] hover:bg-[#faebe7]"
                            >
                                {/* <Trash2 size={15} /> */}
                                삭제
                            </button>

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
                                    onClick={handleSaveEdit}
                                    className="mw-button-solid rounded-md px-4 py-2 text-sm"
                                >
                                    저장
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="rounded-md border border-[#5a4632]/15 bg-white/35 p-2">

                        <p className="mt-3 max-h-[260px] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-[#5a4632]/65">
                            {memory.content}
                        </p>
                    </div>
                )}

                {isConfirmingDelete && (
                    <DeleteConfirmModal
                        onCancel={() => setIsConfirmingDelete(false)}
                        onConfirm={handleDelete}
                    />
                )}

                {/* <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-[#9b6b54]/60 bg-[#9b6b54]/10 px-4 py-2 text-sm text-[#9b6b54]/80 hover:bg-[#9b6b54]/20"
                    >
                        닫기
                    </button>
                </div> */}
            </div>
        </div>
    );
}
