import type { Plaza, PlazaEntry } from "../types/plaza";

// 백엔드 연결 전까지 광장 데이터와 나그네 식별자는 브라우저 저장소에 보관합니다.
const PLAZA_STORAGE_KEY = "mw-plazas";
const GUEST_ID_STORAGE_KEY = "mw-plaza-guest-id";
const INVITE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

type LegacyPlazaEntry = PlazaEntry & {
  guestId?: string;
  position?: {
    x?: number;
    y?: number;
  };
};

type LegacyPlaza = Plaza & {
  ownerGuestId?: string;
  entries: LegacyPlazaEntry[];
};

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function createInviteCode() {
  const values = crypto.getRandomValues(new Uint8Array(7));

  // 초대 코드는 명세에 맞춰 영문 대문자와 숫자 조합 7자리로 생성합니다.
  return Array.from(values, (value) => INVITE_ALPHABET[value % INVITE_ALPHABET.length]).join("");
}

function normalizeEntry(entry: LegacyPlazaEntry): PlazaEntry {
  const { guestId, position, ...entryFields } = entry;
  const likedGuestIds = Array.from(new Set(entry.likedGuestIds ?? []));
  const likes = Math.max(typeof entry.likes === "number" ? entry.likes : 0, likedGuestIds.length);

  return {
    ...entryFields,
    ownerId: entry.ownerId ?? guestId ?? "",
    positionX: typeof entry.positionX === "number" ? entry.positionX : position?.x ?? 50,
    positionY: typeof entry.positionY === "number" ? entry.positionY : position?.y ?? 78,
    likes,
    likedGuestIds,
  };
}

function normalizePlaza(plaza: LegacyPlaza): Plaza {
  const { ownerGuestId, ...plazaFields } = plaza;

  // 초대 ON/OFF를 제거하면서 모든 광장이 방 안에서 공유할 초대코드를 갖도록 보정합니다.
  const plazaWithInviteCode: Plaza = {
    ...plazaFields,
    ownerId: plaza.ownerId ?? ownerGuestId ?? "",
    allowInvite: true,
    inviteCode: plaza.inviteCode ?? createInviteCode(),
    entries: plaza.entries.map(normalizeEntry),
  };

  if (plazaWithInviteCode.status === "closed") {
    return plazaWithInviteCode;
  }

  // 최대 인원에 도달한 광장은 자동 종료 상태로 저장합니다.
  if (plazaWithInviteCode.entries.length >= plazaWithInviteCode.maxParticipants) {
    return {
      ...plazaWithInviteCode,
      status: "closed",
      endedAt: plazaWithInviteCode.endedAt ?? new Date().toISOString(),
    };
  }

  return plazaWithInviteCode;
}

export function getGuestId() {
  // 로그인 사용자 계정과 별개로 광장에서는 익명 나그네 ID를 사용합니다.
  const storedGuestId = localStorage.getItem(GUEST_ID_STORAGE_KEY);

  if (storedGuestId) {
    return storedGuestId;
  }

  const guestId = createId("guest");
  localStorage.setItem(GUEST_ID_STORAGE_KEY, guestId);

  return guestId;
}

export function getGuestName(guestId = getGuestId()) {
  // 화면에 표시할 익명 이름은 저장된 guestId 일부를 이용해 안정적으로 만듭니다.
  const guestNumber = guestId.replace(/\D/g, "").slice(-3) || guestId.slice(-3).toUpperCase();

  return `나그네 ${guestNumber}`;
}

export function loadPlazas() {
  // 오래된 저장값이 있더라도 로딩 시 종료 조건을 다시 한번 반영합니다.
  const raw = localStorage.getItem(PLAZA_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const plazas = JSON.parse(raw) as LegacyPlaza[];
    const normalizedPlazas = plazas.map(normalizePlaza);

    if (JSON.stringify(normalizedPlazas) !== JSON.stringify(plazas)) {
      localStorage.setItem(PLAZA_STORAGE_KEY, JSON.stringify(normalizedPlazas));
    }

    return normalizedPlazas;
  } catch {
    return [];
  }
}

export function savePlazas(plazas: Plaza[]) {
  // 모든 저장 직전에 normalize를 거쳐 자동 종료 조건이 누락되지 않게 합니다.
  localStorage.setItem(PLAZA_STORAGE_KEY, JSON.stringify(plazas.map(normalizePlaza)));
}

export function createPlaza(
  value: Omit<Plaza, "id" | "allowInvite" | "inviteCode" | "ownerId" | "status" | "entries" | "createdAt">,
) {
  // 생성자는 화면 입력값에 시스템 필드(id, 방장, 초대코드, 생성일)를 채워 넣습니다.
  const plaza: Plaza = {
    ...value,
    id: createId("plaza"),
    allowInvite: true,
    inviteCode: createInviteCode(),
    ownerId: getGuestId(),
    status: "open",
    entries: [],
    createdAt: new Date().toISOString(),
  };

  return plaza;
}

export function createPlazaEntry(value: Omit<PlazaEntry, "id" | "ownerId" | "guestName" | "likes" | "likedGuestIds" | "createdAt">) {
  // 광장 글은 작성자당 하나의 오브젝트로 표현되며, 좋아요는 0부터 시작합니다.
  return {
    ...value,
    id: createId("entry"),
    ownerId: getGuestId(),
    guestName: getGuestName(),
    likes: 0,
    likedGuestIds: [],
    createdAt: new Date().toISOString(),
  };
}
