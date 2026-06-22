import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, X } from "lucide-react";
import Room from "../room/Room"
import RoomCalendarSidebar from "../calendar/RoomCalendarSidebar";
import { RoomMemoryPanel } from "../memory/RoomMemoryPanel";
import { MemoryWriteModal, type WriteModalValue } from "../memory/MemoryWriteModal";
import { MemoryPreviewModal, type MemoryPreviewUpdate } from "../memory/MemoryPreviewModal";
// import { getTodayString } from "../utils/date";
import { AppHeader } from "../../components/layout/AppHeader";
import { useRoomObjectCatalog } from "../../hooks/useRoomObjectCatalog";
import { useResponsiveStageWidth } from "../../hooks/useResponsiveStageWidth";
import { createMemory, deleteMemory, fetchMemories, updateMemory, updateMemoryPosition } from "../../services/memoryService";
import type { Memory } from "../../types/memory";
import type { RoomObjectKey, RoomObjectPosition } from "../../types/roomObject";
import type { WeatherKey } from "../../types/weather";
import { getTodayString } from "../../utils/date";

type PendingPlacement = {
    value: WriteModalValue;
    position: RoomObjectPosition;
    layer: number;
};

type EditingPlacement = {
    memoryId: string;
    objectKey: RoomObjectKey;
    position: RoomObjectPosition;
    layer: number;
    originalPosition: RoomObjectPosition;
    originalLayer: number;
};

type RoomNotice = {
    message: string;
};

const DEFAULT_OBJECT_POSITION: RoomObjectPosition = { x: 24, y: 84 };
const OBJECT_LAYER_MIN = 0;
const ROOM_LAYOUT_WIDTH = 1460;
const ROOM_LAYOUT_HEIGHT = 630;
const ROOM_NOTICE_DURATION_MS = 3500;
const DUPLICATE_MEMORY_DATE_NOTICE = "해당 날짜에는 이미 기록이 있어요. 다른 날짜를 선택해주세요.";

const getMonthKey = (dateString: string) => {
    return dateString.slice(0, 7);
};

const formatRoomMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    return `${year}년 ${Number(month)}월`;
};

const getMemoryObjectLayer = (memory: Memory) => memory.objectLayer ?? OBJECT_LAYER_MIN;

function normalizeMemoryObjectLayers(memories: Memory[]) {
    const memoriesByMonth = new Map<string, Array<{ memory: Memory; index: number }>>();
    const layerById = new Map<string, number>();

    memories.forEach((memory, index) => {
        if (!memory.objectKey || !memory.objectPosition) {
            return;
        }

        const monthKey = getMonthKey(memory.memoryDate);
        const monthMemories = memoriesByMonth.get(monthKey) ?? [];

        monthMemories.push({ memory, index });
        memoriesByMonth.set(monthKey, monthMemories);
    });

    memoriesByMonth.forEach((monthMemories) => {
        monthMemories
            .sort((a, b) => getMemoryObjectLayer(a.memory) - getMemoryObjectLayer(b.memory) || a.index - b.index)
            .forEach(({ memory }, layer) => {
                layerById.set(memory.id, layer);
            });
    });

    return memories.map((memory) => {
        const layer = layerById.get(memory.id);

        return layer === undefined || memory.objectLayer === layer
            ? memory
            : { ...memory, objectLayer: layer };
    });
}

function RoomPage() {
    const { isLoading: isObjectCatalogLoading } = useRoomObjectCatalog();

    const [weather] = useState<WeatherKey>('sunny');
    const stageWidth = useResponsiveStageWidth({
        designWidth: ROOM_LAYOUT_WIDTH,
        designHeight: ROOM_LAYOUT_HEIGHT,
    });
    const stageScale = stageWidth / ROOM_LAYOUT_WIDTH;
    const stageHeight = ROOM_LAYOUT_HEIGHT * stageScale;

    // const [weather, setWeather] = useState<WeatherKey>("sunny");

    // const weatherList: WeatherKey[] = ["sunny", "rain", "cloud", "sunset", "night", "dawn"];

    // const toggleWeather = () => {
    //     setWeather((prev) => {
    //         const index = weatherList.indexOf(prev);
    //         return weatherList[(index + 1) % weatherList.length];
    //     });
    // };

    const [isWriteOpen, setIsWriteOpen] = useState(false);

    // const today = getTodayString();

    const [selectedDate, setSelectedDate] = useState(() => getTodayString());
    const [roomMonthKey, setRoomMonthKey] = useState(() => getMonthKey(getTodayString()));
    // const [viewYear, setViewYear] = useState(new Date().getFullYear());
    // const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);

    const [memories, setMemories] = useState<Memory[]>([]);
    const [isMemoryLoading, setIsMemoryLoading] = useState(true);
    const [memoryLoadError, setMemoryLoadError] = useState("");
    // 사용자가 오브젝트 위치를 고르는 동안 작성한 메모리를 임시로 보관
    const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
    const [editingPlacement, setEditingPlacement] = useState<EditingPlacement | null>(null);
    const [isPlacementSaving, setIsPlacementSaving] = useState(false);
    const [activeObjectId, setActiveObjectId] = useState<string | null>(null);
    const [bouncingObjectId, setBouncingObjectId] = useState<string | null>(null);
    const [previewMemory, setPreviewMemory] = useState<Memory | null>(null);
    const bounceStartTimerRef = useRef<number | null>(null);
    const bounceEndTimerRef = useRef<number | null>(null);
    const roomNoticeTimerRef = useRef<number | null>(null);
    const [roomNotice, setRoomNotice] = useState<RoomNotice | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadMemories = async () => {
            try {
                setIsMemoryLoading(true);
                setMemoryLoadError("");

                const loadedMemories = await fetchMemories();

                if (!isMounted) {
                    return;
                }

                setMemories(normalizeMemoryObjectLayers(loadedMemories));
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setMemoryLoadError(error instanceof Error ? error.message : "기록 목록을 불러오지 못했습니다.");
            } finally {
                if (isMounted) {
                    setIsMemoryLoading(false);
                }
            }
        };

        void loadMemories();

        return () => {
            isMounted = false;
        };
    }, []);


    const selectedMemory = memories.find(
        (m) => m.memoryDate === selectedDate
    ) || null;
    const roomWeather = selectedMemory?.weatherKey ?? weather;
    // Room 컴포넌트가 바로 그릴 수 있는 형태로 현재 월의 저장된 오브젝트만 추려냅니다.
    const placedRoomObjects = memories
        .filter((memory) => (
            getMonthKey(memory.memoryDate) === roomMonthKey
            && memory.objectKey
            && memory.objectPosition
            && memory.id !== editingPlacement?.memoryId
        ))
        .map((memory) => ({
            id: memory.id,
            objectKey: memory.objectKey!,
            position: memory.objectPosition!,
            layer: memory.objectLayer ?? OBJECT_LAYER_MIN,
            title: memory.title,
        }));
    const isRoomLoading = isMemoryLoading || isObjectCatalogLoading;
    const roomMonthLabel = formatRoomMonthLabel(roomMonthKey);
    const unavailableMemoryDates = useMemo(() => memories.map((memory) => memory.memoryDate), [memories]);

    function showRoomNotice(message: string) {
        setRoomNotice({ message });

        if (roomNoticeTimerRef.current !== null) {
            window.clearTimeout(roomNoticeTimerRef.current);
        }

        roomNoticeTimerRef.current = window.setTimeout(() => {
            setRoomNotice(null);
            roomNoticeTimerRef.current = null;
        }, ROOM_NOTICE_DURATION_MS);
    }

    function closeRoomNotice() {
        setRoomNotice(null);

        if (roomNoticeTimerRef.current !== null) {
            window.clearTimeout(roomNoticeTimerRef.current);
            roomNoticeTimerRef.current = null;
        }
    }

    const getNextObjectLayer = (dateString: string) => {
        // 새 오브젝트는 현재 달의 가장 앞 레이어 다음에 배치합니다.
        const monthKey = getMonthKey(dateString);
        const maxLayer = memories
            .filter((memory) => getMonthKey(memory.memoryDate) === monthKey && memory.objectKey && memory.objectPosition)
            .reduce((max, memory) => Math.max(max, getMemoryObjectLayer(memory)), OBJECT_LAYER_MIN - 1);

        return maxLayer + 1;
    };

    const getPlacementLayers = (monthKey: string, excludedMemoryId?: string) => {
        // 편집 중인 오브젝트는 비교 대상에서 빼야 자신의 레이어가 이동 기준을 왜곡하지 않습니다.
        return memories
            .filter((memory) => (
                getMonthKey(memory.memoryDate) === monthKey
                && memory.objectKey
                && memory.objectPosition
                && memory.id !== excludedMemoryId
            ))
            .map(getMemoryObjectLayer);
    };

    const getPendingBackLayer = (placement: PendingPlacement) => {
        const otherLayers = getPlacementLayers(getMonthKey(placement.value.memoryDate));

        return otherLayers.length > 0 ? Math.min(...otherLayers) - 1 : placement.layer;
    };

    const getPendingFrontLayer = (placement: PendingPlacement) => {
        const otherLayers = getPlacementLayers(getMonthKey(placement.value.memoryDate));

        return otherLayers.length > 0 ? Math.max(...otherLayers) + 1 : placement.layer;
    };

    const getEditingMonthKey = (placement: EditingPlacement) => {
        return getMonthKey(memories.find((memory) => memory.id === placement.memoryId)?.memoryDate ?? selectedDate);
    };

    const getEditingBackLayer = (placement: EditingPlacement) => {
        const otherLayers = getPlacementLayers(getEditingMonthKey(placement), placement.memoryId);

        return otherLayers.length > 0 ? Math.min(...otherLayers) - 1 : placement.layer;
    };

    const getEditingFrontLayer = (placement: EditingPlacement) => {
        const otherLayers = getPlacementLayers(getEditingMonthKey(placement), placement.memoryId);

        return otherLayers.length > 0 ? Math.max(...otherLayers) + 1 : placement.layer;
    };

    // 날짜 선택
    const handleSelectDate = (date: string) => {
        setActiveObjectId(null);
        setEditingPlacement(null);
        setSelectedDate(date);
        setRoomMonthKey(getMonthKey(date));

        const targetMemory = memories.find(
            (memory) => memory.memoryDate === date && memory.objectKey && memory.objectPosition
        );

        if (bounceStartTimerRef.current !== null) {
            window.clearTimeout(bounceStartTimerRef.current);
        }

        if (bounceEndTimerRef.current !== null) {
            window.clearTimeout(bounceEndTimerRef.current);
        }

        setBouncingObjectId(null);

        if (!targetMemory) {
            return;
        }

        // 날짜 선택 시 해당 날짜의 오브젝트를 잠깐 튕겨 사용자가 방 안 위치를 찾기 쉽게 합니다.
        bounceStartTimerRef.current = window.setTimeout(() => {
            setBouncingObjectId(targetMemory.id);
            bounceStartTimerRef.current = null;

            bounceEndTimerRef.current = window.setTimeout(() => {
                setBouncingObjectId(null);
                bounceEndTimerRef.current = null;
            }, 700);
        }, 0);
    };

    const handleOpenWriteModal = () => {
        closeRoomNotice();
        setActiveObjectId(null);
        setEditingPlacement(null);
        setIsWriteOpen(true);
    };

    const handlePagePointerDown = () => {
        if (activeObjectId) {
            setActiveObjectId(null);
        }
    };

    useEffect(() => {
        return () => {
            if (roomNoticeTimerRef.current !== null) {
                window.clearTimeout(roomNoticeTimerRef.current);
            }

            if (bounceStartTimerRef.current !== null) {
                window.clearTimeout(bounceStartTimerRef.current);
            }

            if (bounceEndTimerRef.current !== null) {
                window.clearTimeout(bounceEndTimerRef.current);
            }
        };
    }, []);

    // 체크 버튼을 누르면 메모리와 오브젝트의 최종 위치를 함께 저장합니다.
    const handleConfirmPlacement = async () => {
        if (isPlacementSaving) {
            return;
        }

        if (editingPlacement) {
            const { memoryId, position, layer } = editingPlacement;

            try {
                setIsPlacementSaving(true);
                const savedMemory = await updateMemoryPosition(memoryId, position, layer);
                const memoryWithPlacement = {
                    ...savedMemory,
                    objectLayer: savedMemory.objectLayer ?? layer,
                    objectPosition: savedMemory.objectPosition ?? position,
                };

                setMemories((prev) => {
                    const nextMemories = prev.map((memory) =>
                        memory.id === memoryId
                            ? memoryWithPlacement
                            : memory,
                    );

                    return normalizeMemoryObjectLayers(nextMemories);
                });

                setPreviewMemory((prev) =>
                    prev && prev.id === memoryId
                        ? memoryWithPlacement
                        : prev,
                );

                setEditingPlacement(null);
                setActiveObjectId(null);
            } catch (error) {
                alert(error instanceof Error ? error.message : "오브젝트 위치를 저장하지 못했습니다.");
            } finally {
                setIsPlacementSaving(false);
            }
            return;
        }

        if (!pendingPlacement) {
            return;
        }

        const { value, position, layer } = pendingPlacement;

        if (memories.some((memory) => memory.memoryDate === value.memoryDate)) {
            showRoomNotice(DUPLICATE_MEMORY_DATE_NOTICE);
            return;
        }

        try {
            setIsPlacementSaving(true);
            const savedMemory = await createMemory({
                memoryDate: value.memoryDate,
                title: value.title ?? "",
                content: value.content,
                moodKey: value.moodKey,
                weatherKey: value.weatherKey,
                objectKey: value.objectKey,
                slotKey: value.objectKey,
                positionX: position.x,
                positionY: position.y,
                layer,
            });

            const memoryWithPlacement = {
                ...savedMemory,
                objectKey: savedMemory.objectKey ?? value.objectKey,
                objectLayer: savedMemory.objectLayer ?? layer,
                objectPosition: savedMemory.objectPosition ?? position,
            };

            setMemories((prev) => normalizeMemoryObjectLayers([
                ...prev,
                memoryWithPlacement,
            ]));

            setPendingPlacement(null);
            setSelectedDate(savedMemory.memoryDate);
            setRoomMonthKey(getMonthKey(savedMemory.memoryDate));
            setActiveObjectId(null);
        } catch (error) {
            showRoomNotice(error instanceof Error ? error.message : "기억 저장에 실패했습니다.");
        } finally {
            setIsPlacementSaving(false);
        }
    };

    const handleCancelPlacement = () => {
        if (isPlacementSaving) {
            return;
        }

        setPendingPlacement(null);
        setEditingPlacement(null);
    };

    const handlePlacementChange = (position: RoomObjectPosition) => {
        setPendingPlacement((prev) => prev ? { ...prev, position } : prev);
        setEditingPlacement((prev) => prev ? { ...prev, position } : prev);
    };

    const handleResetPlacement = () => {
        setEditingPlacement((prev) => prev ? {
            ...prev,
            position: prev.originalPosition,
            layer: prev.originalLayer,
        } : prev);
    };

    const handlePlacementLayerDown = () => {
        setPendingPlacement((prev) => prev ? { ...prev, layer: getPendingBackLayer(prev) } : prev);
        setEditingPlacement((prev) => prev ? { ...prev, layer: getEditingBackLayer(prev) } : prev);
    };

    const handlePlacementLayerUp = () => {
        setPendingPlacement((prev) => prev ? { ...prev, layer: getPendingFrontLayer(prev) } : prev);
        setEditingPlacement((prev) => prev ? { ...prev, layer: getEditingFrontLayer(prev) } : prev);
    };

    const handleStartObjectPlacementEdit = (objectId: string) => {
        const memory = memories.find((item) => item.id === objectId);

        if (!memory?.objectKey || !memory.objectPosition) {
            return;
        }

        setActiveObjectId(null);
        setPendingPlacement(null);
        setPreviewMemory(null);
        // 취소/초기화가 가능하도록 편집 시작 시점의 위치와 레이어를 함께 보관합니다.
        const objectLayer = memory.objectLayer ?? OBJECT_LAYER_MIN;
        setEditingPlacement({
            memoryId: memory.id,
            objectKey: memory.objectKey,
            position: { ...memory.objectPosition },
            layer: objectLayer,
            originalPosition: { ...memory.objectPosition },
            originalLayer: objectLayer,
        });
    };

    const handleUpdateMemory = async (memoryId: string, value: MemoryPreviewUpdate) => {
        try {
            const savedMemory = await updateMemory(memoryId, value);

            setMemories((prev) =>
                normalizeMemoryObjectLayers(prev.map((memory) =>
                    memory.id === memoryId
                        ? {
                            ...savedMemory,
                            objectLayer: savedMemory.objectLayer ?? memory.objectLayer,
                            objectPosition: savedMemory.objectPosition ?? memory.objectPosition,
                        }
                        : memory,
                )),
            );

            setPreviewMemory((prev) =>
                prev && prev.id === memoryId
                    ? {
                        ...savedMemory,
                        objectLayer: savedMemory.objectLayer ?? prev.objectLayer,
                        objectPosition: savedMemory.objectPosition ?? prev.objectPosition,
                    }
                    : prev,
            );
        } catch (error) {
            alert(error instanceof Error ? error.message : "이야기를 수정하지 못했습니다.");
            throw error;
        }
    };

    const handleDeleteMemory = async (memoryId: string) => {
        try {
            await deleteMemory(memoryId);
        } catch (error) {
            alert(error instanceof Error ? error.message : "이야기를 삭제하지 못했습니다.");
            return;
        }

        setMemories((prev) => normalizeMemoryObjectLayers(prev.filter((memory) => memory.id !== memoryId)));
        setPreviewMemory(null);
        setEditingPlacement((prev) => prev?.memoryId === memoryId ? null : prev);
        setActiveObjectId(null);
        setBouncingObjectId(null);

        if (bounceStartTimerRef.current !== null) {
            window.clearTimeout(bounceStartTimerRef.current);
            bounceStartTimerRef.current = null;
        }

        if (bounceEndTimerRef.current !== null) {
            window.clearTimeout(bounceEndTimerRef.current);
            bounceEndTimerRef.current = null;
        }
    };

    return (
        <div className="mw-app min-h-screen flex flex-col select-none" onPointerDown={handlePagePointerDown}>
            <AppHeader />

            {roomNotice && (
                <div className="fixed left-1/2 top-6 z-[120] w-[min(420px,calc(100vw-32px))] -translate-x-1/2">
                    <div className="mw-surface flex items-center gap-3 rounded-xl bg-[#fffbf6f2] px-4 py-3 text-[#5a4632] shadow-xl backdrop-blur-sm">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9] text-[#c86f67]">
                            <CircleAlert size={17} />
                        </span>
                        <p className="min-w-0 flex-1 text-sm leading-5 text-[#c86f67]">{roomNotice.message}</p>
                        <button
                            type="button"
                            onClick={closeRoomNotice}
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#5a4632]/55 hover:bg-[#5a4632]/10 hover:text-[#5a4632]"
                            aria-label="안내 메시지 닫기"
                            title="안내 메시지 닫기"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>
            )}

            {/* <button
                onClick={toggleWeather}
                className="w-[120px] px-3 py-2 bg-[#5a4632] text-white rounded-md hover:bg-[#5a4632]/90"
            >
                날씨: {weather}
            </button> */}

            {/* <button onClick={() => setIsWriteOpen(true)}>
                기록하기
            </button> */}

            {/* BODY AREA */}
            <div className="flex-1 overflow-auto px-6 py-6">

                <div className="mx-auto overflow-hidden" style={{ width: `${stageWidth}px`, height: `${stageHeight}px` }}>
                    <div
                        className="flex h-[630px] w-[1460px] gap-5"
                        style={{
                            transform: `scale(${stageScale})`,
                            transformOrigin: "top left",
                        }}
                    >

                    {/* LEFT CARD */}
                    <div className="w-[320px] shrink-0 flex flex-col gap-4">

                        <div className="h-[360px] bg-[#faf8f2] rounded-2xl border border-[#5a4632]/20 overflow-hidden">
                            <RoomCalendarSidebar
                                selectedDate={selectedDate}
                                onSelectDate={handleSelectDate}
                                memories={memories}
                            />
                        </div>

                        <div className="h-[254px] bg-[#faf8f2] rounded-2xl border border-[#5a4632]/20 overflow-hidden">
                            {isMemoryLoading ? (
                                <section className="flex h-full flex-col rounded-xl p-5 select-none">
                                    <h2 className="text-lg font-normal text-[#5a4632]">
                                        기록을 불러오는 중입니다.
                                    </h2>
                                    <p className="mt-3 text-sm leading-7 text-[#5a4632]/60">
                                        기존 기록을 확인한 뒤 작성할 수 있어요.
                                    </p>
                                </section>
                            ) : memoryLoadError ? (
                                <section className="flex h-full flex-col rounded-xl p-5 select-none">
                                    <h2 className="text-lg font-normal text-[#5a4632]">
                                        기록을 불러오지 못했습니다.
                                    </h2>
                                    <p className="mt-3 text-sm leading-7 text-[#c86f67]">
                                        {memoryLoadError}
                                    </p>
                                </section>
                            ) : (
                                <RoomMemoryPanel
                                    selectedDate={selectedDate}
                                    selectedMemory={selectedMemory}
                                    onWrite={handleOpenWriteModal}
                                    onPreview={() => {
                                        if (selectedMemory) {
                                            setPreviewMemory(selectedMemory);
                                        }
                                    }}
                                // weatherText="맑음"
                                />
                            )}
                        </div>
                    </div>

                    {/* ROOM CARD */}
                    <div className="relative w-[1120px] h-[630px] shrink-0 bg-[#faf8f2] rounded-2xl border border-[#5a4632]/20 overflow-hidden">
                        <div className="pointer-events-none absolute left-3 top-3 z-40 rounded-md border border-[#5a4632]/15 bg-[#fffbf6]/80 px-2 py-1 text-xs text-[#5a4632]/70 shadow-sm backdrop-blur-sm">
                            <span className="font-medium text-[#5a4632]">{roomMonthLabel}의 방</span>
                            <span className="ml-2 text-[#5a4632]/55">{placedRoomObjects.length}개</span>
                        </div>
                        <Room
                            weatherKey={roomWeather}
                            placedObjects={placedRoomObjects}
                            activeObjectId={activeObjectId ?? undefined}
                            bouncingObjectId={bouncingObjectId ?? undefined}
                            onObjectSelect={setActiveObjectId}
                            onObjectPreview={(objectId) => {
                                const memory = memories.find((item) => item.id === objectId);
                                if (memory) {
                                    setActiveObjectId(null);
                                    setPreviewMemory(memory);
                                }
                            }}
                            onObjectEdit={(objectId) => {
                                handleStartObjectPlacementEdit(objectId);
                            }}
                            placementDraft={
                                pendingPlacement
                                    ? {
                                        objectKey: pendingPlacement.value.objectKey,
                                        position: pendingPlacement.position,
                                        layer: pendingPlacement.layer,
                                    }
                                    : editingPlacement
                                        ? {
                                            objectKey: editingPlacement.objectKey,
                                            position: editingPlacement.position,
                                            layer: editingPlacement.layer,
                                        }
                                        : null
                            }
                            onPlacementCancel={handleCancelPlacement}
                            onPlacementChange={handlePlacementChange}
                            onPlacementConfirm={handleConfirmPlacement}
                            onPlacementReset={editingPlacement ? handleResetPlacement : undefined}
                            onPlacementLayerDown={handlePlacementLayerDown}
                            onPlacementLayerUp={handlePlacementLayerUp}
                            isPlacementSaving={isPlacementSaving}
                            placementSavingMessage={
                                editingPlacement
                                    ? "오브젝트 위치를 저장하고 있어요. 잠시만 기다려주세요."
                                    : "이야기를 확인하고 마음의 날씨를 분석하고 있어요. 잠시만 기다려주세요."
                            }
                        />
                        {isRoomLoading && (
                            <div
                                className="absolute inset-0 z-[80] flex items-center justify-center bg-[#faf8f2]/82 backdrop-blur-[1px]"
                                aria-live="polite"
                            >
                                <div className="flex w-[280px] flex-col items-center gap-4 text-[#5a4632]/60">
                                    <div className="relative h-24 w-44">
                                        <span className="absolute bottom-0 left-1/2 h-20 w-20 -translate-x-1/2 rounded-[999px_999px_42%_42%] bg-[#5a4632]/10 shadow-[0_14px_24px_rgba(90,70,50,0.08)] animate-pulse" />
                                        <span className="absolute bottom-2 left-8 h-12 w-12 rounded-[999px_999px_42%_42%] bg-[#9b6b54]/10 shadow-[0_10px_18px_rgba(90,70,50,0.07)] animate-pulse [animation-delay:160ms]" />
                                        <span className="absolute bottom-3 right-7 h-14 w-14 rounded-[999px_999px_42%_42%] bg-white/55 shadow-[0_10px_18px_rgba(90,70,50,0.07)] animate-pulse [animation-delay:320ms]" />
                                    </div>
                                    <p className="text-sm">방을 불러오는 중입니다.</p>
                                </div>
                            </div>
                        )}
                        {/* <div className="pointer-events-none absolute inset-0 z-50 rounded-2xl ring-1 ring-inset ring-[#fffbf6]/40" /> */}
                    </div>

                    </div>
                </div>
            </div>


            {isWriteOpen && (
                <MemoryWriteModal
                    // mode="private"
                    initialDate={selectedDate || getTodayString()}
                    unavailableDates={unavailableMemoryDates}
                    onUnavailableDateSelect={() => showRoomNotice(DUPLICATE_MEMORY_DATE_NOTICE)}
                    onClose={() => setIsWriteOpen(false)}
                    onSave={(value) => {
                        // 바로 저장하지 않고 방 안에서 위치를 정하는 단계로 넘어갑니다.
                        setPendingPlacement({
                            value,
                            position: DEFAULT_OBJECT_POSITION,
                            layer: getNextObjectLayer(value.memoryDate),
                        });
                        setIsWriteOpen(false);
                    }}
                />
            )}

            {previewMemory && (
                <MemoryPreviewModal
                    memory={previewMemory}
                    onUpdate={handleUpdateMemory}
                    onDelete={handleDeleteMemory}
                    onClose={() => setPreviewMemory(null)}
                />
            )}
        </div>
    )
}

export default RoomPage
