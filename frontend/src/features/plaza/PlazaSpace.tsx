import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Check, Heart, Loader2, RotateCcw, X } from "lucide-react";
import { ROOM_OBJECT_BY_KEY } from "../../constants/roomObjects";
import { WEATHER_BY_KEY } from "../../constants/weather";
import type { PlazaBackground, PlazaEntry, PlazaWeatherKey } from "../../types/plaza";
import type { RoomObjectKey, RoomObjectPosition } from "../../types/roomObject";
import SnowWeather from "../weathers/SnowWeather";
import Weather from "../weathers/Weather";
import { getPlazaEntryLikeCount, hasLikedPlazaEntry } from "./plazaHelpers";

type PlacementDraft = {
  objectKey: RoomObjectKey;
  position: RoomObjectPosition;
  layer?: number;
};

type DragOffset = {
  x: number;
  y: number;
};

type EntryHitCandidate = {
  id: string;
  index: number;
  layer: number;
};

type HoverTooltip = {
  id: string;
  label: string;
  x: number;
  y: number;
  placement: "above" | "below";
};

type Props = {
  background: PlazaBackground;
  entries: PlazaEntry[];
  activeEntryId?: string;
  highlightedEntryId?: string;
  currentGuestId: string;
  placementDraft?: PlacementDraft | null;
  onEntrySelect: (entryId: string | null) => void;
  onEntryPreview: (entryId: string) => void;
  onEntryLike: (entryId: string) => void;
  onEntryMove: (entryId: string) => void;
  canMoveEntry?: (entry: PlazaEntry) => boolean;
  onPlacementCancel: () => void;
  onPlacementChange: (position: RoomObjectPosition) => void;
  onPlacementConfirm: () => void;
  onPlacementReset?: () => void;
  onPlacementLayerDown?: () => void;
  onPlacementLayerUp?: () => void;
  isPlacementSaving?: boolean;
};

type SharedPlazaWeatherKey = Exclude<PlazaWeatherKey, "snow" | "ocean">;

// 광장 날씨 키 중 방과 공유하는 키를 기존 Weather 컴포넌트가 이해하는 날씨 키로 연결합니다.
const WEATHER_TO_ROOM_WEATHER: Record<SharedPlazaWeatherKey, Parameters<typeof Weather>[0]["weather"]> = {
  rain: "rain",
  night: "night",
  sunny: "sunny",
  cloud: "cloud",
  dawn: "dawn",
  sunset: "sunset",
  cherry: "cherry",
};

// 광장에는 벽/창문 이미지를 쓰지 않기 때문에 배경 자체에 날씨 분위기를 입힙니다.
const WEATHER_BACKGROUNDS: Record<PlazaWeatherKey, string> = {
  rain: "linear-gradient(180deg, #31465f 0%, #1b2c42 50%, #111c2b 100%)",
  night: "linear-gradient(180deg, #17223f 0%, #101527 48%, #080c16 100%)",
  sunny: "linear-gradient(180deg, #f2c982 0%, #d9925d 46%, #795c44 100%)",
  cloud: "linear-gradient(180deg, #536374 0%, #202635 48%, #0d1118 100%)",
  snow: "linear-gradient(180deg, #8fa6b8 0%, #b9c8d1 46%, #eef2f1 100%)",
  dawn: "linear-gradient(180deg, #1b5d6f 0%, #172642 45%, #3b2a68 100%)",
  sunset: "linear-gradient(180deg, #c35e2f 0%, #7b2f1d 48%, #231711 100%)",
  cherry: "linear-gradient(180deg, #f1b5ca 0%, #ffe1cf 42%, #3a2a3d 100%)",
  ocean: "linear-gradient(180deg, #7fd1e8 0%, #45a9c8 34%, #0f6985 66%, #d8bd83 100%)",
};

const PLAZA_FLOOR_OVERLAYS: Partial<Record<PlazaWeatherKey, string>> = {
  dawn: "linear-gradient(180deg, rgba(91,127,154,0.22), rgba(63,55,130,0.34))",
};

const PLAZA_OBJECT_FILTER_BY_WEATHER: Record<PlazaWeatherKey, string> = {
  sunny: "saturate(1.08) brightness(1.04) contrast(1.02)",
  rain: "saturate(0.78) brightness(0.88) contrast(1.05)",
  snow: "saturate(0.82) brightness(1.02) contrast(1.03)",
  night: "saturate(0.72) brightness(0.7) contrast(1.1) hue-rotate(8deg)",
  cloud: "saturate(0.82) brightness(0.82) contrast(1.04)",
  dawn: "saturate(0.94) brightness(0.88) contrast(1.04) hue-rotate(6deg)",
  sunset: "saturate(1.14) brightness(0.96) sepia(0.18) contrast(1.05)",
  cherry: "saturate(1.04) brightness(1.02) sepia(0.08) contrast(1.01)",
  ocean: "saturate(1.08) brightness(1.02) contrast(1.03)",
};

const PLAZA_TINT_OPACITY_BY_WEATHER: Record<PlazaWeatherKey, number> = {
  sunny: 0.18,
  rain: 0.34,
  snow: 0.3,
  night: 0.42,
  cloud: 0.32,
  dawn: 0.28,
  sunset: 0.36,
  cherry: 0.26,
  ocean: 0.2,
};

function OceanPlazaWeather() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[44%] bg-[linear-gradient(180deg,#c8f2f5_0%,#a7dde4_62%,#91cfd9_100%)]" />
      <div className="absolute left-[10%] top-[9%] h-[4.4rem] w-[4.4rem] rounded-full bg-[#fff0a6] shadow-[0_0_26px_rgba(255,234,160,0.9),0_0_58px_rgba(255,211,101,0.55)]" />
      <div className="absolute inset-x-0 top-[29%] h-[17%] bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.22)_56%,rgba(255,255,255,0.42)_100%)]" />
      <div className="absolute inset-x-0 top-[36%] h-[27%] bg-[linear-gradient(180deg,#58bdd1_0%,#3391aa_48%,#1f6d83_100%)]" />
      <div className="absolute inset-x-0 top-[36%] h-[27%] bg-[radial-gradient(ellipse_at_28%_22%,rgba(213,255,250,0.42)_0%,transparent_36%),radial-gradient(ellipse_at_76%_58%,rgba(11,90,116,0.26)_0%,transparent_42%)]" />
      <div className="absolute inset-x-0 top-[36%] h-px bg-white/55 shadow-[0_0_18px_rgba(255,255,255,0.48)]" />
      <div className="mw-ocean-ripple absolute inset-x-[-10%] top-[45%] h-6 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.38)_0%,rgba(255,255,255,0.2)_28%,transparent_70%)] opacity-70" />
      <div className="mw-ocean-ripple mw-ocean-ripple-slow absolute inset-x-[-14%] top-[53%] h-7 bg-[radial-gradient(ellipse_at_center,rgba(210,248,246,0.38)_0%,rgba(255,255,255,0.16)_34%,transparent_72%)] opacity-75" />
      <div className="mw-ocean-glint absolute inset-x-[-20%] top-[41%] h-[20%] opacity-55" />
      <div className="mw-ocean-wave-line absolute inset-x-[-12%] top-[48%] h-16 opacity-60" />
      <div className="mw-ocean-wave-line mw-ocean-wave-line-back absolute inset-x-[-15%] top-[55%] h-14 opacity-45" />
      <div className="absolute inset-x-0 top-[63%] h-[13%] bg-[linear-gradient(180deg,rgba(102,178,186,0.46)_0%,rgba(222,207,160,0.62)_52%,rgba(240,221,176,0)_100%)] [clip-path:polygon(0_7%,9%_14%,18%_4%,30%_16%,42%_6%,54%_15%,66%_5%,78%_13%,90%_5%,100%_14%,100%_100%,0_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(180deg,#f3e4bd_0%,#e8ce95_45%,#d5b176_100%)] [clip-path:polygon(0_0,7%_3%,15%_0,25%_5%,34%_1%,45%_6%,55%_2%,66%_7%,77%_1%,88%_5%,100%_0,100%_100%,0_100%)]" />
      <div className="mw-ocean-wet-sand absolute inset-x-[-4%] bottom-[21%] h-[15%]" />
      <div className="mw-ocean-sand-grain absolute inset-x-0 bottom-0 h-[34%]" />
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(100deg,rgba(255,255,255,0.2),transparent_20%,rgba(122,89,54,0.08)_48%,transparent_70%,rgba(255,241,190,0.18)_90%)] opacity-62" />
    </div>
  );
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const getObjectZIndex = (layer = 0) => {
  return 20 + layer;
};

const PLAZA_STAGE_BASE_WIDTH = 1120;
const CONTROL_FLIP_TOP_BUFFER = 64;
const CONTROL_FLIP_ANCHOR_Y = 34;

const getObjectWidthPercent = (roomWidth: number) => {
  return `${(roomWidth / PLAZA_STAGE_BASE_WIDTH) * 100}%`;
};

const getObjectHalfWidthPercent = (roomWidth: number) => {
  return (roomWidth / PLAZA_STAGE_BASE_WIDTH) * 50;
};

const getEntryLayer = (entry: PlazaEntry) => entry.layer ?? 0;

function shouldPlaceControlsBelow(
  objectNode: HTMLElement | null,
  stageNode: HTMLElement | null,
  fallbackAnchorY: number,
  roomWidth: number,
) {
  if (objectNode && stageNode) {
    const objectRect = objectNode.getBoundingClientRect();
    const stageRect = stageNode.getBoundingClientRect();

    return objectRect.top - stageRect.top < CONTROL_FLIP_TOP_BUFFER;
  }

  const objectWidthPercent = (roomWidth / PLAZA_STAGE_BASE_WIDTH) * 100;

  return fallbackAnchorY < CONTROL_FLIP_ANCHOR_Y + objectWidthPercent;
}

function getBackgroundStyle(background: PlazaBackground) {
  if (background.type === "color") {
    return background.color;
  }

  return WEATHER_BACKGROUNDS[background.weatherKey] ?? WEATHER_BACKGROUNDS.rain;
}

function getFloorOverlay(plazaWeatherKey: PlazaWeatherKey | null) {
  if (!plazaWeatherKey) {
    return "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(66,51,42,0.28))";
  }

  return PLAZA_FLOOR_OVERLAYS[plazaWeatherKey]
    ?? "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(66,51,42,0.28))";
}

// 광장 공간은 배경/바닥만 가진 공개 방이며, 모든 오브젝트 배치와 클릭 액션을 담당합니다.
export function PlazaSpace({
  background,
  entries,
  activeEntryId,
  highlightedEntryId,
  currentGuestId,
  placementDraft = null,
  onEntrySelect,
  onEntryPreview,
  onEntryLike,
  onEntryMove,
  canMoveEntry = (entry) => entry.ownerId === currentGuestId,
  onPlacementCancel,
  onPlacementChange,
  onPlacementConfirm,
  onPlacementReset,
  onPlacementLayerDown,
  onPlacementLayerUp,
  isPlacementSaving = false,
}: Props) {
  const spaceRef = useRef<HTMLDivElement>(null);
  const entryNodeRefs = useRef(new Map<string, HTMLDivElement>());
  const dragOffsetRef = useRef<DragOffset | null>(null);
  const hoverTooltipTimerRef = useRef<number | null>(null);
  const [suppressedHoverEntryId, setSuppressedHoverEntryId] = useState<string | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null);
  const [controlPlacementByEntryId, setControlPlacementByEntryId] = useState<Record<string, HoverTooltip["placement"]>>({});
  const plazaWeatherKey = background.type === "weather" ? background.weatherKey : null;
  const roomWeatherKey = plazaWeatherKey && plazaWeatherKey !== "snow" && plazaWeatherKey !== "ocean"
    ? WEATHER_TO_ROOM_WEATHER[plazaWeatherKey]
    : null;
  const weatherTone = roomWeatherKey ? WEATHER_BY_KEY[roomWeatherKey] : null;
  const objectFilter = plazaWeatherKey ? PLAZA_OBJECT_FILTER_BY_WEATHER[plazaWeatherKey] : undefined;
  const entryInteractionDisabled = Boolean(placementDraft);

  function clearHoverTooltip() {
    if (hoverTooltipTimerRef.current !== null) {
      window.clearTimeout(hoverTooltipTimerRef.current);
      hoverTooltipTimerRef.current = null;
    }

    setHoverTooltip(null);
  }

  useEffect(() => {
    return () => {
      if (hoverTooltipTimerRef.current !== null) {
        window.clearTimeout(hoverTooltipTimerRef.current);
      }
    };
  }, []);

  function setEntryNode(entryId: string, node: HTMLDivElement | null) {
    if (node) {
      entryNodeRefs.current.set(entryId, node);
      return;
    }

    entryNodeRefs.current.delete(entryId);
  }

  function getEntryHits(clientX: number, clientY: number) {
    return entries
      .map<EntryHitCandidate | null>((entry, index) => {
        const node = entryNodeRefs.current.get(entry.id);

        if (!node) {
          return null;
        }

        const rect = node.getBoundingClientRect();
        const hit = clientX >= rect.left
          && clientX <= rect.right
          && clientY >= rect.top
          && clientY <= rect.bottom;

        return hit
          ? { id: entry.id, index, layer: getEntryLayer(entry) }
          : null;
      })
      .filter((candidate): candidate is EntryHitCandidate => candidate !== null)
      .sort((a, b) => b.layer - a.layer || b.index - a.index);
  }

  function handleEntryClick(event: MouseEvent<HTMLDivElement>, fallbackEntryId: string) {
    event.stopPropagation();
    clearHoverTooltip();

    if (entryInteractionDisabled) {
      return;
    }

    const hitEntryIds = getEntryHits(event.clientX, event.clientY).map((candidate) => candidate.id);
    const activeIndex = activeEntryId ? hitEntryIds.indexOf(activeEntryId) : -1;
    const nextEntryId = activeIndex >= 0
      ? hitEntryIds[(activeIndex + 1) % hitEntryIds.length]
      : hitEntryIds[0] ?? fallbackEntryId;
    const nextEntry = entries.find((entry) => entry.id === nextEntryId);

    if (nextEntry) {
      const object = ROOM_OBJECT_BY_KEY[nextEntry.objectKey];
      const nextEntryNode = entryNodeRefs.current.get(nextEntryId) ?? event.currentTarget;

      setControlPlacementByEntryId((current) => ({
        ...current,
        [nextEntryId]: shouldPlaceControlsBelow(nextEntryNode, spaceRef.current, nextEntry.positionY, object.roomWidth)
          ? "below"
          : "above",
      }));
    }

    setSuppressedHoverEntryId(nextEntryId);
    onEntrySelect(nextEntryId);
  }

  function scheduleHoverTooltip(node: HTMLDivElement, entryId: string, label: string, fallbackAnchorY: number, roomWidth: number) {
    clearHoverTooltip();

    const rect = node.getBoundingClientRect();
    const placement: HoverTooltip["placement"] = shouldPlaceControlsBelow(
      node,
      spaceRef.current,
      fallbackAnchorY,
      roomWidth,
    )
      ? "below"
      : "above";
    const gap = 16;

    hoverTooltipTimerRef.current = window.setTimeout(() => {
      setHoverTooltip({
        id: entryId,
        label,
        x: rect.left + rect.width / 2,
        y: placement === "below" ? rect.bottom + gap : rect.top - gap,
        placement,
      });
      hoverTooltipTimerRef.current = null;
    }, 500);
  }

  // 포인터 좌표를 광장 컨테이너 기준 퍼센트 좌표로 바꿔 화면 크기가 달라도 위치가 유지되게 합니다.
  const getPointerPosition = useCallback((event: PointerEvent<HTMLElement>, offset: DragOffset = { x: 0, y: 0 }) => {
    const rect = spaceRef.current?.getBoundingClientRect();

    if (!rect) {
      return null;
    }

    const object = placementDraft ? ROOM_OBJECT_BY_KEY[placementDraft.objectKey] : null;
    const horizontalEdge = object ? getObjectHalfWidthPercent(object.roomWidth) : 7;
    const minX = Math.max(7, horizontalEdge);
    const maxX = Math.min(93, 100 - horizontalEdge);

    return {
      x: clamp(((event.clientX + offset.x - rect.left) / rect.width) * 100, minX, maxX),
      y: clamp(((event.clientY + offset.y - rect.top) / rect.height) * 100, 18, 94),
    };
  }, [placementDraft]);

  // 새 오브젝트 배치와 기존 오브젝트 위치 이동이 같은 드래그 로직을 사용합니다.
  const movePlacement = useCallback((event: PointerEvent<HTMLElement>, offset: DragOffset) => {
    const nextPosition = getPointerPosition(event, offset);

    if (nextPosition) {
      onPlacementChange(nextPosition);
    }
  }, [getPointerPosition, onPlacementChange]);

  function handlePlacementPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();

    if (isPlacementSaving) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    if (!placementDraft) {
      return;
    }

    const rect = spaceRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    dragOffsetRef.current = {
      x: rect.left + (placementDraft.position.x / 100) * rect.width - event.clientX,
      y: rect.top + (placementDraft.position.y / 100) * rect.height - event.clientY,
    };
  }

  function handlePlacementPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1 || !dragOffsetRef.current) {
      return;
    }

    movePlacement(event, dragOffsetRef.current);
  }

  function handlePlacementPointerEnd(event: PointerEvent<HTMLDivElement>) {
    dragOffsetRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleSpacePointerDown() {
    clearHoverTooltip();

    // 빈 공간을 누르면 선택된 오브젝트 메뉴를 닫습니다.
    if (!placementDraft) {
      if (activeEntryId) {
        setSuppressedHoverEntryId(activeEntryId);
      }

      setControlPlacementByEntryId({});
      onEntrySelect(null);
    }
  }

  return (
    <div
      ref={spaceRef}
      className="relative h-full w-full overflow-hidden select-none"
      onPointerDown={handleSpacePointerDown}
      style={{
        background: getBackgroundStyle(background),
      }}
    >
      {plazaWeatherKey === "ocean" ? (
        <OceanPlazaWeather />
      ) : plazaWeatherKey === "snow" ? (
        <div className="absolute inset-0 z-0">
          <SnowWeather />
        </div>
      ) : roomWeatherKey ? (
        <Weather weather={roomWeatherKey} />
      ) : null}

      {plazaWeatherKey !== "ocean" && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[34%]"
            style={{ background: getFloorOverlay(plazaWeatherKey) }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-[29%] z-10 h-px bg-white/28" />
        </>
      )}

      {entries.map((entry) => {
        const object = ROOM_OBJECT_BY_KEY[entry.objectKey];
        const objectWidth = getObjectWidthPercent(object.roomWidth);
        const active = entry.id === activeEntryId;
        const movableEntry = canMoveEntry(entry);
        const highlighted = entry.id === highlightedEntryId;
        const hoverEnabled = !entryInteractionDisabled && !active && suppressedHoverEntryId !== entry.id;
        const controlPlacement = controlPlacementByEntryId[entry.id]
          ?? (shouldPlaceControlsBelow(null, null, entry.positionY, object.roomWidth) ? "below" : "above");
        const controlsBelow = controlPlacement === "below";
        const likedByCurrentGuest = hasLikedPlazaEntry(entry, currentGuestId);
        const likeCount = getPlazaEntryLikeCount(entry);

        return (
          <div
            key={entry.id}
            ref={(node) => setEntryNode(entry.id, node)}
            className={`absolute select-none ${entryInteractionDisabled ? "pointer-events-none" : "pointer-events-auto"} ${hoverEnabled ? "group" : ""}`}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerEnter={(event) => {
              if (!activeEntryId && suppressedHoverEntryId === entry.id) {
                setSuppressedHoverEntryId(null);
                return;
              }

              if (hoverEnabled) {
                scheduleHoverTooltip(event.currentTarget, entry.id, entry.title || entry.guestName, entry.positionY, object.roomWidth);
              }
            }}
            onPointerLeave={() => {
              clearHoverTooltip();

              if (!active && suppressedHoverEntryId === entry.id) {
                setSuppressedHoverEntryId(null);
              }
            }}
            onClick={(event) => handleEntryClick(event, entry.id)}
            style={{
              left: `${entry.positionX}%`,
              top: `${entry.positionY}%`,
              width: objectWidth,
              zIndex: active ? 70 : getObjectZIndex(entry.layer),
              transform: "translate(-50%, -100%)",
            }}
          >
            {active ? (
              <div
                className={`absolute left-1/2 z-30 flex -translate-x-1/2 gap-2 whitespace-nowrap rounded-md border border-[#5a4632]/20 bg-[#faf8f2]/95 p-1.5 text-xs text-[#5a4632] shadow-md ${controlsBelow ? "top-[calc(100%+16px)]" : "bottom-[calc(100%+16px)]"}`}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEntryPreview(entry.id);
                  }}
                  className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 transition hover:bg-[#5a4632]/10"
                >
                  글 확인하기
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEntryLike(entry.id);
                  }}
                  className={`inline-flex items-center gap-1 rounded px-2.5 py-1.5 transition hover:bg-[#5a4632]/10 ${likedByCurrentGuest ? "text-[#b65f55]" : ""}`}
                  aria-label={likedByCurrentGuest ? "좋아요 취소" : "좋아요"}
                  title={likedByCurrentGuest ? "좋아요 취소" : "좋아요"}
                >
                  <Heart size={13} fill={likedByCurrentGuest ? "currentColor" : "none"} />
                  <span>{likeCount}</span>
                </button>
                {movableEntry && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEntryMove(entry.id);
                    }}
                    className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 transition hover:bg-[#5a4632]/10"
                  >
                    위치 수정하기
                  </button>
                )}
                <span
                  className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-[#5a4632]/20 bg-[#faf8f2]/95 ${controlsBelow ? "bottom-full translate-y-1/2 border-l border-t" : "top-full -translate-y-1/2 border-b border-r"}`}
                />
              </div>
            ) : null}

            <img
              src={object.image}
              alt=""
              draggable={false}
              className={`cursor-pointer drop-shadow-[0_18px_18px_rgba(42,32,25,0.22)] ${highlighted ? "mw-room-object-bounce" : ""}`}
              style={{
                width: "100%",
                maxWidth: "none",
                transformOrigin: "bottom center",
                filter: objectFilter,
              }}
            />
          </div>
        );
      })}

      {placementDraft && (() => {
        const object = ROOM_OBJECT_BY_KEY[placementDraft.objectKey];
        const objectWidth = getObjectWidthPercent(object.roomWidth);
        const controlsBelow = shouldPlaceControlsBelow(null, null, placementDraft.position.y, object.roomWidth);

        return (
          <>
            <div
              className="absolute select-none"
              onPointerDown={handlePlacementPointerDown}
              onPointerMove={handlePlacementPointerMove}
              onPointerUp={handlePlacementPointerEnd}
              onPointerCancel={handlePlacementPointerEnd}
              style={{
                left: `${placementDraft.position.x}%`,
                top: `${placementDraft.position.y}%`,
                width: objectWidth,
                zIndex: getObjectZIndex(placementDraft.layer),
                transform: "translate(-50%, -100%)",
              }}
            >
              <img
                src={object.image}
                alt=""
                draggable={false}
                className="cursor-grab drop-shadow-[0_18px_18px_rgba(42,32,25,0.28)] active:cursor-grabbing"
                style={{
                  width: "100%",
                  maxWidth: "none",
                  filter: objectFilter,
                }}
              />
            </div>

            {/* 배치 중인 오브젝트가 기존 오브젝트 뒤에 보여도 이 투명 영역으로 항상 드래그할 수 있게 합니다. */}
            <div
              className="pointer-events-auto absolute z-[80] cursor-grab select-none active:cursor-grabbing"
              onPointerDown={handlePlacementPointerDown}
              onPointerMove={handlePlacementPointerMove}
              onPointerUp={handlePlacementPointerEnd}
              onPointerCancel={handlePlacementPointerEnd}
              style={{
                left: `${placementDraft.position.x}%`,
                top: `${placementDraft.position.y}%`,
                width: objectWidth,
                transform: "translate(-50%, -100%)",
              }}
            >
              <img
                src={object.image}
                alt=""
                draggable={false}
                className="invisible block pointer-events-none"
                style={{
                  width: "100%",
                  maxWidth: "none",
                }}
              />
              <div
                className={`pointer-events-auto absolute left-1/2 flex -translate-x-1/2 gap-2 ${controlsBelow ? "top-[calc(100%+10px)]" : "bottom-[calc(100%+10px)]"}`}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {onPlacementLayerUp && (
                  <button
                    type="button"
                    onClick={onPlacementLayerUp}
                    disabled={isPlacementSaving}
                    className="grid h-9 w-9 place-items-center rounded-full border border-[#5a4632]/20 bg-[#faf8f2] text-[#5a4632] shadow-md transition hover:bg-white disabled:opacity-45"
                    aria-label="맨 앞으로 가져오기"
                    title="맨 앞으로 가져오기"
                  >
                    <ArrowUp size={16} />
                  </button>
                )}
                {onPlacementLayerDown && (
                  <button
                    type="button"
                    onClick={onPlacementLayerDown}
                    disabled={isPlacementSaving}
                    className="grid h-9 w-9 place-items-center rounded-full border border-[#5a4632]/20 bg-[#faf8f2] text-[#5a4632] shadow-md transition hover:bg-white disabled:opacity-45"
                    aria-label="맨 뒤로 보내기"
                    title="맨 뒤로 보내기"
                  >
                    <ArrowDown size={16} />
                  </button>
                )}
                {onPlacementReset && (
                  <button
                    type="button"
                    onClick={onPlacementReset}
                    disabled={isPlacementSaving}
                    className="grid h-9 w-9 place-items-center rounded-full border border-[#9b6b54]/30 bg-[#f5eadc] text-[#9b6b54] shadow-md transition hover:bg-[#fbf3e8] disabled:opacity-45"
                    aria-label="위치 초기화"
                    title="위치 초기화"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onPlacementConfirm}
                  disabled={isPlacementSaving}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#4f8f68]/30 bg-[#dff3e6] text-[#4f8f68] shadow-md transition hover:bg-[#edf8f1] disabled:opacity-55"
                  aria-label="위치 확정"
                  title="위치 확정"
                >
                  {isPlacementSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                </button>
                <button
                  type="button"
                  onClick={onPlacementCancel}
                  disabled={isPlacementSaving}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#b36a5e]/30 bg-[#f4dfd9] text-[#b36a5e] shadow-md transition hover:bg-[#faebe7] disabled:opacity-45"
                  aria-label="취소"
                  title="취소"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {plazaWeatherKey && weatherTone && (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-[30] transition-opacity duration-500"
            style={{
              background: `
                radial-gradient(circle at 58% 20%, ${weatherTone.accent}55, transparent 34%),
                linear-gradient(180deg, ${weatherTone.windowTop}55 0%, transparent 44%, ${weatherTone.floor}44 100%)
              `,
              mixBlendMode: "soft-light",
              opacity: PLAZA_TINT_OPACITY_BY_WEATHER[plazaWeatherKey],
            }}
          />

          <div
            className="pointer-events-none absolute inset-0 z-[30] transition-opacity duration-500"
            style={{
              background: weatherTone.windowBottom,
              mixBlendMode: plazaWeatherKey === "sunny" || plazaWeatherKey === "snow" || plazaWeatherKey === "dawn" || plazaWeatherKey === "cherry" ? "overlay" : "multiply",
              opacity: plazaWeatherKey === "sunny" || plazaWeatherKey === "cherry" ? 0.06 : plazaWeatherKey === "snow" || plazaWeatherKey === "dawn" ? 0.08 : plazaWeatherKey === "night" ? 0.18 : 0.12,
            }}
          />
        </>
      )}

      {hoverTooltip && typeof document !== "undefined" ? createPortal(
        <div
          className="pointer-events-none fixed z-[95] whitespace-nowrap rounded-md border border-[#5a4632]/20 bg-[#faf8f2]/95 px-3 py-1.5 text-xs text-[#5a4632] shadow-md"
          style={{
            left: hoverTooltip.x,
            top: hoverTooltip.y,
            transform: hoverTooltip.placement === "below" ? "translateX(-50%)" : "translate(-50%, -100%)",
          }}
        >
          {hoverTooltip.label}
          <span
            className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-[#5a4632]/20 bg-[#faf8f2]/95 ${hoverTooltip.placement === "below" ? "bottom-full translate-y-1/2 border-l border-t" : "top-full -translate-y-1/2 border-b border-r"}`}
          />
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
