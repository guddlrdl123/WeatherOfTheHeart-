import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Footprints, Heart, MapPinned, MoreHorizontal, Power, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROOM_OBJECT_BY_KEY } from "../../constants/roomObjects";
import { useResponsiveStageWidth } from "../../hooks/useResponsiveStageWidth";
import type { Plaza, PlazaEntry } from "../../types/plaza";
import type { RoomObjectPosition } from "../../types/roomObject";
import { createPlazaEntry } from "../../utils/plazaStorage";
import { PlazaSpace } from "./PlazaSpace";
import { PlazaWriteModal, type PlazaWriteValue } from "./PlazaWriteModal";
import { PlazaPreviewModal } from "./PlazaPreviewModal";
import {
  DEFAULT_PLAZA_OBJECT_POSITION,
  OBJECT_LAYER_MIN,
  PLAZA_PAGE_SIZE,
  canEnterPlaza,
  clampObjectLayer,
  getBackgroundLabel,
  getPlazaDescription,
  getPlazaStatusLabel,
  getPlazaEntryLikeCount,
  getPopularPlazaEntries,
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
  isDraftPlaza?: boolean;
  onUpdatePlaza: (updater: (plaza: Plaza) => Plaza) => void;
  onFinalizeDraftPlaza?: (plaza: Plaza) => void;
  onCancelDraftPlaza?: () => void;
  onDeletePlaza: () => void;
};

type PlazaConfirmAction = "close" | "delete";

type PlazaConfirmModalProps = {
  action: PlazaConfirmAction;
  onCancel: () => void;
  onConfirm: () => void;
};

const getEntryLayer = (entry: PlazaEntry) => entry.layer ?? OBJECT_LAYER_MIN;
const PLAZA_LAYOUT_WIDTH = 1460;
const PLAZA_LAYOUT_HEIGHT = 650;

// 광장 종료/삭제처럼 되돌리기 어려운 방장 작업을 확인하는 공통 모달입니다.
function PlazaConfirmModal({ action, onCancel, onConfirm }: PlazaConfirmModalProps) {
  const isDelete = action === "delete";
  const Icon = isDelete ? Trash2 : Power;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/25 px-4 backdrop-blur-[2px]"
      onPointerDown={onCancel}
    >
      <div
        className="w-full max-w-[380px] rounded-xl border border-[#b36a5e]/25 bg-[#fffbf6f2] p-5 text-[#5a4632] shadow-xl"
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
            <p className="mt-1 text-xs leading-6 text-[#5a4632]/65">
              {isDelete
                ? "삭제한 광장은 되돌릴 수 없어요."
                : "종료된 광장은 새 글을 받을 수 없고 구경만 할 수 있어요."}
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

// 광장 오브젝트 레이어를 0부터 다시 매겨 저장값이 정렬 가능한 범위에 머물게 합니다.
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
  isDraftPlaza = false,
  onUpdatePlaza,
  onFinalizeDraftPlaza,
  onCancelDraftPlaza,
  onDeletePlaza,
}: Props) {
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
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);
  // 임시 광장은 입장 즉시 첫 글 모달을 열고, 위치 확정 전까지 저장소에 추가하지 않습니다.
  const [isWriteOpen, setIsWriteOpen] = useState(requiresFirstEntry);
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [previewEntry, setPreviewEntry] = useState<PlazaEntry | null>(null);
  const [entryPage, setEntryPage] = useState(1);
  const [isManagementMenuOpen, setIsManagementMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<PlazaConfirmAction | null>(null);

  const ownEntry = plaza.entries.find((entry) => entry.ownerId === currentGuestId) ?? null;
  const enterable = canEnterPlaza(plaza);
  const unavailableObjectKeys = plaza.entries.map((entry) => entry.objectKey);
  const description = getPlazaDescription(plaza);
  const visiblePlazaEntries = pendingPlacement?.kind === "move"
    ? plaza.entries.filter((entry) => entry.id !== pendingPlacement.entryId)
    : plaza.entries;
  // 사이드 목록은 좋아요 순으로 보여주고, 같은 좋아요 수에서는 작성 순서를 유지합니다.
  const popularEntries = getPopularPlazaEntries(plaza.entries);
  const entryTotalPages = Math.max(1, Math.ceil(popularEntries.length / PLAZA_PAGE_SIZE));
  const safeEntryPage = Math.min(entryPage, entryTotalPages);
  const pagedEntries = popularEntries.slice(
    (safeEntryPage - 1) * PLAZA_PAGE_SIZE,
    safeEntryPage * PLAZA_PAGE_SIZE,
  );
  const getNextObjectLayer = () => {
    // 새 발자취는 기존 오브젝트보다 앞쪽 레이어에서 시작합니다.
    const maxLayer = plaza.entries.reduce(
      (max, entry) => Math.max(max, getEntryLayer(entry)),
      OBJECT_LAYER_MIN - 1,
    );

    return clampObjectLayer(maxLayer + 1);
  };

  function getOtherEntryLayers(placement: PendingPlacement) {
    // 위치 수정 중에는 자기 자신을 제외해야 앞/뒤 이동 기준을 정확히 계산할 수 있습니다.
    return plaza.entries
      .filter((entry) => placement.kind !== "move" || entry.id !== placement.entryId)
      .map(getEntryLayer);
  }

  function getBackLayer(placement: PendingPlacement) {
    const otherLayers = getOtherEntryLayers(placement);

    return clampObjectLayer(otherLayers.length > 0 ? Math.min(...otherLayers) - 1 : placement.layer);
  }

  function getFrontLayer(placement: PendingPlacement) {
    const otherLayers = getOtherEntryLayers(placement);

    return clampObjectLayer(otherLayers.length > 0 ? Math.max(...otherLayers) + 1 : placement.layer);
  }

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  function showEntryObject(entryId: string) {
    setActiveEntryId(entryId);
    setHighlightedEntryId(entryId);

    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }

    // 목록에서 고른 오브젝트가 광장 안에서 잠깐 강조되도록 타이머로 하이라이트를 해제합니다.
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

  function handleConfirmPlacement() {
    if (!pendingPlacement) {
      return;
    }

    const applyConfirmedPlacement = (current: Plaza) => {
      // 새 글 작성과 기존 오브젝트 이동이 같은 확정 버튼을 공유하므로 kind로 분기합니다.
      if (pendingPlacement.kind === "new") {
        const nextEntry = createPlazaEntry({
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
        });
      }

      return normalizePlaza({
        ...current,
        entries: normalizeEntryLayers(
          current.entries.map((entry) => entry.id === pendingPlacement.entryId
            ? {
              ...entry,
              positionX: pendingPlacement.position.x,
              positionY: pendingPlacement.position.y,
              layer: pendingPlacement.layer,
            }
            : entry),
        ),
      });
    };

    if (requiresFirstEntry && pendingPlacement.kind === "new" && onFinalizeDraftPlaza) {
      // 임시 광장은 첫 글 배치가 끝난 뒤에야 실제 광장 목록에 저장됩니다.
      onFinalizeDraftPlaza(applyConfirmedPlacement(plaza));
    } else {
      onUpdatePlaza(applyConfirmedPlacement);
    }

    setPendingPlacement(null);
    setActiveEntryId(null);
  }

  function handleLike(entryId: string) {
    onUpdatePlaza((current) => ({
      ...current,
      entries: current.entries.map((entry) => entry.id === entryId ? togglePlazaEntryLike(entry, currentGuestId) : entry),
    }));

    setPreviewEntry((current) => current?.id === entryId ? togglePlazaEntryLike(current, currentGuestId) : current);
  }

  function handleDeleteEntry(entryId: string) {
    onUpdatePlaza((current) => {
      const targetEntry = current.entries.find((entry) => entry.id === entryId);

      if (!targetEntry || targetEntry.ownerId !== currentGuestId) {
        return current;
      }

      return normalizePlaza({
        ...current,
        entries: normalizeEntryLayers(current.entries.filter((entry) => entry.id !== entryId)),
      });
    });

    setPreviewEntry(null);
    setActiveEntryId(null);
    setHighlightedEntryId(null);
    setPendingPlacement((current) => current?.kind === "move" && current.entryId === entryId ? null : current);
  }

  function openPlazaConfirm(action: PlazaConfirmAction) {
    setIsManagementMenuOpen(false);
    setConfirmAction(action);
  }

  function handleClosePlaza() {
    onUpdatePlaza((current) => ({
      ...current,
      status: "closed",
      endedAt: new Date().toISOString(),
    }));

    setConfirmAction(null);
  }

  function handleDeletePlaza() {
    setConfirmAction(null);
    onDeletePlaza();
  }

  function handleConfirmPlazaAction() {
    if (confirmAction === "close") {
      handleClosePlaza();
      return;
    }

    if (confirmAction === "delete") {
      handleDeletePlaza();
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
    if (requiresFirstEntry) {
      onCancelDraftPlaza?.();
      return;
    }

    setIsWriteOpen(false);
  }

  function handlePlacementCancel() {
    if (requiresFirstEntry && pendingPlacement?.kind === "new") {
      setPendingPlacement(null);
      onCancelDraftPlaza?.();
      return;
    }

    setPendingPlacement(null);
  }

  function handleBackToList() {
    if (isDraftPlaza) {
      onCancelDraftPlaza?.();
      return;
    }

    navigate("/plaza");
  }

  return (
    <main className="min-h-0 flex-1 overflow-auto px-6 py-6">
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
                        {plaza.status === "open" && (
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
                  disabled={requiresFirstEntry || !enterable || Boolean(ownEntry) || Boolean(pendingPlacement)}
                  onClick={() => setIsWriteOpen(true)}
                  className="mw-button-solid inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm disabled:opacity-45"
                >
                  < Footprints size={16} />
                  발자취 남기기
                </button>
                {ownEntry && (
                  <button
                    type="button"
                    onClick={showMyObject}
                    className="mw-button inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm"
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
                {pagedEntries.length > 0 ? (
                  pagedEntries.map((entry, index) => {
                    const object = ROOM_OBJECT_BY_KEY[entry.objectKey];
                    const rank = (safeEntryPage - 1) * PLAZA_PAGE_SIZE + index + 1;
                    const likeCount = getPlazaEntryLikeCount(entry);

                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => showEntryObject(entry.id)}
                        className="grid grid-cols-[24px_38px_1fr_auto] items-center gap-2 rounded-md border border-[#5a4632]/12 bg-white/30 px-3 py-2 text-left text-xs text-[#5a4632]/70 transition hover:bg-white/55"
                      >
                        <span className="text-center text-sm text-[#5a4632]/55">{rank === 1 ? "☀️" : rank}</span>
                        <span className="grid h-9 w-9 place-items-center rounded-md border border-[#5a4632]/10 bg-white/35">
                          <img src={object.image} alt="" className="h-7 w-7 object-contain" />
                        </span>
                        <span className="min-w-0 truncate text-sm text-[#5a4632]">
                          {entry.title || "어느 나그네의 발자취"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-[#b65f55]">
                          <Heart size={12} fill={likeCount > 0 ? "currentColor" : "none"} />
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
              {popularEntries.length > PLAZA_PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={safeEntryPage === 1}
                    onClick={() => setEntryPage((page) => Math.max(1, page - 1))}
                    className="grid h-8 w-8 place-items-center rounded-md border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/70 transition hover:bg-white/60 disabled:opacity-35"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="min-w-[64px] text-center text-xs text-[#5a4632]/60">
                    {safeEntryPage} / {entryTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeEntryPage === entryTotalPages}
                    onClick={() => setEntryPage((page) => Math.min(entryTotalPages, page + 1))}
                    className="grid h-8 w-8 place-items-center rounded-md border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/70 transition hover:bg-white/60 disabled:opacity-35"
                    aria-label="Next page"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
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
              onEntryMove={(entryId) => {
                const entry = plaza.entries.find((item) => item.id === entryId);
                if (entry && entry.ownerId === currentGuestId) {
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
            />
          </section>
        </div>
      </div>

      {isWriteOpen && (
        <PlazaWriteModal
          unavailableObjectKeys={unavailableObjectKeys}
          allowDuplicateObjects={plaza.allowDuplicateObjects}
          modalTitle={requiresFirstEntry ? "글을 남겨 방을 생성해주세요." : undefined}
          guideMessage={requiresFirstEntry ? "첫 글과 오브젝트 배치가 완료되어야 광장이 최종 생성됩니다." : undefined}
          onClose={handleWriteClose}
          onSave={(value) => {
            setIsWriteOpen(false);
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
          onDelete={previewEntry.ownerId === currentGuestId ? handleDeleteEntry : undefined}
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
