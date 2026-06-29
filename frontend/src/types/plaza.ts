import type { RoomObjectKey } from "./roomObject";

// 광장 배경에서 선택할 수 있는 날씨는 기존 방 날씨 컴포넌트와 맞춥니다.
export type PlazaWeatherKey = "sunny" | "rain" | "cloud" | "snow" | "sunset" | "night" | "dawn" | "cherry" | "ocean";

// 광장 배경은 직접 고른 색상 또는 날씨 연출 중 하나만 사용합니다.
export type PlazaBackground =
  | {
    type: "color";
    color: string;
  }
  | {
    type: "weather";
    weatherKey: PlazaWeatherKey;
  };

export type PlazaStatus = "open" | "closed";

// 광장 안에 배치되는 사용자 1명의 글과 오브젝트 정보입니다.
export type PlazaEntry = {
  id: string;
  ownerId: string;
  guestName: string;
  title: string;
  content: string;
  objectKey: RoomObjectKey;
  positionX: number;
  positionY: number;
  layer?: number;
  likes: number;
  likedGuestIds?: string[];
  blinded?: boolean;
  createdAt: string;
};

// 광장 하나의 생성 설정, 참여자 오브젝트, 종료 상태를 함께 보관합니다.
export type Plaza = {
  id: string;
  topic: string;
  description: string;
  maxParticipants: number;
  allowSearch: boolean;
  allowInvite: boolean;
  inviteCode?: string;
  allowDuplicateObjects: boolean;
  background: PlazaBackground;
  ownerId: string;
  status: PlazaStatus;
  entries: PlazaEntry[];
  entryCount?: number;
  createdAt: string;
  endedAt?: string;
};
