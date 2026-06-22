import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleAlert, Copy, Footprints, Heart, MapPinned, MoreHorizontal, Power, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROOM_OBJECT_BY_KEY } from "../../constants/roomObjects";
import { useRoomObjectCatalog } from "../../hooks/useRoomObjectCatalog";
import { useResponsiveStageWidth } from "../../hooks/useResponsiveStageWidth";
import type { Plaza, PlazaEntry } from "../../types/plaza";
import type { RoomObjectPosition } from "../../types/roomObject";
import { createPlazaEntry } from "../../utils/plazaStorage";
import { PlazaSpace } from "./PlazaSpace";
import { PlazaWriteModal, type PlazaWriteValue } from "./PlazaWriteModal";
import { PlazaPreviewModal, type PlazaPreviewUpdate } from "./PlazaPreviewModal";
import {
  DEFAULT_PLAZA_OBJECT_POSITION,
  OBJECT_LAYER_MIN,
  canEnterPlaza,
  getBackgroundLabel,
  getPlazaDescription,
  getPlazaStatusLabel,
  getPlazaEntryLikeCount,
  getPopularPlazaEntries,
  hasLikedPlazaEntry,
  isPlazaFull,
  normalizePlaza,
  togglePlazaEntryLike,
} from "./plazaHelpers";

type PendingPlacement =
  | {
    kind: "new";
    value: PlazaWriteValue;
    position: RoomObjectPosition;
    layer: number;
  }
  | {
    kind: "move";
    entryId: string;
    objectKey: PlazaEntry["objectKey"];
    position: RoomObjectPosition;
    layer: number;
    originalPosition: RoomObjectPosition;
    originalLayer: number;
  };

type Props = {
  plaza: Plaza;
  currentGuestId: string;
  currentGuestIsAdmin?: boolean;
  isDraftPlaza?: boolean;
  onUpdatePlaza: (updater: (plaza: Plaza) => Plaza) => void;
  onFinalizeDraftPlaza?: (value: PlazaWriteValue, position: RoomObjectPosition, layer: number) => Promise<void>;
  onCancelDraftPlaza?: () => void;
  onDeletePlaza: () => Promise<void>;
  onCompletePlaza?: () => Promise<void>;
  onCreateEntry?: (value: PlazaWriteValue, position: RoomObjectPosition, layer: number) => Promise<PlazaEntry>;
  onToggleEntryLike?: (entryId: string) => Promise<PlazaEntry>;
  onUpdateEntry?: (entryId: string, value: PlazaPreviewUpdate) => Promise<PlazaEntry>;
  onUpdateEntryPosition?: (entryId: string, position: RoomObjectPosition, layer: number) => Promise<PlazaEntry>;
  onDeleteEntry?: (entryId: string) => Promise<void>;
};

type PlazaConfirmAction = "close" | "delete";

type PlazaConfirmModalProps = {
  action: PlazaConfirmAction;
  onCancel: () => void;
  onConfirm: () => void;
};

type PlazaNotice = {
  message: string;
  tone: "success" | "error";
};

const getEntryLayer = (entry: PlazaEntry) => entry.layer ?? OBJECT_LAYER_MIN;
const PLAZA_LAYOUT_WIDTH = 1460;
const PLAZA_LAYOUT_HEIGHT = 650;
const PLAZA_COMPLETION_NOTICE = "광장이 종료되었습니다. 우편함으로 사진이 발송됩니다.";

function PlazaConfirmModal({ action, onCancel, onConfirm }: PlazaConfirmModalProps) {
  const isDelete = action === "delete";
  const Icon = isDelete ? Trash2 : Power;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/25 px-4 py-8 backdrop-blur-[2px]"
      onPointerDown={onCancel}
    >
      <div
        className="w-full max-w-[420px] max-h-[calc(100vh-64px)] overflow-y-auto rounded-xl border border-[#b36a5e]/25 bg-[#fffbf6f2] p-5 text-[#5a4632] shadow-xl"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9] text-[#b36a5e]">
            <Icon size={17} />
          </div>
          <div>
            <h4 className="text-base font-semibold text-[#5a4632]">
              {isDelete ? "광장을 삭제할까요?" : "광장을 종료할까요?"}
            </h4>
            <p className="mt-1 text-xs whitespace-pre-line leading-6 text-[#5a4632]/65">
              {isDelete
                ? "삭제한 광장은 되돌릴 수 없어요."
                : "종료된 광장은 더 이상 발자취를 남길 수 없고 구경만 할 수 있어요."}
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
            {isDelete ? "삭제" : "종료"}
          </button>
        </div>
      </div>
    </div>
  );
}

function normalizeEntryLayers(entries: PlazaEntry[]) {
  const layerById = new Map<string, number>();

  entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => getEntryLayer(a.entry) - getEntryLayer(b.entry) || a.index - b.index)
    .forEach(({ entry }, layer) => {
      layerById.set(entry.id, layer);
    });

  return entries.map((entry) => ({
    ...entry,
    layer: layerById.get(entry.id) ?? getEntryLayer(entry),
  }));
}

export function PlazaRoomPage({
  plaza,
  currentGuestId,
  currentGuestIsAdmin = false,
  isDraftPlaza = false,
  onUpdatePlaza,
  onFinalizeDraftPlaza,
  onCancelDraftPlaza,
  onDeletePlaza,
  onCompletePlaza,
  onCreateEntry,
  onToggleEntryLike,
  onUpdateEntry,
  onUpdateEntryPosition,
  onDeleteEntry,
}: Props) {
  useRoomObjectCatalog();

  const navigate = useNavigate();
  const owner = plaza.ownerId === currentGuestId;
  const requiresFirstEntry = isDraftPlaza && owner && plaza.entries.length === 0;
  const stageWidth = useResponsiveStageWidth({
    designWidth: PLAZA_LAYOUT_WIDTH,
    designHeight: PLAZA_LAYOUT_HEIGHT,
  });
  const stageScale = stageWidth / PLAZA_LAYOUT_WIDTH;
  const stageHeight = PLAZA_LAYOUT_HEIGHT * stageScale;
  const highlightTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);
  // 임시 광장은 입장 즉시 첫 글 모달을 열고, 위치 확정 전까지 저장소에 추가하지 않습니다.
  const [isWriteOpen, setIsWriteOpen] = useState(requiresFirstEntry);
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [previewEntry, setPreviewEntry] = useState<PlazaEntry | null>(null);
  const [isPlacementSaving, setIsPlacementSaving] = useState(false);
  const [likingEntryIds, setLikingEntryIds] = useState<Set<string>>(() => new Set());
  const [isManagementMenuOpen, setIsManagementMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<PlazaConfirmAction | null>(null);
  const [plazaNotice, setPlazaNotice] = useState<PlazaNotice | null>(null);

  const plazaEnded = plaza.status === "closed" || isPlazaFull(plaza);
  const ownEntry = plaza.entries.find((entry) => entry.ownerId === currentGuestId) ?? null;
  const canUpdateEntry = (entry: PlazaEntry) => !plazaEnded && entry.ownerId === currentGuestId && entry.ownerId === plaza.ownerId;
  const canMoveEntry = (entry: PlazaEntry) => !plazaEnded && entry.ownerId === currentGuestId;
  const canDeleteEntry = (entry: PlazaEntry) => !plazaEnded && entry.ownerId === currentGuestId && entry.ownerId !== plaza.ownerId;
  const enterable = canEnterPlaza(plaza);
  const canBypassEntryLimits = currentGuestIsAdmin;
  const unavailableObjectKeys = canBypassEntryLimits ? [] : plaza.entries.map((entry) => entry.objectKey);
  const allowDuplicateObjectSelection = canBypassEntryLimits || plaza.allowDuplicateObjects;
  const description = getPlazaDescription(plaza);
  const visiblePlazaEntries = pendingPlacement?.kind === "move"
    ? plaza.entries.filter((entry) => entry.id !== pendingPlacement.entryId)
    : plaza.entries;
  const popularEntries = getPopularPlazaEntries(plaza.entries);
  const willCompleteAfterNewEntry = () => {
    const currentEntryCount = plaza.entryCount ?? plaza.entries.length;

    return plaza.maxParticipants > 0 && currentEntryCount + 1 >= plaza.maxParticipants;
  };
  const getNextObjectLayer = () => {
    // 광장은 최대 30개 오브젝트가 들어올 수 있으므로 레이어를 고정 상한으로 자르지 않습니다.
    const maxLayer = plaza.entries.reduce(
      (max, entry) => Math.max(max, getEntryLayer(entry)),
      OBJECT_LAYER_MIN - 1,
    );

    return maxLayer + 1;
  };

  function getOtherEntryLayers(placement: PendingPlacement) {
    return plaza.entries
      .filter((entry) => placement.kind !== "move" || entry.id !== placement.entryId)
      .map(getEntryLayer);
  }

  function getBackLayer(placement: PendingPlacement) {
    const otherLayers = getOtherEntryLayers(placement);

    return otherLayers.length > 0 ? Math.min(...otherLayers) - 1 : placement.layer;
  }

  function getFrontLayer(placement: PendingPlacement) {
    const otherLayers = getOtherEntryLayers(placement);

    return otherLayers.length > 0 ? Math.max(...otherLayers) + 1 : placement.layer;
  }

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }

      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  function showPlazaNotice(message: string, tone: PlazaNotice["tone"] = "success") {
    setPlazaNotice({ message, tone });

    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setPlazaNotice(null);
      noticeTimerRef.current = null;
    }, 3500);
  }

  function showCompletionNotice() {
    showPlazaNotice(PLAZA_COMPLETION_NOTICE);
  }

  function closePlazaNotice() {
    setPlazaNotice(null);

    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }

  function showEntryObject(entryId: string) {
    if (pendingPlacement || isPlacementSaving) {
      return;
    }

    setActiveEntryId(entryId);
    setHighlightedEntryId(entryId);

    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedEntryId(null);
      highlightTimerRef.current = null;
    }, 800);
  }

  function showMyObject() {
    if (ownEntry) {
      showEntryObject(ownEntry.id);
    }
  }

  async function handleConfirmPlacement() {
    if (!pendingPlacement || isPlacementSaving) {
      return;
    }

    const shouldShowCompletionNotice = pendingPlacement.kind === "new" && willCompleteAfterNewEntry();

    const applyConfirmedPlacement = (current: Plaza, savedEntry?: PlazaEntry, movedEntry?: PlazaEntry) => {
      if (pendingPlacement.kind === "new") {
        const nextEntry = savedEntry ?? createPlazaEntry({
          title: pendingPlacement.value.title,
          content: pendingPlacement.value.content,
          objectKey: pendingPlacement.value.objectKey,
          positionX: pendingPlacement.position.x,
          positionY: pendingPlacement.position.y,
          layer: pendingPlacement.layer,
        });

        return normalizePlaza({
          ...current,
          entries: normalizeEntryLayers([...current.entries, nextEntry]),
          entryCount: (current.entryCount ?? current.entries.length) + 1,
        });
      }

      return normalizePlaza({
        ...current,
        entries: normalizeEntryLayers(
          current.entries.map((entry) => entry.id === pendingPlacement.entryId
            ? {
              ...entry,
              positionX: movedEntry?.positionX ?? pendingPlacement.position.x,
              positionY: movedEntry?.positionY ?? pendingPlacement.position.y,
              layer: movedEntry?.layer ?? pendingPlacement.layer,
            }
            : entry),
        ),
      });
    };

    if (requiresFirstEntry && pendingPlacement.kind === "new" && onFinalizeDraftPlaza) {
      try {
        setIsPlacementSaving(true);
        await onFinalizeDraftPlaza(pendingPlacement.value, pendingPlacement.position, pendingPlacement.layer);
      } catch (caughtError) {
        window.alert(caughtError instanceof Error ? caughtError.message : "첫 글과 함께 광장을 생성하지 못했습니다.");
        return;
      } finally {
        setIsPlacementSaving(false);
      }
    } else if (pendingPlacement.kind === "new" && onCreateEntry) {
      try {
        setIsPlacementSaving(true);
        const savedEntry = await onCreateEntry(pendingPlacement.value, pendingPlacement.position, pendingPlacement.layer);

        onUpdatePlaza((current) => applyConfirmedPlacement(current, savedEntry));
      } catch (caughtError) {
        window.alert(caughtError instanceof Error ? caughtError.message : "광장 글을 저장하지 못했습니다.");
        return;
      } finally {
        setIsPlacementSaving(false);
      }
    } else if (pendingPlacement.kind === "move" && onUpdateEntryPosition) {
      try {
        setIsPlacementSaving(true);
        const updatedEntry = await onUpdateEntryPosition(
          pendingPlacement.entryId,
          pendingPlacement.position,
          pendingPlacement.layer,
        );

        onUpdatePlaza((current) => applyConfirmedPlacement(current, undefined, updatedEntry));
      } catch (caughtError) {
        window.alert(caughtError instanceof Error ? caughtError.message : "오브젝트 위치를 저장하지 못했습니다.");
        return;
      } finally {
        setIsPlacementSaving(false);
      }
    } else {
      onUpdatePlaza((current) => applyConfirmedPlacement(current));
    }

    setPendingPlacement(null);
    setActiveEntryId(null);

    if (shouldShowCompletionNotice) {
      showCompletionNotice();
    }
  }

  async function handleLike(entryId: string) {
    if (likingEntryIds.has(entryId)) {
      return;
    }

    if (!onToggleEntryLike) {
      onUpdatePlaza((current) => ({
        ...current,
        entries: current.entries.map((entry) => entry.id === entryId ? togglePlazaEntryLike(entry, currentGuestId) : entry),
      }));

      setPreviewEntry((current) => current?.id === entryId ? togglePlazaEntryLike(current, currentGuestId) : current);
      return;
    }

    try {
      setLikingEntryIds((current) => new Set(current).add(entryId));
      const likedEntry = await onToggleEntryLike(entryId);

      onUpdatePlaza((current) => ({
        ...current,
        entries: current.entries.map((entry) => entry.id === entryId
          ? {
            ...entry,
            likes: likedEntry.likes,
            likedGuestIds: likedEntry.likedGuestIds,
          }
          : entry),
      }));

      setPreviewEntry((current) => current?.id === entryId
        ? {
          ...current,
          likes: likedEntry.likes,
          likedGuestIds: likedEntry.likedGuestIds,
        }
        : current);
    } catch (caughtError) {
      window.alert(caughtError instanceof Error ? caughtError.message : "좋아요를 반영하지 못했습니다.");
    } finally {
      setLikingEntryIds((current) => {
        const next = new Set(current);
        next.delete(entryId);
        return next;
      });
    }
  }

  async function handleUpdateEntry(entryId: string, value: PlazaPreviewUpdate) {
    if (!onUpdateEntry) {
      onUpdatePlaza((current) => ({
        ...current,
        entries: current.entries.map((entry) => entry.id === entryId && canUpdateEntry(entry)
          ? {
            ...entry,
            title: value.title,
            content: value.content,
          }
          : entry),
      }));

      setPreviewEntry((current) => current?.id === entryId
        ? {
          ...current,
          title: value.title,
          content: value.content,
        }
        : current);
      return;
    }

    try {
      const updatedEntry = await onUpdateEntry(entryId, value);

      onUpdatePlaza((current) => ({
        ...current,
        entries: current.entries.map((entry) => entry.id === entryId
          ? {
            ...entry,
            title: updatedEntry.title,
            content: updatedEntry.content,
            likes: updatedEntry.likes,
            likedGuestIds: updatedEntry.likedGuestIds,
          }
          : entry),
      }));

      setPreviewEntry((current) => current?.id === entryId
        ? {
          ...current,
          title: updatedEntry.title,
          content: updatedEntry.content,
          likes: updatedEntry.likes,
          likedGuestIds: updatedEntry.likedGuestIds,
        }
        : current);
    } catch (caughtError) {
      window.alert(caughtError instanceof Error ? caughtError.message : "광장 글을 수정하지 못했습니다.");
    }
  }

  async function handleDeleteEntry(entryId: string) {
    const removeEntry = () => onUpdatePlaza((current) => {
      const targetEntry = current.entries.find((entry) => entry.id === entryId);

      // 광장장의 첫 오브젝트는 빈 광장 방지를 위해 삭제하지 않고 글 수정만 허용합니다.
      if (!targetEntry || !canDeleteEntry(targetEntry)) {
        return current;
      }

      const nextEntries = normalizeEntryLayers(current.entries.filter((entry) => entry.id !== entryId));

      return normalizePlaza({
        ...current,
        entries: nextEntries,
        entryCount: nextEntries.length,
      });
    });

    if (onDeleteEntry) {
      try {
        await onDeleteEntry(entryId);
      } catch (caughtError) {
        window.alert(caughtError instanceof Error ? caughtError.message : "광장 글을 삭제하지 못했습니다.");
        return;
      }
    }

    removeEntry();
    setPreviewEntry(null);
    setActiveEntryId(null);
    setHighlightedEntryId(null);
    setPendingPlacement((current) => current?.kind === "move" && current.entryId === entryId ? null : current);
  }

  function openPlazaConfirm(action: PlazaConfirmAction) {
    setIsManagementMenuOpen(false);
    setConfirmAction(action);
  }

  async function handleClosePlaza() {
    try {
      await onCompletePlaza?.();
      onUpdatePlaza((current) => ({
        ...current,
        status: "closed",
        endedAt: new Date().toISOString(),
      }));

      setConfirmAction(null);
      if (owner) {
        showCompletionNotice();
      }
    } catch {
      window.alert("광장을 종료하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  async function handleDeletePlaza() {
    try {
      await onDeletePlaza();
      setConfirmAction(null);
    } catch (caughtError) {
      setConfirmAction(null);
      showPlazaNotice(
        caughtError instanceof Error ? caughtError.message : "광장을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.",
        "error",
      );
    }
  }

  function handleConfirmPlazaAction() {
    if (confirmAction === "close") {
      void handleClosePlaza();
      return;
    }

    if (confirmAction === "delete") {
      void handleDeletePlaza();
    }
  }

  function handlePlacementReset() {
    setPendingPlacement((current) =>
      current?.kind === "move"
        ? {
          ...current,
          position: current.originalPosition,
          layer: current.originalLayer,
        }
        : current,
    );
  }

  function handlePlacementLayerDown() {
    setPendingPlacement((current) => current ? {
      ...current,
      layer: getBackLayer(current),
    } : current);
  }

  function handlePlacementLayerUp() {
    setPendingPlacement((current) => current ? {
      ...current,
      layer: getFrontLayer(current),
    } : current);
  }

  function handleWriteClose() {
    if (isPlacementSaving) {
      return;
    }

    if (requiresFirstEntry) {
      onCancelDraftPlaza?.();
      return;
    }

    setIsWriteOpen(false);
  }

  function handlePlacementCancel() {
    if (isPlacementSaving) {
      return;
    }

    if (requiresFirstEntry && pendingPlacement?.kind === "new") {
      setPendingPlacement(null);
      onCancelDraftPlaza?.();
      return;
    }

    setPendingPlacement(null);
  }

  function handleBackToList() {
    if (isPlacementSaving) {
      return;
    }

    if (isDraftPlaza) {
      onCancelDraftPlaza?.();
      return;
    }

    navigate("/plaza");
  }

  return (
    <main className="min-h-0 flex-1 overflow-auto px-6 py-6">
      {plazaNotice && (
        <div className="fixed left-1/2 top-6 z-[120] w-[min(420px,calc(100vw-32px))] -translate-x-1/2">
          <div className="mw-surface flex items-start gap-3 rounded-xl bg-[#fffbf6f2] px-4 py-3 text-[#5a4632] shadow-xl backdrop-blur-sm">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border ${plazaNotice.tone === "error"
                ? "border-[#b36a5e]/30 bg-[#f4dfd9] text-[#c86f67]"
                : "border-[#7c9b78]/30 bg-[#edf5e7] text-[#5f875b]"
                }`}>
                {plazaNotice.tone === "error" ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}
              </span>
              <p className={`min-w-0 flex-1 text-sm leading-6 ${plazaNotice.tone === "error" ? "text-[#c86f67]" : ""}`}>{plazaNotice.message}</p>
            </div>
            <button
              type="button"
              onClick={closePlazaNotice}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#5a4632]/55 hover:bg-[#5a4632]/10 hover:text-[#5a4632]"
              aria-label="\uC548\uB0B4 \uBA54\uC2DC\uC9C0 \uB2EB\uAE30"
              title="\uC548\uB0B4 \uBA54\uC2DC\uC9C0 \uB2EB\uAE30"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto overflow-hidden" style={{ width: `${stageWidth}px`, height: `${stageHeight}px` }}>
        <div
          className="flex h-[650px] w-[1460px] gap-5"
          style={{
            transform: `scale(${stageScale})`,
            transformOrigin: "top left",
          }}
        >
          <aside className="flex h-[650px] w-[320px] shrink-0 flex-col gap-4">
            <section className="mw-surface relative rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <h1 className="min-w-0 truncate text-xl font-normal text-[#5a4632]">{plaza.topic}</h1>
                {owner && !isDraftPlaza && (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsManagementMenuOpen((value) => !value)}
                      className="grid h-8 w-8 place-items-center rounded-md border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/70 hover:bg-white/60"
                      aria-label="광장 관리 메뉴"
                      title="광장 관리 메뉴"
                    >
                      <MoreHorizontal size={17} />
                    </button>
                    {isManagementMenuOpen && (
                      <div className="absolute right-0 top-[calc(100%+6px)] z-40 flex w-[132px] flex-col rounded-md border border-[#5a4632]/15 bg-[#fffbf6f2] p-1 text-xs text-[#5a4632] shadow-lg backdrop-blur-sm">
                        {!plazaEnded && (
                          <button
                            type="button"
                            onClick={() => openPlazaConfirm("close")}
                            className="inline-flex items-center gap-2 rounded px-3 py-2 text-left hover:bg-[#5a4632]/10"
                          >
                            <Power size={12} />
                            광장 종료
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openPlazaConfirm("delete")}
                          className="inline-flex items-center gap-2 rounded px-3 py-2 text-left text-[#9a4f48] hover:bg-[#5a4632]/10"
                        >
                          <Trash2 size={12} />
                          광장 삭제
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[0.68rem] text-[#5a4632]/65">
                <span className="rounded-full border border-[#5a4632]/12 bg-white/30 px-2 py-1">
                  배경 {getBackgroundLabel(plaza.background)}
                </span>
                <span className="rounded-full border border-[#5a4632]/12 bg-white/30 px-2 py-1">
                  인원 {plaza.entries.length}/{plaza.maxParticipants}
                </span>
                <span className="rounded-full border border-[#5a4632]/12 bg-white/30 px-2 py-1">
                  {getPlazaStatusLabel(plaza)}
                </span>
                <span className="rounded-full border border-[#5a4632]/12 bg-white/30 px-2 py-1">
                  오브젝트 중복 {plaza.allowDuplicateObjects ? "허용" : "금지"}
                </span>
                {plaza.inviteCode && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#5a4632]/12 bg-white/30 px-2 py-1">
                    초대 {plaza.inviteCode}
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard?.writeText(plaza.inviteCode ?? "")}
                      className="grid h-4 w-4 place-items-center rounded text-[#5a4632]/55 hover:bg-[#5a4632]/10 hover:text-[#5a4632]"
                      aria-label="초대 코드 복사"
                      title="초대 코드 복사"
                    >
                      <Copy size={11} />
                    </button>
                  </span>
                )}
              </div>

              {description && (
                <p className="mt-4 max-h-[112px] overflow-y-auto rounded-md border border-[#5a4632]/10 bg-white/25 p-3 whitespace-pre-wrap text-sm leading-7 text-[#5a4632]/68">
                  {description}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={requiresFirstEntry || !enterable || (!canBypassEntryLimits && Boolean(ownEntry)) || Boolean(pendingPlacement) || isPlacementSaving}
                  onClick={() => setIsWriteOpen(true)}
                  className="mw-button-solid inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-45"
                >
                  <Footprints size={16} />
                  발자취 남기기
                </button>
                {ownEntry && (
                  <button
                    type="button"
                    onClick={showMyObject}
                    className="mw-button inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm"
                  >
                    <MapPinned size={16} />
                    내 오브젝트 보기
                  </button>
                )}
              </div>
            </section>

            <section className="mw-surface flex min-h-0 flex-1 flex-col rounded-xl p-5">
              <div className="mb-3 flex items-center justify-between gap-2 text-sm text-[#5a4632]">
                <span>나그네의 발자취</span>
                <span className="text-xs text-[#5a4632]/45">{plaza.entries.length}</span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {popularEntries.length > 0 ? (
                  popularEntries.map((entry, index) => {
                    const object = ROOM_OBJECT_BY_KEY[entry.objectKey];
                    const rank = index + 1;
                    const likeCount = getPlazaEntryLikeCount(entry);
                    const likedByCurrentGuest = hasLikedPlazaEntry(entry, currentGuestId);

                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => showEntryObject(entry.id)}
                        disabled={Boolean(pendingPlacement) || isPlacementSaving}
                        className="grid grid-cols-[24px_38px_1fr_auto] items-center gap-2 rounded-md border border-[#5a4632]/12 bg-white/30 px-3 py-2 text-left text-xs text-[#5a4632]/70 transition hover:bg-white/55 disabled:cursor-default disabled:opacity-55 disabled:hover:bg-white/30"
                      >
                        <span className="text-center text-sm text-[#5a4632]/55">{rank === 1 ? "☀️" : rank}</span>
                        <span className="grid h-9 w-9 place-items-center rounded-md border border-[#5a4632]/10 bg-white/35">
                          <img src={object.image} alt="" className="h-7 w-7 object-contain" />
                        </span>
                        <span className="min-w-0 truncate text-sm text-[#5a4632]">
                          {entry.title || "어느 나그네의 발자취"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-[#b65f55]">
                          <Heart size={12} fill={likedByCurrentGuest ? "currentColor" : "none"} />
                          {likeCount}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="grid flex-1 place-items-center px-3 text-center text-xs leading-6 text-[#5a4632]/50">
                    아직 남겨진 발자취가 없어요.
                  </p>
                )}
              </div>
            </section>
            <button
              type="button"
              onClick={handleBackToList}
              className="mw-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm"
            >
              <ArrowLeft size={16} />
              목록으로
            </button>
          </aside>

          <section className="h-[650px] w-[1120px] shrink-0 overflow-hidden rounded-xl border border-[#5a4632]/20 bg-[#faf8f2]">
            <PlazaSpace
              background={plaza.background}
              entries={visiblePlazaEntries}
              activeEntryId={activeEntryId ?? undefined}
              highlightedEntryId={highlightedEntryId ?? undefined}
              currentGuestId={currentGuestId}
              placementDraft={pendingPlacement ? {
                objectKey: pendingPlacement.kind === "new" ? pendingPlacement.value.objectKey : pendingPlacement.objectKey,
                position: pendingPlacement.position,
                layer: pendingPlacement.layer,
              } : null}
              onEntrySelect={setActiveEntryId}
              onEntryPreview={(entryId) => {
                const entry = plaza.entries.find((item) => item.id === entryId);
                if (entry) {
                  setActiveEntryId(null);
                  setPreviewEntry(entry);
                }
              }}
              onEntryLike={handleLike}
              canMoveEntry={canMoveEntry}
              onEntryMove={(entryId) => {
                const entry = plaza.entries.find((item) => item.id === entryId);
                if (entry && canMoveEntry(entry)) {
                  setPendingPlacement({
                    kind: "move",
                    entryId,
                    objectKey: entry.objectKey,
                    position: { x: entry.positionX, y: entry.positionY },
                    layer: entry.layer ?? OBJECT_LAYER_MIN,
                    originalPosition: { x: entry.positionX, y: entry.positionY },
                    originalLayer: entry.layer ?? OBJECT_LAYER_MIN,
                  });
                  setActiveEntryId(null);
                }
              }}
              onPlacementCancel={handlePlacementCancel}
              onPlacementChange={(position) => {
                setPendingPlacement((current) => current ? { ...current, position } : current);
              }}
              onPlacementConfirm={handleConfirmPlacement}
              onPlacementReset={pendingPlacement?.kind === "move" ? handlePlacementReset : undefined}
              onPlacementLayerDown={handlePlacementLayerDown}
              onPlacementLayerUp={handlePlacementLayerUp}
              isPlacementSaving={isPlacementSaving}
            />
          </section>
        </div>
      </div>

      {isWriteOpen && (
        <PlazaWriteModal
          unavailableObjectKeys={unavailableObjectKeys}
          allowDuplicateObjects={allowDuplicateObjectSelection}
          modalTitle={requiresFirstEntry ? "글을 남겨 방을 생성해주세요." : undefined}
          guideMessage={requiresFirstEntry ? "첫 글과 오브젝트 배치가 완료되어야 광장이 최종 생성됩니다." : undefined}
          onClose={handleWriteClose}
          onSave={(value) => {
            setIsWriteOpen(false);
            setActiveEntryId(null);
            setPendingPlacement({
              kind: "new",
              value,
              position: DEFAULT_PLAZA_OBJECT_POSITION,
              layer: getNextObjectLayer(),
            });
          }}
        />
      )}

      {previewEntry && (
        <PlazaPreviewModal
          entry={previewEntry}
          currentGuestId={currentGuestId}
          onClose={() => setPreviewEntry(null)}
          onUpdate={canUpdateEntry(previewEntry) ? handleUpdateEntry : undefined}
          onDelete={canDeleteEntry(previewEntry) ? handleDeleteEntry : undefined}
        />
      )}

      {confirmAction && (
        <PlazaConfirmModal
          action={confirmAction}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirmPlazaAction}
        />
      )}
    </main>
  );
}
