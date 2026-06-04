// 백엔드 인증 연동 전까지 로그인 상태는 브라우저 저장소에 임시로 보관합니다.
const AUTH_STORAGE_KEY = "mw-authenticated";
const PROFILE_NICKNAME_STORAGE_KEY = "mw-profile-nickname";
const PROFILE_EMAIL_STORAGE_KEY = "mw-profile-email";
const USER_ID_STORAGE_KEY = "mw-user-id";
export const DEFAULT_PROFILE_NICKNAME = "나그네";
export const PROFILE_NICKNAME_MAX_LENGTH = 10;
const DEFAULT_USER_ID = "1";

export function isAuthenticated() {
    return localStorage.getItem(AUTH_STORAGE_KEY) === "true";
}

export function setAuthenticated() {
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
}

export function clearAuthenticated() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
}

// 마이페이지 닉네임도 프로필 API가 붙기 전까지 같은 로컬 저장소를 사용합니다.
export function normalizeProfileNickname(nickname: string) {
    const trimmedNickname = nickname.trim().slice(0, PROFILE_NICKNAME_MAX_LENGTH);

    return trimmedNickname || DEFAULT_PROFILE_NICKNAME;
}

export function getProfileNickname() {
    return normalizeProfileNickname(localStorage.getItem(PROFILE_NICKNAME_STORAGE_KEY) ?? "");
}

export function setProfileNickname(nickname: string) {
    localStorage.setItem(PROFILE_NICKNAME_STORAGE_KEY, normalizeProfileNickname(nickname));
}

export function getProfileEmail() {
    return localStorage.getItem(PROFILE_EMAIL_STORAGE_KEY) ?? "";
}

export function setProfileEmail(email: string) {
    localStorage.setItem(PROFILE_EMAIL_STORAGE_KEY, email.trim());
}

export function getCurrentUserId() {
    // 실제 로그인 API가 userId를 내려주기 전까지 우편함 API 테스트용 기본 ID를 사용합니다.
    return localStorage.getItem(USER_ID_STORAGE_KEY) || DEFAULT_USER_ID;
}
export function setCurrentUserId(userId: string | number) {
    // 백엔드 로그인 연동 시 응답의 사용자 ID를 저장하면 우편함 API가 같은 값을 사용합니다.
    localStorage.setItem(USER_ID_STORAGE_KEY, String(userId));
}
