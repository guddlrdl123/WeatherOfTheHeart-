import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Check, Loader2, RotateCcw, X } from "lucide-react";
import RoomImg from "../../assets/room3-clean.png";
import { ROOM_OBJECT_BY_KEY } from "../../constants/roomObjects";
import { WEATHER_BY_KEY } from "../../constants/weather";
import type { RoomObjectKey, RoomObjectPosition } from "../../types/roomObject";
import type { WeatherKey } from "../../types/weather";
import Weather from "../weathers/Weather";

// 체크 버튼으로 확정되어 방 안에 고정된 오브젝트
type PlacedRoomObject = {
  id: string;
  objectKey: RoomObjectKey;
  position: RoomObjectPosition;
  layer?: number;
  title?: string;
};

// 메모리가 최종 저장되기 전에 위치를 잡고 있는 임시 오브젝트
type PlacementDraft = {
  objectKey: RoomObjectKey;
  position: RoomObjectPosition;
  layer?: number;
};

type DragOffset = {
  x: number;
  y: number;
};

type ObjectHitCandidate = {
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
  weatherKey: WeatherKey;
  placedObjects?: PlacedRoomObject[];
  activeObjectId?: string;
  bouncingObjectId?: string;
  onObjectSelect?: (objectId: string | null) => void;
  onObjectPreview?: (objectId: string) => void;
  onObjectEdit?: (objectId: string) => void;
  // 배치 중인 임시 오브젝트와 배치 제어 콜백. 배치 중이 아닐 때는 null
  placementDraft?: PlacementDraft | null;
  onPlacementCancel?: () => void;
  onPlacementChange?: (position: RoomObjectPosition) => void;
  onPlacementConfirm?: () => void;
  onPlacementReset?: () => void;
  onPlacementLayerDown?: () => void;
  onPlacementLayerUp?: () => void;
  isPlacementSaving?: boolean;
  placementSavingMessage?: string;
}

const ROOM_FILTER_BY_WEATHER: Record<WeatherKey, string> = {
  sunny: "saturate(1.08) brightness(1.04) contrast(1.02)",
  rain: "saturate(0.78) brightness(0.88) contrast(1.05)",
  cloud: "saturate(0.72) brightness(0.94) contrast(0.98)",
  sunset: "saturate(1.14) brightness(0.96) sepia(0.18) contrast(1.05)",
  night: "saturate(0.72) brightness(0.7) contrast(1.1) hue-rotate(8deg)",
  dawn: "saturate(0.94) brightness(0.88) contrast(1.04) hue-rotate(6deg)",
  cherry: "saturate(1.04) brightness(1.02) sepia(0.08) contrast(1.01)",
};

const ROOM_TINT_OPACITY_BY_WEATHER: Record<WeatherKey, number> = {
  sunny: 0.18,
  rain: 0.34,
  cloud: 0.28,
  sunset: 0.36,
  night: 0.42,
  dawn: 0.28,
  cherry: 0.26,
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const ROOM_IMAGE_Z_INDEX = 10;
const ROOM_OBJECT_BASE_Z_INDEX = 12;

const getObjectZIndex = (layer = 0) => {
  return Math.max(ROOM_IMAGE_Z_INDEX + 1, ROOM_OBJECT_BASE_Z_INDEX + layer);
};

const ROOM_STAGE_BASE_WIDTH = 1120;
const CONTROL_FLIP_TOP_BUFFER = 64;
const CONTROL_FLIP_ANCHOR_Y = 34;

const getObjectWidthPercent = (roomWidth: number) => {
  return `${(roomWidth / ROOM_STAGE_BASE_WIDTH) * 100}%`;
};

const getObjectHalfWidthPercent = (roomWidth: number) => {
  return (roomWidth / ROOM_STAGE_BASE_WIDTH) * 50;
};

const getPlacedObjectLayer = (object: PlacedRoomObject) => object.layer ?? 0;

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

  const objectWidthPercent = (roomWidth / ROOM_STAGE_BASE_WIDTH) * 100;

  return fallbackAnchorY < CONTROL_FLIP_ANCHOR_Y + objectWidthPercent;
}

export default function Room({
  weatherKey,
  placedObjects = [],
  activeObjectId,
  bouncingObjectId,
  onObjectSelect,
  onObjectPreview,
  onObjectEdit,
  placementDraft = null,
  onPlacementCancel,
  onPlacementChange,
  onPlacementConfirm,
  onPlacementReset,
  onPlacementLayerDown,
  onPlacementLayerUp,
  isPlacementSaving = false,
  placementSavingMessage = "이야기를 확인하고 마음의 날씨를 분석하고 있어요. 잠시만 기다려주세요.",
}: Props) {
  const roomRef = useRef<HTMLDivElement>(null);
  const objectNodeRefs = useRef(new Map<string, HTMLDivElement>());
  const dragOffsetRef = useRef<DragOffset | null>(null);
  const hoverTooltipTimerRef = useRef<number | null>(null);
  const [suppressedHoverObjectId, setSuppressedHoverObjectId] = useState<string | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null);
  const [controlPlacementByObjectId, setControlPlacementByObjectId] = useState<Record<string, HoverTooltip["placement"]>>({});
  const weatherTone = WEATHER_BY_KEY[weatherKey];

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

  function setObjectNode(objectId: string, node: HTMLDivElement | null) {
    if (node) {
      objectNodeRefs.current.set(objectId, node);
      return;
    }

    objectNodeRefs.current.delete(objectId);
  }

  function getObjectHits(clientX: number, clientY: number) {
    return placedObjects
      .map<ObjectHitCandidate | null>((placedObject, index) => {
        const node = objectNodeRefs.current.get(placedObject.id);

        if (!node) {
          return null;
        }

        const rect = node.getBoundingClientRect();
        const hit = clientX >= rect.left
          && clientX <= rect.right
          && clientY >= rect.top
          && clientY <= rect.bottom;

        return hit
          ? { id: placedObject.id, index, layer: getPlacedObjectLayer(placedObject) }
          : null;
      })
      .filter((candidate): candidate is ObjectHitCandidate => candidate !== null)
      .sort((a, b) => b.layer - a.layer || b.index - a.index);
  }

  function handleObjectClick(event: MouseEvent<HTMLDivElement>, fallbackObjectId: string) {
    event.stopPropagation();
    clearHoverTooltip();

    const hitObjectIds = getObjectHits(event.clientX, event.clientY).map((candidate) => candidate.id);
    const activeIndex = activeObjectId ? hitObjectIds.indexOf(activeObjectId) : -1;
    const nextObjectId = activeIndex >= 0
      ? hitObjectIds[(activeIndex + 1) % hitObjectIds.length]
      : hitObjectIds[0] ?? fallbackObjectId;
    const nextObject = placedObjects.find((placedObject) => placedObject.id === nextObjectId);

    if (nextObject) {
      const object = ROOM_OBJECT_BY_KEY[nextObject.objectKey];
      const nextObjectNode = objectNodeRefs.current.get(nextObjectId) ?? event.currentTarget;

      setControlPlacementByObjectId((current) => ({
        ...current,
        [nextObjectId]: shouldPlaceControlsBelow(nextObjectNode, roomRef.current, nextObject.position.y, object.roomWidth)
          ? "below"
          : "above",
      }));
    }

    setSuppressedHoverObjectId(nextObjectId);
    onObjectSelect?.(nextObjectId);
  }

  // 포인터 좌표를 방 컨테이너 안의 퍼센트 좌표로 변환. 방 크기가 바뀌어도 오브젝트 위치가 일정하도록 하기 위함
  const getPointerPosition = useCallback((event: PointerEvent<HTMLElement>, offset: DragOffset = { x: 0, y: 0 }) => {
    const rect = roomRef.current?.getBoundingClientRect();

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

  // 클릭하거나 드래그한 위치를 부모의 배치 상태로 전달
  const movePlacement = useCallback((event: PointerEvent<HTMLElement>, offset: DragOffset) => {
    const nextPosition = getPointerPosition(event, offset);

    if (nextPosition) {
      onPlacementChange?.(nextPosition);
    }
  }, [getPointerPosition, onPlacementChange]);

  // 오브젝트를 드래그하는 동안 위치 업데이트가 끊기지 않도록 포인터를 캡처
  const handlePlacementPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (!placementDraft) {
      return;
    }

    const rect = roomRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    dragOffsetRef.current = {
      x: rect.left + (placementDraft.position.x / 100) * rect.width - event.clientX,
      y: rect.top + (placementDraft.position.y / 100) * rect.height - event.clientY,
    };
  };

  const handlePlacementPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1 || !dragOffsetRef.current) {
      return;
    }

    movePlacement(event, dragOffsetRef.current);
  };

  const handlePlacementPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    dragOffsetRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleRoomPointerDown = () => {
    clearHoverTooltip();

    if (!placementDraft) {
      if (activeObjectId) {
        setSuppressedHoverObjectId(activeObjectId);
      }

      setControlPlacementByObjectId({});
      onObjectSelect?.(null);
    }
  };

  function scheduleHoverTooltip(node: HTMLDivElement, objectId: string, label: string, fallbackAnchorY: number, roomWidth: number) {
    clearHoverTooltip();

    const rect = node.getBoundingClientRect();
    const placement: HoverTooltip["placement"] = shouldPlaceControlsBelow(
      node,
      roomRef.current,
      fallbackAnchorY,
      roomWidth,
    )
      ? "below"
      : "above";
    const gap = 16;

    hoverTooltipTimerRef.current = window.setTimeout(() => {
      setHoverTooltip({
        id: objectId,
        label,
        x: rect.left + rect.width / 2,
        y: placement === "below" ? rect.bottom + gap : rect.top - gap,
        placement,
      });
      hoverTooltipTimerRef.current = null;
    }, 500);
  }

  return (
    <div
      ref={roomRef}
      className="relative w-full h-full overflow-hidden transition-colors duration-500"
      onPointerDown={handleRoomPointerDown}
      style={{
        background: `linear-gradient(180deg, ${weatherTone.wallTop}, ${weatherTone.wall})`,
      }}
    >

      <Weather weather={weatherKey} />

      <img
        src={RoomImg}
        alt="room"
        className="absolute inset-0 w-full h-full object-cover object-left z-10 pointer-events-none transition-[filter] duration-500"
        style={{
          filter: ROOM_FILTER_BY_WEATHER[weatherKey],
        }}
      />

      {/* 위치가 확정되어 저장된 오브젝트들 */}
      {placedObjects.map((placedObject) => {
        const object = ROOM_OBJECT_BY_KEY[placedObject.objectKey];
        const objectWidth = getObjectWidthPercent(object.roomWidth);
        const label = placedObject.title?.trim() || "어느 날의 이야기";
        const active = placedObject.id === activeObjectId;
        const bouncing = placedObject.id === bouncingObjectId;
        const hoverEnabled = !active && suppressedHoverObjectId !== placedObject.id;
        const controlPlacement = controlPlacementByObjectId[placedObject.id]
          ?? (shouldPlaceControlsBelow(null, null, placedObject.position.y, object.roomWidth) ? "below" : "above");
        const controlsBelow = controlPlacement === "below";

        return (
          <div
            key={placedObject.id}
            ref={(node) => setObjectNode(placedObject.id, node)}
            className={`absolute pointer-events-auto select-none ${hoverEnabled ? "group" : ""}`}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onPointerEnter={(event) => {
              if (!activeObjectId && suppressedHoverObjectId === placedObject.id) {
                setSuppressedHoverObjectId(null);
                return;
              }

              if (hoverEnabled) {
                scheduleHoverTooltip(event.currentTarget, placedObject.id, label, placedObject.position.y, object.roomWidth);
              }
            }}
            onPointerLeave={() => {
              clearHoverTooltip();

              if (!active && suppressedHoverObjectId === placedObject.id) {
                setSuppressedHoverObjectId(null);
              }
            }}
            onClick={(event) => handleObjectClick(event, placedObject.id)}
            style={{
              left: `${placedObject.position.x}%`,
              top: `${placedObject.position.y}%`,
              width: objectWidth,
              zIndex: active ? 70 : getObjectZIndex(placedObject.layer),
              transform: "translate(-50%, -100%)",
            }}
          >
            {active ? (
              <div
                className={`absolute left-1/2 z-20 flex -translate-x-1/2 gap-2 whitespace-nowrap rounded-md border border-[#5a4632]/20 bg-[#faf8f2]/95 p-1.5 text-xs text-[#5a4632] shadow-md ${controlsBelow ? "top-[calc(100%+16px)]" : "bottom-[calc(100%+16px)]"}`}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onObjectPreview?.(placedObject.id);
                  }}
                  className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 transition hover:bg-[#5a4632]/10"
                >
                  {/* <Eye size={13} /> */}
                  글 확인하기
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onObjectEdit?.(placedObject.id);
                  }}
                  className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 transition hover:bg-[#5a4632]/10"
                >
                  {/* <Pencil size={13} /> */}
                  위치 수정하기
                </button>
                <span
                  className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-[#5a4632]/20 bg-[#faf8f2]/95 ${controlsBelow ? "bottom-full translate-y-1/2 border-l border-t" : "top-full -translate-y-1/2 border-b border-r"}`}
                />
              </div>
            ) : null}

            {hoverEnabled && (
              <img
                src={object.image}
                alt=""
                className="pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity delay-0 duration-150 group-hover:opacity-100 group-hover:delay-500"
                style={{
                  width: "100%",
                  maxWidth: "none",
                  transformOrigin: "bottom center",
                  // filter: "brightness(1.16) saturate(1.08) drop-shadow(0 0 5px rgba(255,248,232,0.95)) drop-shadow(0 0 8px rgba(90,70,50,0.24))",
                }}
              />
            )}

            <img
              src={object.image}
              alt=""
              className={`cursor-pointer ${bouncing ? "mw-room-object-bounce" : ""}`}
              style={{
                width: "100%",
                maxWidth: "none",
                transformOrigin: "bottom center",
                filter: ROOM_FILTER_BY_WEATHER[weatherKey],
              }}
            />
          </div>
        );
      })}

      {/* 임시 오브젝트. 드래그로 위치를 잡고 체크를 누르면 저장 */}
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
                className="cursor-grab drop-shadow-[0_12px_16px_rgba(48,36,26,0.24)] active:cursor-grabbing"
                style={{
                  width: "100%",
                  maxWidth: "none",
                  filter: ROOM_FILTER_BY_WEATHER[weatherKey],
                }}
              />
            </div>

            <div
              className="pointer-events-none absolute z-[80] select-none"
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
                data-placement-control="true"
                className={`pointer-events-auto absolute left-1/2 flex -translate-x-1/2 gap-2 ${controlsBelow ? "top-[calc(100%+10px)]" : "bottom-[calc(100%+10px)]"}`}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {onPlacementLayerUp && (
                  <button
                    type="button"
                    onClick={onPlacementLayerUp}
                    disabled={isPlacementSaving}
                    aria-label="맨 앞으로 가져오기"
                    title="맨 앞으로 가져오기"
                    className="grid h-9 w-9 place-items-center rounded-full border border-[#5a4632]/20 bg-[#faf8f2] text-[#5a4632] shadow-md transition hover:bg-white disabled:opacity-45"
                  >
                    <ArrowUp size={16} />
                  </button>
                )}
                {onPlacementLayerDown && (
                  <button
                    type="button"
                    onClick={onPlacementLayerDown}
                    disabled={isPlacementSaving}
                    aria-label="맨 뒤로 보내기"
                    title="맨 뒤로 보내기"
                    className="grid h-9 w-9 place-items-center rounded-full border border-[#5a4632]/20 bg-[#faf8f2] text-[#5a4632] shadow-md transition hover:bg-white disabled:opacity-45"
                  >
                    <ArrowDown size={16} />
                  </button>
                )}
                {onPlacementReset && (
                  <button
                    type="button"
                    onClick={onPlacementReset}
                    disabled={isPlacementSaving}
                    // title="위치 초기화"
                    className="grid h-9 w-9 place-items-center rounded-full border border-[#9b6b54]/30 bg-[#f5eadc] text-[#9b6b54] shadow-md transition hover:bg-[#fbf3e8] disabled:opacity-45"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onPlacementConfirm}
                  disabled={isPlacementSaving}
                  // title="위치 고정"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#4f8f68]/30 bg-[#dff3e6] text-[#4f8f68] shadow-md transition hover:bg-[#edf8f1] disabled:opacity-55"
                >
                  {isPlacementSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                </button>
                <button
                  type="button"
                  onClick={onPlacementCancel}
                  disabled={isPlacementSaving}
                  // title="취소"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#b36a5e]/30 bg-[#f4dfd9] text-[#b36a5e] shadow-md transition hover:bg-[#faebe7] disabled:opacity-45"
                >
                  <X size={18} />
                </button>
              </div>
              {isPlacementSaving && (
                <div
                  className={`pointer-events-auto absolute left-1/2 w-[210px] -translate-x-1/2 rounded-md border border-[#5a4632]/15 bg-[#fffbf6]/95 px-3 py-2 text-center text-xs leading-5 text-[#5a4632]/70 shadow-md ${controlsBelow ? "top-[calc(100%+56px)]" : "bottom-[calc(100%+56px)]"}`}
                >
                  {placementSavingMessage}
                </div>
              )}
            </div>
          </>
        );
      })()}

      <div
        className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-500"
        style={{
          background: `
            radial-gradient(circle at 58% 20%, ${weatherTone.accent}55, transparent 34%),
            linear-gradient(180deg, ${weatherTone.windowTop}55 0%, transparent 44%, ${weatherTone.floor}44 100%)
          `,
          mixBlendMode: "soft-light",
          opacity: ROOM_TINT_OPACITY_BY_WEATHER[weatherKey],
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-500"
        style={{
          background: weatherTone.windowBottom,
          mixBlendMode: weatherKey === "sunny" || weatherKey === "dawn" || weatherKey === "cherry" ? "overlay" : "multiply",
          opacity: weatherKey === "sunny" || weatherKey === "cherry" ? 0.06 : weatherKey === "dawn" ? 0.08 : weatherKey === "night" ? 0.18 : 0.12,
        }}
      />

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
