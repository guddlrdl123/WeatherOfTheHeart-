import { CalendarDays, PenLine } from "lucide-react";
import { MOOD_BY_KEY } from "../../constants/mood";
import type { Memory } from "../../types/memory";
import { formatDotDate } from "../../utils/date";
import { hasMemoryBeenUpdated } from "../../utils/memoryStatus";

type Props = {
    selectedDate: string;
    selectedMemory: Memory | null;
    // today: string;
    // weatherIcon: string;
    // weatherText: string;
    onWrite: () => void;
    onPreview: () => void;
};

export function RoomMemoryPanel({
    selectedDate,
    selectedMemory,
    // today,
    // weatherIcon,
    // weatherText,
    onWrite,
    onPreview,
}: Props) {
    const selectedMood = selectedMemory ? MOOD_BY_KEY[selectedMemory.moodKey] : null;
    const selectedContent = selectedMemory?.content.trim() ?? "";
    const shouldClampContent = selectedContent.length > 90 || selectedContent.split(/\r?\n/).length > 3;
    const isUpdated = selectedMemory ? hasMemoryBeenUpdated(selectedMemory) : false;

    return (
        <section className="flex h-full flex-col rounded-xl p-5 select-none">

            {/* DATE */}
            <div className="mb-3 flex items-center justify-between gap-2 text-sm text-[#5a4632]/80">
                <div className="flex items-center gap-2">
                    <CalendarDays size={16} />
                    {selectedDate ? formatDotDate(selectedDate) : "날짜를 선택하세요"}
                </div>

                {selectedMood && (
                    <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#5a4632]/15 bg-white/45 px-2.5 py-1 text-xs text-[#5a4632]/70">
                        <span aria-hidden="true">{selectedMood.icon}</span>
                        <span>{selectedMood.label}</span>
                    </div>
                )}
            </div>

            {/* CONTENT */}
            {selectedMemory ? (
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-md font-normal text-[#5a4632]">
                            {selectedMemory.title || "어느 날의 이야기"}
                        </h2>
                        {isUpdated && (
                            <span className="rounded-full border border-[#5a4632]/15 bg-white/45 px-2 py-0.5 text-[0.68rem] text-[#5a4632]/60">
                                수정됨
                            </span>
                        )}
                    </div>

                    <p className={`mt-3 text-sm leading-7 text-[#5a4632]/60 ${shouldClampContent ? "line-clamp-3" : ""}`}>
                        {selectedMemory.content}
                    </p>

                    {shouldClampContent && (
                        <div className="mt-auto flex justify-end pt-3">
                            <button
                                type="button"
                                onClick={onPreview}
                                className="mb-4 text-xs text-[#5a4632]/55 hover:text-[#5a4632]"
                            >
                                → 이야기 확인하기
                            </button>
                        </div>
                    )}

                    {/* <p className="mt-4 text-[0.72rem] text-white/34">
                        {weatherIcon} {weatherText}
                    </p> */}
                </div>
            ) : (
                <div className="flex h-full flex-col">
                    <div>
                        <h2 className="text-lg font-normal text-[#5a4632]">
                            아직 이 날의 이야기는 비어 있어요.
                        </h2>

                        <p className="mt-3 text-sm leading-7 text-[#5a4632]/60">
                            비어 있는 날짜에는 이야기 하나를 남길 수 있어요.
                        </p>
                    </div>

                    {selectedDate !== "" && (
                        <button
                            type="button"
                            onClick={onWrite}
                            className="mw-button border border-[#5a4632]/30 bg-[#d8bd9a]/20 mt-5 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm text-[#5a4632]/80"
                        >
                            <PenLine size={15} />
                            이 날의 이야기 남기기
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}
