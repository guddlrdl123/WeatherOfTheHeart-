import { X } from "lucide-react";
import { useState, useMemo } from "react";
import type { WeatherKey } from "../../types/weather";
import type { MoodKey } from "../../types/mood";
import type { RoomObjectKey } from "../../types/roomObject";
import { MOOD_BY_KEY, MOOD_OPTIONS } from "../../constants/mood";
import { MemoryObjectSelectModal } from "./MemoryObjectSelectModal";

export type WriteModalValue = {
    memoryDate: string;
    title?: string;
    content: string;
    moodKey: MoodKey;
    weatherKey: WeatherKey;
    objectKey: RoomObjectKey;
    //   slotKey: ObjectSlotKey;
};

// 오브젝트는 다음 모달 단계에서 고르므로, 작성 초안에는 objectKey를 제외
type WriteDraftValue = Omit<WriteModalValue, "objectKey">;
type MemoryWriteMode = "room" | "plaza";

export function MemoryWriteModal({
    mode = "room",
    initialDate,
    onClose,
    onSave,
}: {
    mode?: MemoryWriteMode;
    initialDate: string;
    onClose: () => void;
    onSave: (value: WriteModalValue) => void;
}) {
    const today = useMemo(() => {
        return new Date().toISOString().split("T")[0];
    }, []);

    const [memoryDate, setMemoryDate] = useState(initialDate);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    const [moodKey, setMoodKey] = useState<MoodKey>("joy");
    // 값이 생기면 작성 모달에서 오브젝트 선택 모달로 전환
    const [draftValue, setDraftValue] = useState<WriteDraftValue | null>(null);
    const selectedMood = MOOD_BY_KEY[moodKey];
    const showMoodSelector = mode !== "plaza";

    // 작성한 내용을 보관하고 오브젝트 선택 단계로 이동
    const handleNext = () => {
        setDraftValue({
            memoryDate,
            title: title.trim() || undefined,
            content: content.trim(),
            moodKey,
            weatherKey: selectedMood.weatherKey,
        });
    };

    // 2단계: 이 메모리를 방 안에서 어떤 오브젝트로 남길지 선택
    if (draftValue) {
        return (
            <MemoryObjectSelectModal
                onBack={() => setDraftValue(null)}
                onClose={onClose}
                onSave={(objectKey) => {
                    onSave({
                        ...draftValue,
                        objectKey,
                    });
                }}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-sm select-none">
            <div className="bg-[#fffbf6c2] w-full max-w-[760px] max-h-[calc(100vh-64px)] overflow-y-auto rounded-xl p-6">

                {/* HEADER */}
                <div className="mb-5 flex items-start justify-between">
                    <h2 className="text-xl text-[#5a4632]">
                        이야기 작성
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-md border border-[#5a4632]/10 hover:bg-black/5 text-[#5a4632]"
                    >
                        <X size={17} />
                    </button>
                </div>

                <div className={showMoodSelector ? "grid gap-5 lg:grid-cols-[1fr_1.1fr]" : "grid gap-5"}>
                    <div className="flex flex-col gap-4">
                        <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
                            날짜
                            <input
                                className="mw-input h-11 px-3 text-sm"
                                type="date"
                                value={memoryDate}
                                max={today}
                                // disabled={mode === "plaza"}
                                onChange={(event) => setMemoryDate(event.target.value)}
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
                            제목
                            <input
                                className="mw-input h-11 px-3 text-sm"
                                value={title}
                                placeholder="어느 날의 이야기"
                                onChange={(event) => setTitle(event.target.value)}
                            />
                        </label>
                    </div>

                    {showMoodSelector && (
                        <div>
                            <p className="mb-2 text-sm text-[#5a4632]">마음 상태</p>
                            <div className="grid grid-cols-3 gap-2">
                                {MOOD_OPTIONS.map((mood) => {
                                    const selected = moodKey === mood.key;

                                    return (
                                        <button
                                            key={mood.key}
                                            type="button"
                                            onClick={() => {
                                                setMoodKey(mood.key);
                                            }}
                                            className="rounded-md border px-3 py-2 text-left text-sm transition hover:bg-white/85"
                                            style={{
                                                borderColor: selected ? "rgba(200,150,106,0.62)" : "rgba(73, 63, 61, 0.13)",
                                                background: selected ? "rgba(200,150,106,0.12)" : "rgba(73, 63, 61, 0.07)",
                                            }}
                                        >
                                            <span className="mr-2">{mood.icon}</span>
                                            {mood.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <label className="mt-5 flex flex-col gap-2 text-sm text-[#5a4632]">
                    내용
                    <textarea
                        className="mw-input min-h-[170px] resize-none p-3 text-sm leading-7"
                        value={content}
                        maxLength={500}
                        // placeholder={mode === "plaza" ? "광장에 조용히 놓고 싶은 장면을 적어주세요." : "오늘은 어떤 날씨를 만들어 드릴까요?"}
                        onChange={(event) => setContent(event.target.value)}
                    />
                    <div className="flex justify-between">
                        <p className="mb-4 rounded-md text-xs leading-6 text-[#5a4632]/65">
                            내용에 상세한 장면이나 감정이 담길수록, 방 안에서 더 어울리는 날씨로 표현될 거예요.
                        </p>
                        <span className="text-[0.68rem] text-[#5a4632]">{content.length}/500</span>
                    </div>
                </label>

                {/* FOOTER */}
                <div className="mt-6 flex justify-end gap-3">
                    {/* <button
                        type="button"
                        onClick={onClose}
                        className="border border-[#9b6b54]/60 bg-[#9b6b54]/10 hover:bg-[#9b6b54]/20 rounded-md px-4 py-2 text-sm text-[#9b6b54]/80"
                    >
                        닫기
                    </button> */}
                    <button
                        type="button"
                        onClick={handleNext}
                        className="mw-button-solid rounded-md px-4 py-2 text-sm"
                    >
                        다음
                    </button>
                </div>

            </div>
        </div>
    );
}
