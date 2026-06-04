import type { Plaza, PlazaBackground, PlazaEntry, PlazaWeatherKey } from "../../types/plaza";
import type { RoomObjectPosition } from "../../types/roomObject";

export const DEFAULT_PLAZA_OBJECT_POSITION: RoomObjectPosition = { x: 50, y: 78 };
export const OBJECT_LAYER_MIN = 0;
export const OBJECT_LAYER_MAX = 7;
export const PLAZA_PAGE_SIZE = 10;
export const DAILY_PLAZA_CREATE_LIMIT = 5;

// 광장 생성 모달에서 보여줄 날씨 배경 선택지입니다.
export const PLAZA_WEATHER_OPTIONS: Array<{ key: PlazaWeatherKey; label: string; icon: string }> = [
  { key: "rain", label: "비", icon: "🌧️" },
  { key: "night", label: "밤", icon: "🌙" },
  { key: "sunny", label: "맑음", icon: "☀️" },
  { key: "cloud", label: "흐림", icon: "☁️" },
  { key: "snow", label: "눈", icon: "❄️" },
  { key: "dawn", label: "오로라", icon: "✨" },
  { key: "sunset", label: "노을", icon: "🌆" },
  { key: "cherry", label: "벚꽃", icon: "🌸" },
];

// 날씨 대신 직접 색을 고를 때 쓰는 프리셋 팔레트입니다.
export const PLAZA_COLOR_OPTIONS = [
  { color: "#8fa7a0", label: "세이지" },
  { color: "#b7a48a", label: "모래" },
  { color: "#c79b8b", label: "살구" },
  { color: "#a8b8d8", label: "하늘" },
  { color: "#9aa58c", label: "올리브" },
  { color: "#d3b7c7", label: "라일락" },
  { color: "#b5a6d6", label: "보라" },
  { color: "#89a9c5", label: "안개" },
  { color: "#c5b06f", label: "밀밭" },
];

export const clampObjectLayer = (layer: number) => {
  return Math.min(Math.max(layer, OBJECT_LAYER_MIN), OBJECT_LAYER_MAX);
};

// 생성 제한 비교는 UTC가 아닌 사용자 로컬 날짜 기준으로 맞춥니다.
function getLocalDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value.slice(0, 10) : "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getTodayOwnedPlazaCount(plazas: Plaza[], guestId: string) {
  const todayKey = getLocalDateKey(new Date());

  return plazas.filter((plaza) => (
    plaza.ownerId === guestId
    && getLocalDateKey(plaza.createdAt) === todayKey
  )).length;
}

export function canCreatePlazaToday(plazas: Plaza[], guestId: string) {
  return getTodayOwnedPlazaCount(plazas, guestId) < DAILY_PLAZA_CREATE_LIMIT;
}

export function getPlazaEntryLikedGuestIds(entry: PlazaEntry) {
  // 과거 저장값에 중복 좋아요 ID가 있더라도 화면 계산은 고유 사용자 기준으로 처리합니다.
  return Array.from(new Set(entry.likedGuestIds ?? []));
}

export function hasLikedPlazaEntry(entry: PlazaEntry, guestId: string) {
  return getPlazaEntryLikedGuestIds(entry).includes(guestId);
}

export function getPlazaEntryLikeCount(entry: PlazaEntry) {
  return Math.max(typeof entry.likes === "number" ? entry.likes : 0, getPlazaEntryLikedGuestIds(entry).length);
}

export function getPopularPlazaEntries(entries: PlazaEntry[]) {
  // 좋아요가 같으면 먼저 작성된 글이 앞에 오도록 정렬해 순위가 흔들리지 않게 합니다.
  return [...entries].sort((a, b) => {
    const likeDifference = getPlazaEntryLikeCount(b) - getPlazaEntryLikeCount(a);

    if (likeDifference !== 0) {
      return likeDifference;
    }

    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
}

export function togglePlazaEntryLike(entry: PlazaEntry, guestId: string): PlazaEntry {
  const likedGuestIds = getPlazaEntryLikedGuestIds(entry);
  const liked = likedGuestIds.includes(guestId);
  const nextLikedGuestIds = liked
    ? likedGuestIds.filter((likedGuestId) => likedGuestId !== guestId)
    : [...likedGuestIds, guestId];
  const nextLikes = getPlazaEntryLikeCount(entry) + (liked ? -1 : 1);

  return {
    ...entry,
    likes: Math.max(0, nextLikes),
    likedGuestIds: nextLikedGuestIds,
  };
}

export function getBackgroundLabel(background: PlazaBackground) {
  if (background.type === "color") {
    return background.color;
  }

  return PLAZA_WEATHER_OPTIONS.find((option) => option.key === background.weatherKey)?.label ?? "날씨";
}

export function getBackgroundIcon(background: PlazaBackground) {
  if (background.type === "color") {
    return null;
  }

  return PLAZA_WEATHER_OPTIONS.find((option) => option.key === background.weatherKey)?.icon ?? "☁️";
}

export function isPlazaFull(plaza: Plaza) {
  return plaza.entries.length >= plaza.maxParticipants;
}

export function getPlazaStatusLabel(plaza: Plaza) {
  if (isPlazaFull(plaza)) {
    return "인원 가득";
  }

  if (plaza.status === "closed") {
    return "종료됨";
  }

  return "참여 가능";
}

export function canEnterPlaza(plaza: Plaza) {
  return plaza.status === "open" && !isPlazaFull(plaza);
}

export function canViewPlaza(plaza: Plaza) {
  return canEnterPlaza(plaza) || isPlazaFull(plaza) || plaza.status === "closed";
}

export function getPlazaDescription(plaza: Plaza) {
  const description = plaza.description.trim();

  // 기본 안내 문구는 실제 설명처럼 보이지 않도록 상세 화면에서는 숨깁니다.
  return description === "\uc124\uba85\uc774 \uc5c6\ub294 \uad11\uc7a5" ? "" : description;
}

export function normalizePlaza(plaza: Plaza): Plaza {
  // 저장소에서 불러오거나 참여자가 추가될 때 정원 초과 광장을 자동으로 종료 처리합니다.
  if (plaza.status === "closed") {
    return plaza;
  }

  if (isPlazaFull(plaza)) {
    return {
      ...plaza,
      status: "closed",
      endedAt: plaza.endedAt ?? new Date().toISOString(),
    };
  }

  return plaza;
}
