import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Mail,
  MapPinned,
  MessageSquareText,
  Pencil,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { ROOM_OBJECT_BY_KEY } from "../../constants/roomObjects";
import { useRoomObjectCatalog } from "../../hooks/useRoomObjectCatalog";
import { useResponsiveStageWidth } from "../../hooks/useResponsiveStageWidth";
import { fetchUserCreatedPlazas, fetchUserPlazaEntries } from "../../services/plazaService";
import { fetchUserProfile, updateUserProfile } from "../../services/userService";
import type { Plaza, PlazaEntry } from "../../types/plaza";
import {
  clearAuthenticated,
  normalizeProfileNickname,
  PROFILE_NICKNAME_MAX_LENGTH,
  setProfileEmail,
  setProfileNickname,
} from "../../utils/authSession";
import { trimTrailingDatePeriod } from "../../utils/date";

type ArchiveRecord = {
  id: string;
  plaza: Plaza;
  entry: PlazaEntry;
};

type MyPageView = "createdPlazas" | "writtenObjects";

type ProfileNotice = {
  message: string;
  tone: "success" | "error";
};

type ProfileEditValue = {
  nickname: string;
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
};

const MYPAGE_LAYOUT_WIDTH = 1460;
const MYPAGE_PROFILE_HEIGHT = 132;
const MYPAGE_ACTIVITY_HEIGHT = 672;
const MYPAGE_SECTION_GAP = 20;
const MYPAGE_LAYOUT_HEIGHT = MYPAGE_PROFILE_HEIGHT + MYPAGE_SECTION_GAP + MYPAGE_ACTIVITY_HEIGHT;
const MYPAGE_PAGE_PADDING_X = 128;
const MYPAGE_PAGE_PADDING_Y = 64;
const PASSWORD_MIN_LENGTH = 8;
const PROFILE_NOTICE_DURATION_MS = 3500;

function hasRequiredPasswordSpecialCharacter(value: string) {
  return /[^A-Za-z0-9]/.test(value);
}

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "작성 시간 없음";
  }

  return trimTrailingDatePeriod(new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date));
}

function formatJoinedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "정보 없음";
  }

  return trimTrailingDatePeriod(new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date));
}

function getPlazaStatusLabel(plaza: Plaza) {
  return plaza.status === "closed" ? "종료됨" : "진행 중";
}

function getPlazaEntryCount(plaza: Plaza) {
  return plaza.entryCount ?? plaza.entries.length;
}

type ProfileEditModalProps = {
  nickname: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (value: ProfileEditValue) => void;
};

function ProfileEditModal({ nickname, isSaving, onClose, onSave }: ProfileEditModalProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [value, setValue] = useState<ProfileEditValue>({
    nickname,
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });

  function updateValue(key: keyof ProfileEditValue, nextValue: string) {
    setValue((previousValue) => ({
      ...previousValue,
      [key]: key === "nickname" ? nextValue.slice(0, PROFILE_NICKNAME_MAX_LENGTH) : nextValue,
    }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-sm select-none"
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className="w-full max-w-[580px] max-h-[calc(100vh-64px)] overflow-y-auto rounded-xl bg-[#fffbf6f2] p-6 text-[#5a4632] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(value);
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.18em] text-[#5a4632]/40">PROFILE</p>
            <h2 id="profile-edit-title" className="mt-3 text-2xl font-normal leading-9 text-[#5a4632]">프로필 수정</h2>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#5a4632]/10 text-[#5a4632] hover:bg-black/5 disabled:opacity-50"
            onClick={onClose}
            disabled={isSaving}
            aria-label="닫기"
            title="닫기"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-4">
          <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
            닉네임
            <input
              className="mw-input h-11 px-3 text-sm"
              value={value.nickname}
              placeholder="나그네"
              maxLength={PROFILE_NICKNAME_MAX_LENGTH}
              onChange={(event) => updateValue("nickname", event.target.value)}
              disabled={isSaving}
              autoFocus
            />
            <span className="text-right text-[0.68rem] text-[#5a4632]/55">
              {value.nickname.length}/{PROFILE_NICKNAME_MAX_LENGTH}
            </span>
          </label>

          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-sm text-[#5a4632]">
              <KeyRound size={16} className="shrink-0 text-[#9b6b54]" />
              <div>
                <p>비밀번호 변경</p>
                <p className="mt-1 text-xs leading-5 text-[#5a4632]/55">변경하지 않으려면 아래 입력칸을 비워두세요.</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-2 block text-xs text-[#5a4632]/55">현재 비밀번호</span>
                <div className="relative">
                  <input
                    className="mw-input h-10 px-3 pr-10 text-sm"
                    type={showCurrentPassword ? "text" : "password"}
                    value={value.currentPassword}
                    onChange={(event) => updateValue("currentPassword", event.target.value)}
                    disabled={isSaving}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((current) => !current)}
                    className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-[#5a4632]/60 hover:text-[#5a4632] disabled:opacity-50"
                    disabled={isSaving}
                    aria-label={showCurrentPassword ? "현재 비밀번호 숨기기" : "현재 비밀번호 보기"}
                    title={showCurrentPassword ? "현재 비밀번호 숨기기" : "현재 비밀번호 보기"}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs text-[#5a4632]/55">새 비밀번호</span>
                <div className="relative">
                  <input
                    className="mw-input h-10 px-3 pr-10 text-sm"
                    type={showNewPassword ? "text" : "password"}
                    value={value.newPassword}
                    onChange={(event) => updateValue("newPassword", event.target.value)}
                    disabled={isSaving}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((current) => !current)}
                    className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-[#5a4632]/60 hover:text-[#5a4632] disabled:opacity-50"
                    disabled={isSaving}
                    aria-label={showNewPassword ? "새 비밀번호 숨기기" : "새 비밀번호 보기"}
                    title={showNewPassword ? "새 비밀번호 숨기기" : "새 비밀번호 보기"}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs text-[#5a4632]/55">새 비밀번호 확인</span>
                <div className="relative">
                  <input
                    className="mw-input h-10 px-3 pr-10 text-sm"
                    type={showNewPasswordConfirm ? "text" : "password"}
                    value={value.newPasswordConfirm}
                    onChange={(event) => updateValue("newPasswordConfirm", event.target.value)}
                    disabled={isSaving}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasswordConfirm((current) => !current)}
                    className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-[#5a4632]/60 hover:text-[#5a4632] disabled:opacity-50"
                    disabled={isSaving}
                    aria-label={showNewPasswordConfirm ? "새 비밀번호 확인 숨기기" : "새 비밀번호 확인 보기"}
                    title={showNewPasswordConfirm ? "새 비밀번호 확인 숨기기" : "새 비밀번호 확인 보기"}
                  >
                    {showNewPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-[#9b6b54]/40 bg-white/30 px-4 py-2 text-sm text-[#9b6b54]/80 hover:bg-white/60 disabled:opacity-50"
            onClick={onClose}
            disabled={isSaving}
          >
            취소
          </button>
          <button
            type="submit"
            className="mw-button-solid rounded-md px-4 py-2 text-sm disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? "저장 중" : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MyPage() {
  useRoomObjectCatalog();

  const navigate = useNavigate();
  const profileNoticeTimerRef = useRef<number | null>(null);

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState(nickname);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [profileNotice, setProfileNotice] = useState<ProfileNotice | null>(null);
  const [createdPlazas, setCreatedPlazas] = useState<Plaza[]>([]);
  const [archiveRecords, setArchiveRecords] = useState<ArchiveRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<MyPageView>("writtenObjects");

  // 사용자가 아직 선택하지 않았을 때는 최신 기록을 기본 상세로 보여줍니다.
  const selectedRecord = archiveRecords.find((record) => record.id === selectedRecordId) ?? archiveRecords[0] ?? null;
  const selectedObject = selectedRecord ? ROOM_OBJECT_BY_KEY[selectedRecord.entry.objectKey] : null;
  const stageWidth = useResponsiveStageWidth({
    designWidth: MYPAGE_LAYOUT_WIDTH,
    designHeight: MYPAGE_LAYOUT_HEIGHT,
    pagePaddingX: MYPAGE_PAGE_PADDING_X,
    pagePaddingY: MYPAGE_PAGE_PADDING_Y,
  });
  const stageScale = stageWidth / MYPAGE_LAYOUT_WIDTH;
  const stageHeight = MYPAGE_LAYOUT_HEIGHT * stageScale;

  function showProfileNotice(nextMessage: string, tone: ProfileNotice["tone"] = "success") {
    setProfileNotice({ message: nextMessage, tone });

    if (profileNoticeTimerRef.current !== null) {
      window.clearTimeout(profileNoticeTimerRef.current);
    }

    profileNoticeTimerRef.current = window.setTimeout(() => {
      setProfileNotice(null);
      profileNoticeTimerRef.current = null;
    }, PROFILE_NOTICE_DURATION_MS);
  }

  function closeProfileNotice() {
    setProfileNotice(null);

    if (profileNoticeTimerRef.current !== null) {
      window.clearTimeout(profileNoticeTimerRef.current);
      profileNoticeTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (profileNoticeTimerRef.current !== null) {
        window.clearTimeout(profileNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        setIsProfileLoading(true);
        closeProfileNotice();

        const profile = await fetchUserProfile();

        if (ignore) {
          return;
        }

        setNickname(profile.nickname);
        setNicknameDraft(profile.nickname);
        setEmail(profile.email);
        setJoinedAt(profile.joinedAt);
        setProfileNickname(profile.nickname);
        setProfileEmail(profile.email);
      } catch (caughtError) {
        if (!ignore) {
          showProfileNotice(caughtError instanceof Error ? caughtError.message : "프로필 정보를 불러오지 못했습니다.", "error");
        }
      } finally {
        if (!ignore) {
          setIsProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadActivities() {
      try {
        setIsActivityLoading(true);

        const [created, writtenEntries] = await Promise.all([
          fetchUserCreatedPlazas(),
          fetchUserPlazaEntries(),
        ]);

        if (ignore) {
          return;
        }

        setCreatedPlazas(created);
        setArchiveRecords(writtenEntries
          .map(({ plaza, entry }) => ({
            id: `${plaza.id}:${entry.id}`,
            plaza,
            entry,
          }))
          .sort((a, b) => Date.parse(b.entry.createdAt) - Date.parse(a.entry.createdAt)));
      } catch (caughtError) {
        if (!ignore) {
          showProfileNotice(caughtError instanceof Error ? caughtError.message : "마이페이지 활동을 불러오지 못했습니다.", "error");
        }
      } finally {
        if (!ignore) {
          setIsActivityLoading(false);
        }
      }
    }

    void loadActivities();

    return () => {
      ignore = true;
    };
  }, []);

  function handleStartEdit() {
    setNicknameDraft(nickname);
    closeProfileNotice();
    setIsEditingNickname(true);
  }

  function handleCancelEdit() {
    setNicknameDraft(nickname);
    closeProfileNotice();
    setIsEditingNickname(false);
  }

  async function handleSaveProfile(value: ProfileEditValue) {
    const nextNickname = normalizeProfileNickname(value.nickname);
    const currentPassword = value.currentPassword;
    const newPassword = value.newPassword;
    const newPasswordConfirm = value.newPasswordConfirm;
    const isChangingPassword = Boolean(currentPassword || newPassword || newPasswordConfirm);

    if (isChangingPassword) {
      if (!currentPassword) {
        showProfileNotice("현재 비밀번호를 입력해주세요.", "error");
        return;
      }

      if (!newPassword) {
        showProfileNotice("새 비밀번호를 입력해주세요.", "error");
        return;
      }

      if (newPassword.length < PASSWORD_MIN_LENGTH || !hasRequiredPasswordSpecialCharacter(newPassword)) {
        showProfileNotice("새 비밀번호는 8자 이상이고 특수문자를 포함해야 합니다.", "error");
        return;
      }

      if (newPassword !== newPasswordConfirm) {
        showProfileNotice("새 비밀번호 확인이 일치하지 않습니다.", "error");
        return;
      }
    }

    try {
      setIsSavingProfile(true);
      closeProfileNotice();

      const profile = await updateUserProfile(isChangingPassword
        ? { nickname: nextNickname, currentPassword, newPassword }
        : { nickname: nextNickname });

      setNickname(profile.nickname);
      setNicknameDraft(profile.nickname);
      setEmail(profile.email);
      setJoinedAt(profile.joinedAt);
      setProfileNickname(profile.nickname);
      setProfileEmail(profile.email);
      setIsEditingNickname(false);
      showProfileNotice(isChangingPassword ? "프로필과 비밀번호가 변경되었습니다." : "닉네임이 변경되었습니다.");
    } catch (caughtError) {
      showProfileNotice(caughtError instanceof Error ? caughtError.message : "프로필 정보를 수정하지 못했습니다.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  }

  // 헤더 로그아웃 버튼과 동일하게 인증 플래그를 지우고 랜딩 페이지로 이동합니다.
  function handleLogout() {
    clearAuthenticated();
    navigate("/", { replace: true });
  }

  const ProfileNoticeIcon = profileNotice?.tone === "error" ? CircleAlert : CheckCircle2;
  const profileNoticeIconClass = profileNotice?.tone === "error"
    ? "border-[#b36a5e]/30 bg-[#f4dfd9] text-[#b36a5e]"
    : "border-[#7c9b78]/30 bg-[#edf5e7] text-[#5f875b]";

  return (
    <div className="mw-app min-h-screen flex flex-col select-none">
      <AppHeader />

      {profileNotice && (
        <div className="fixed left-1/2 top-6 z-[120] w-[min(420px,calc(100vw-32px))] -translate-x-1/2">
          <div className="mw-surface flex items-center gap-3 rounded-xl bg-[#fffbf6f2] px-4 py-3 text-[#5a4632] shadow-xl backdrop-blur-sm">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border ${profileNoticeIconClass}`}>
              <ProfileNoticeIcon size={17} />
            </span>
            <p className="min-w-0 flex-1 text-sm leading-5">{profileNotice.message}</p>
            <button
              type="button"
              onClick={closeProfileNotice}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#5a4632]/55 hover:bg-[#5a4632]/10 hover:text-[#5a4632]"
              aria-label="안내 메시지 닫기"
              title="안내 메시지 닫기"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-auto px-16 py-8">
        <div className="mx-auto" style={{ width: `${stageWidth}px`, height: `${stageHeight}px` }}>
          <div
            className="flex w-[1460px] flex-col gap-5"
            style={{
              transform: `scale(${stageScale})`,
              transformOrigin: "top left",
            }}
          >
            {/* 프로필과 활동 요약을 한눈에 보는 마이페이지 상단 영역입니다. */}
            <section className="mw-surface h-[132px] rounded-xl p-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/68">
                    <UserRound size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs tracking-[0.18em] text-[#5a4632]/38">MY PAGE</p>
                    <h1 className="mt-2 truncate text-2xl font-normal text-[#5a4632]">
                      {isProfileLoading ? "프로필을 불러오는 중" : `${nickname || "나그네"}님의 마음 기록`}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#5a4632]/58">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail size={14} />
                        {email || "이메일 정보 없음"}
                      </span>
                      <span className="h-3 w-px bg-[#5a4632]/18" />
                      <span>가입일 {joinedAt ? formatJoinedAt(joinedAt) : "정보 없음"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="mw-button-solid inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-50"
                      onClick={handleStartEdit}
                      disabled={isProfileLoading || isSavingProfile}
                    >
                      <Pencil size={14} />
                      정보수정
                    </button>
                    <button
                      type="button"
                      className="mw-button inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm"
                      onClick={handleLogout}
                    >
                      <LogOut size={14} />
                      로그아웃
                    </button>
                  </div>
                </div>
              </div>

            </section>

            {/* 별도 보관함 페이지 대신 마이페이지의 주 콘텐츠로 통합된 기록 영역입니다. */}
            <section className="flex h-[672px] flex-col gap-4">
              <div className="flex items-center justify-between gap-5 border-b border-[#5a4632]/12">
                <div className="flex items-end gap-6">
                  <button
                    type="button"
                    onClick={() => setActiveView("createdPlazas")}
                    className={`border-b-2 px-1 pb-3 text-sm transition ${activeView === "createdPlazas"
                      ? "border-[#9b6b54] text-[#5a4632]"
                      : "border-transparent text-[#5a4632]/45 hover:text-[#5a4632]/70"
                      }`}
                  >
                    내가 만든 광장
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView("writtenObjects")}
                    className={`border-b-2 px-1 pb-3 text-sm transition ${activeView === "writtenObjects"
                      ? "border-[#9b6b54] text-[#5a4632]"
                      : "border-transparent text-[#5a4632]/45 hover:text-[#5a4632]/70"
                      }`}
                  >
                    내가 작성한 오브젝트
                  </button>
                </div>
              </div>

              {activeView === "createdPlazas" ? (
                isActivityLoading ? (
                  <section className="mw-surface grid flex-1 place-items-center rounded-xl p-8 text-center text-sm text-[#5a4632]/55">
                    마이페이지 활동을 불러오는 중입니다.
                  </section>
                ) : createdPlazas.length === 0 ? (
                  <section className="mw-surface grid flex-1 place-items-center rounded-xl p-8 text-center">
                    <div>
                      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/65">
                        <MapPinned size={20} />
                      </div>
                      <h3 className="text-lg font-normal text-[#5a4632]">아직 만든 광장이 없어요.</h3>
                      <p className="mt-2 text-sm text-[#5a4632]/55">새 광장을 만들면 이곳에서 확인할 수 있습니다.</p>
                      <button
                        type="button"
                        onClick={() => navigate("/plaza")}
                        className="mt-4 text-sm text-[#9b6b54] underline-offset-4 hover:underline"
                      >
                        광장 만들러가기 →
                      </button>
                    </div>
                  </section>
                ) : (
                  <section className="mw-surface flex h-[620px] min-h-0 flex-col rounded-xl p-5">
                    <div className="mb-4 flex items-center justify-between border-b border-[#5a4632]/12 px-1 pb-4 text-sm text-[#5a4632]">
                      <span>내가 만든 광장</span>
                      <span className="text-sm text-[#5a4632]/45">{createdPlazas.length}</span>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                      {createdPlazas.map((plaza) => {
                        const description = plaza.description.trim();

                        return (
                          <article
                            key={plaza.id}
                            className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-transparent bg-white/20 p-4 transition hover:border-[#5a4632]/12 hover:bg-white/35"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <h3 className="truncate text-base font-normal text-[#5a4632]">{plaza.topic}</h3>
                                <span className="shrink-0 text-[11px] text-[#5a4632]/38">
                                  {formatCreatedAt(plaza.createdAt)}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#5a4632]/52">
                                <span className="rounded-full border border-[#5a4632]/12 bg-white/30 px-2 py-1">
                                  {getPlazaStatusLabel(plaza)}
                                </span>
                                <span className="rounded-full border border-[#5a4632]/12 bg-white/30 px-2 py-1">
                                  {getPlazaEntryCount(plaza)}/{plaza.maxParticipants}명
                                </span>
                                {description && <span className="min-w-0 truncate">{description}</span>}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => navigate(`/plaza/${plaza.id}`)}
                              className="mw-button inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs"
                            >
                              이동
                              <ArrowRight size={14} />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )
              ) : isActivityLoading ? (
                <section className="mw-surface grid flex-1 place-items-center rounded-xl p-8 text-center text-sm text-[#5a4632]/55">
                  마이페이지 활동을 불러오는 중입니다.
                </section>
              ) : archiveRecords.length === 0 ? (
                <section className="mw-surface grid flex-1 place-items-center rounded-xl p-8 text-center">
                  <div>
                    <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/65">
                      <MessageSquareText size={20} />
                    </div>
                    <h3 className="text-lg font-normal text-[#5a4632]">아직 보관된 광장 글이 없어요.</h3>
                    <p className="mt-2 text-sm text-[#5a4632]/55">광장에서 발자취를 남기면 마이페이지에 남습니다.</p>
                  </div>
                </section>
              ) : (
                <section className="grid h-[620px] min-h-0 grid-cols-[430px_1fr] gap-5">
                  {/* 왼쪽 목록에서 기록을 고르면 오른쪽 상세 패널이 갱신됩니다. */}
                  <aside className="mw-surface flex min-h-0 flex-col rounded-xl p-4">
                    <div className="mb-4 flex items-center justify-between px-1 text-sm text-[#5a4632]">
                      <span>기록 목록</span>
                      <span className="text-sm text-[#5a4632]/45">{archiveRecords.length}</span>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                      {archiveRecords.map((record) => {
                        const active = record.id === selectedRecord?.id;
                        const object = ROOM_OBJECT_BY_KEY[record.entry.objectKey];

                        return (
                          <button
                            key={record.id}
                            type="button"
                            onClick={() => setSelectedRecordId(record.id)}
                            className={`grid grid-cols-[44px_1fr] gap-3 rounded-lg border p-3 text-left transition ${active
                              ? "border-[#9b6b54]/45 bg-[#9b6b54]/10"
                              : "border-transparent bg-white/20 hover:border-[#5a4632]/12 hover:bg-white/35"
                              }`}
                          >
                            <span className="grid h-11 w-11 place-items-center rounded-lg border border-[#5a4632]/10 bg-white/35 text-[#5a4632]/45">
                              {object ? (
                                <img src={object.image} alt="" className="h-8 w-8 object-contain" />
                              ) : (
                                <Archive size={18} />
                              )}
                            </span>

                            <span className="min-w-0">
                              <span className="mb-1 flex items-center justify-between gap-3">
                                <span className="truncate text-xs text-[#5a4632]/45">{record.plaza.topic}</span>
                                <span className="shrink-0 text-[11px] text-[#5a4632]/38">
                                  {formatCreatedAt(record.entry.createdAt)}
                                </span>
                              </span>
                              <strong className="block truncate text-sm font-normal text-[#5a4632]">
                                {record.entry.title || "어느 나그네의 발자취"}
                              </strong>
                              <span className="mt-1 block truncate text-xs text-[#5a4632]/52">
                                {record.entry.content}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </aside>

                  {/* 선택한 광장 글의 상세 내용과 함께 배치한 오브젝트를 보여줍니다. */}
                  <article className="mw-surface min-h-0 rounded-xl p-7">
                    {selectedRecord ? (
                      <div className="flex h-full flex-col">
                        <div className="mb-6 flex items-start justify-between gap-5 border-b border-[#5a4632]/15 pb-6">
                          <div className="min-w-0">
                            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#5a4632]/48">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5a4632]/12 bg-white/30 px-2.5 py-1">
                                <MapPinned size={13} />
                                {getPlazaStatusLabel(selectedRecord.plaza)}
                              </span>
                            </div>
                            <h3 className="truncate text-2xl font-normal text-[#5a4632]">
                              {selectedRecord.plaza.topic}
                            </h3>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5a4632]/58">
                              {selectedRecord.plaza.description}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <div className="flex items-center gap-2 rounded-full border border-[#5a4632]/15 bg-white/35 px-3 py-1.5 text-xs text-[#5a4632]/58">
                              <CalendarDays size={14} />
                              {formatCreatedAt(selectedRecord.entry.createdAt)}
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/plaza/${selectedRecord.plaza.id}`)}
                              className="inline-flex items-center gap-1.5 text-xs text-[#9b6b54] underline-offset-4 hover:underline"
                            >
                              해당 광장으로 이동 →
                            </button>
                          </div>
                        </div>

                        <div className="grid min-h-0 flex-1 grid-cols-[1fr_220px] gap-6">
                          <section className="min-h-0">
                            <p className="mb-3 text-xs text-[#5a4632]/45">내가 쓴 글</p>
                            <h4 className="text-2xl font-normal text-[#5a4632]">
                              {selectedRecord.entry.title || "어느 나그네의 이야기"}
                            </h4>
                            <p className="mt-5 max-h-[420px] overflow-y-auto whitespace-pre-wrap text-sm leading-8 text-[#5a4632]/70">
                              {selectedRecord.entry.content}
                            </p>
                          </section>

                          <aside className="rounded-lg border border-[#5a4632]/12 bg-white/25 p-5">
                            <p className="mb-4 text-xs text-[#5a4632]/45">내 오브젝트</p>
                            <div className="grid place-items-center rounded-lg border border-[#5a4632]/10 bg-white/30 px-4 py-7 text-[#5a4632]/45">
                              {selectedObject ? (
                                <img src={selectedObject.image} alt="" className="h-24 w-24 object-contain" />
                              ) : (
                                <Archive size={32} />
                              )}
                            </div>
                            <p className="mt-4 truncate text-sm text-[#5a4632]">{selectedObject?.label ?? "알 수 없는 오브젝트"}</p>
                            <p className="mt-1 text-xs text-[#5a4632]/45">이 글과 함께 광장에 놓인 오브젝트</p>
                          </aside>
                        </div>
                      </div>
                    ) : (
                      <div className="grid h-full place-items-center text-center">
                        <div>
                          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/65">
                            <Archive size={20} />
                          </div>
                          <h3 className="text-lg font-normal text-[#5a4632]">기록을 선택해주세요.</h3>
                          <p className="mt-2 text-sm text-[#5a4632]/55">선택한 광장 글의 자세한 내용이 이곳에 표시됩니다.</p>
                        </div>
                      </div>
                    )}
                  </article>
                </section>
              )}
            </section>
          </div>
        </div>
      </main>

      {isEditingNickname && (
        <ProfileEditModal
          nickname={nicknameDraft || nickname}
          isSaving={isSavingProfile}
          onClose={handleCancelEdit}
          onSave={(value) => void handleSaveProfile(value)}
        />
      )}
    </div>
  );
}

export default MyPage;
