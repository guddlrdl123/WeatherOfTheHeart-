import { useState } from "react";
import { Search, X } from "lucide-react";
import {
    ROOM_OBJECT_CATEGORIES,
    ROOM_OBJECT_OPTIONS,
    type RoomObjectCategoryFilterKey,
} from "../../constants/roomObjects";
import type { RoomObjectKey } from "../../types/roomObject";

type Props = {
    onBack: () => void;
    onClose: () => void;
    onSave: (objectKey: RoomObjectKey) => void;
    title?: string;
    saveLabel?: string;
    unavailableObjectKeys?: RoomObjectKey[];
    allowDuplicateObjects?: boolean;
};

export function MemoryObjectSelectModal({
    onBack,
    onClose,
    onSave,
    title = "오브젝트 선택",
    saveLabel = "방에 남기기",
    unavailableObjectKeys = [],
    allowDuplicateObjects = true,
}: Props) {
    const [searchText, setSearchText] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<RoomObjectCategoryFilterKey>("all");
    const normalizedSearchText = searchText.trim().toLocaleLowerCase();
    const filteredObjects = ROOM_OBJECT_OPTIONS.filter((object) => {
        const matchesCategory = selectedCategory === "all" || object.category === selectedCategory;
        const matchesSearch = !normalizedSearchText
            || object.label.toLocaleLowerCase().includes(normalizedSearchText);

        return matchesCategory && matchesSearch;
    });
    const firstSelectableObject = filteredObjects.find(
        (object) => allowDuplicateObjects || !unavailableObjectKeys.includes(object.key),
    );
    const [selectedObjectKey, setSelectedObjectKey] = useState<RoomObjectKey | null>(
        firstSelectableObject?.key ?? null,
    );
    const hasObjects = ROOM_OBJECT_OPTIONS.length > 0;
    const selectedObjectExists = selectedObjectKey !== null
        && filteredObjects.some((object) => object.key === selectedObjectKey);
    const selectedUnavailable = selectedObjectKey !== null
        && !allowDuplicateObjects
        && unavailableObjectKeys.includes(selectedObjectKey);
    const effectiveSelectedObjectKey = selectedObjectExists && !selectedUnavailable
        ? selectedObjectKey
        : firstSelectableObject?.key ?? null;
    const canSave = effectiveSelectedObjectKey !== null;

    function handleSave() {
        if (effectiveSelectedObjectKey === null) {
            return;
        }

        onSave(effectiveSelectedObjectKey);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-sm select-none">
            <div className="flex h-[min(820px,calc(100vh-48px))] w-full max-w-[760px] flex-col overflow-hidden rounded-xl bg-[#fffbf6c2] p-6">
                <div className="mb-5 flex shrink-0 items-start justify-between">
                    <h2 className="text-xl text-[#5a4632]">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-md border border-[#5a4632]/10 hover:bg-black/5 text-[#5a4632]"
                    >
                        <X size={17} />
                    </button>
                </div>

                {hasObjects && (
                    <div className="mb-4 shrink-0">
                        <div className="flex h-10 items-center gap-2 rounded-md border border-[#5a4632]/12 bg-white/40 px-3 text-[#5a4632]">
                            <Search size={16} className="shrink-0 text-[#5a4632]/45" />
                            <input
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                placeholder="오브젝트명으로 검색"
                                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#5a4632]/35"
                            />
                            {searchText && (
                                <button
                                    type="button"
                                    onClick={() => setSearchText("")}
                                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#5a4632]/50 transition hover:bg-[#5a4632]/10 hover:text-[#5a4632]"
                                    aria-label="검색어 지우기"
                                    title="검색어 지우기"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {ROOM_OBJECT_CATEGORIES.map((category) => {
                                const selected = selectedCategory === category.key;

                                return (
                                    <button
                                        key={category.key}
                                        type="button"
                                        onClick={() => setSelectedCategory(category.key)}
                                        className="shrink-0 rounded-full border px-3 py-1.5 text-xs transition"
                                        style={{
                                            borderColor: selected ? "rgba(155,107,84,0.52)" : "rgba(90,70,50,0.14)",
                                            background: selected ? "rgba(155,107,84,0.14)" : "rgba(255,255,255,0.34)",
                                            color: selected ? "#7a5242" : "rgba(90,70,50,0.68)",
                                        }}
                                    >
                                        {category.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    {hasObjects ? (
                        filteredObjects.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {filteredObjects.map((object) => {
                                    const selected = effectiveSelectedObjectKey === object.key;
                                    const unavailable = !allowDuplicateObjects && unavailableObjectKeys.includes(object.key);

                                    return (
                                        <button
                                            key={object.key}
                                            type="button"
                                            disabled={unavailable}
                                            onClick={() => setSelectedObjectKey(object.key)}
                                            className="flex h-[150px] flex-col items-center justify-center gap-3 rounded-md border p-3 text-sm text-[#5a4632] transition hover:bg-white/85 disabled:opacity-35"
                                            style={{
                                                borderColor: selected ? "rgba(200,150,106,0.68)" : "rgba(73, 63, 61, 0.13)",
                                                background: selected ? "rgba(200,150,106,0.14)" : "rgba(73, 63, 61, 0.07)",
                                            }}
                                        >
                                            <img
                                                src={object.image}
                                                alt=""
                                                className="h-24 w-full object-contain"
                                            />
                                            <span>{object.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="grid min-h-full place-items-center rounded-md border border-[#5a4632]/12 bg-white/35 px-4 py-10 text-center text-sm leading-6 text-[#5a4632]/60">
                                검색 결과가 없습니다.
                            </div>
                        )
                    ) : (
                        <div className="grid min-h-full place-items-center rounded-md border border-[#5a4632]/12 bg-white/35 px-4 py-10 text-center text-sm leading-6 text-[#5a4632]/60">
                            등록된 오브젝트가 없습니다.
                        </div>
                    )}
                    {hasObjects && filteredObjects.length > 0 && !firstSelectableObject && (
                        <p className="mt-4 rounded-md border border-[#5a4632]/12 bg-white/35 px-3 py-2 text-sm text-[#5a4632]/60">
                            선택 가능한 오브젝트가 없습니다.
                        </p>
                    )}
                </div>

                <div className="mt-6 flex shrink-0 justify-end gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="border border-[#9b6b54]/60 bg-[#9b6b54]/10 hover:bg-[#9b6b54]/20 rounded-md px-4 py-2 text-sm text-[#9b6b54]/80"
                    >
                        이전
                    </button>
                    <button
                        type="button"
                        // 여기서는 오브젝트 키만 넘기고 실제 위치 배치는 RoomPage에서 처리
                        disabled={!canSave}
                        onClick={handleSave}
                        className="mw-button-solid rounded-md px-4 py-2 text-sm disabled:opacity-50"
                    >
                        {saveLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
