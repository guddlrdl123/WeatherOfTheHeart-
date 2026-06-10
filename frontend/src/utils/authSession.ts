// 백엔드 인증 연동 전까지 로그인 상태는 브라우저 저장소에 임시로 보관합니다.
const AUTH_STORAGE_KEY = "mw-authenticated";
const ACCESS_TOKEN_STORAGE_KEY = "mw-access-token";
const ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY = "mw-access-token-expires-at";
const PROFILE_NICKNAME_STORAGE_KEY = "mw-profile-nickname";
const PROFILE_EMAIL_STORAGE_KEY = "mw-profile-email";
const USER_ID_STORAGE_KEY = "mw-user-id";
const USER_IS_ADMIN_STORAGE_KEY = "mw-user-is-admin";
export const AUTH_SESSION_CHANGED_EVENT = "mw-auth-session-changed";
export const DEFAULT_PROFILE_NICKNAME = "나그네";
export const PROFILE_NICKNAME_MAX_LENGTH = 10;

function getSessionValue(key: string) {
    return sessionStorage.getItem(key);
}

function setSessionValue(key: string, value: string) {
    sessionStorage.setItem(key, value);
    localStorage.removeItem(key);
}

function removeSessionValue(key: string) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
}

function notifyAuthSessionChanged() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
    }
}

export function isAuthenticated() {
    const token = getAccessToken();
    const expiresAt = getSessionValue(ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY);

    if (!token || getSessionValue(AUTH_STORAGE_KEY) !== "true" || !Boolean(getSessionValue(USER_ID_STORAGE_KEY))) {
        return false;
    }

    if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
        clearAuthenticated();
        return false;
    }

    return true;
}

export function setAuthenticated(accessToken?: string, accessTokenExpiresAt?: string) {
    if (accessToken) {
        setSessionValue(ACCESS_TOKEN_STORAGE_KEY, accessToken);
    }

    if (accessTokenExpiresAt) {
        setSessionValue(ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY, accessTokenExpiresAt);
    }

    setSessionValue(AUTH_STORAGE_KEY, "true");
    notifyAuthSessionChanged();
}

export function clearAuthenticated() {
    removeSessionValue(AUTH_STORAGE_KEY);
    removeSessionValue(PROFILE_NICKNAME_STORAGE_KEY);
    removeSessionValue(PROFILE_EMAIL_STORAGE_KEY);
    removeSessionValue(USER_ID_STORAGE_KEY);
    removeSessionValue(USER_IS_ADMIN_STORAGE_KEY);
    removeSessionValue(ACCESS_TOKEN_STORAGE_KEY);
    removeSessionValue(ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY);
    notifyAuthSessionChanged();
}

export function getAccessToken() {
    return getSessionValue(ACCESS_TOKEN_STORAGE_KEY) ?? "";
}

export function getAuthHeader() {
    const accessToken = getAccessToken();

    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

// 마이페이지 닉네임도 프로필 API가 붙기 전까지 같은 로컬 저장소를 사용합니다.
export function normalizeProfileNickname(nickname: string) {
    const trimmedNickname = nickname.trim().slice(0, PROFILE_NICKNAME_MAX_LENGTH);

    return trimmedNickname || DEFAULT_PROFILE_NICKNAME;
}

export function getProfileNickname() {
    return normalizeProfileNickname(getSessionValue(PROFILE_NICKNAME_STORAGE_KEY) ?? "");
}

export function setProfileNickname(nickname: string) {
    setSessionValue(PROFILE_NICKNAME_STORAGE_KEY, normalizeProfileNickname(nickname));
}

export function getProfileEmail() {
    return getSessionValue(PROFILE_EMAIL_STORAGE_KEY) ?? "";
}

export function setProfileEmail(email: string) {
    setSessionValue(PROFILE_EMAIL_STORAGE_KEY, email.trim());
}

export function getCurrentUserId() {
    // 실제 로그인 API가 userId를 내려주기 전까지 우편함 API 테스트용 기본 ID를 사용합니다.
    return getSessionValue(USER_ID_STORAGE_KEY) ?? "";
}
export function setCurrentUserId(userId: string | number) {
    // 백엔드 로그인 연동 시 응답의 사용자 ID를 저장하면 우편함 API가 같은 값을 사용합니다.
    setSessionValue(USER_ID_STORAGE_KEY, String(userId));
    notifyAuthSessionChanged();
}

function getTokenAdminClaim() {
    const payload = getAccessToken().split(".")[1];

    if (!payload) {
        return false;
    }

    try {
        const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
        const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
        const data = JSON.parse(atob(paddedPayload)) as { admin?: boolean };

        return data.admin === true;
    } catch {
        return false;
    }
}

export function getCurrentUserIsAdmin() {
    return getSessionValue(USER_IS_ADMIN_STORAGE_KEY) === "true" || getTokenAdminClaim();
}

export function setCurrentUserIsAdmin(isAdmin?: boolean | null) {
    setSessionValue(USER_IS_ADMIN_STORAGE_KEY, isAdmin ? "true" : "false");
    notifyAuthSessionChanged();
}
