import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { MyPageActivitySection } from "../mypage/components/MyPageActivitySection";
import { MyPageProfileSummary } from "../mypage/components/MyPageProfileSummary";
import {
  AccountWithdrawalModal,
  EmailEditModal,
  NicknameEditModal,
  PasswordEditModal,
  ProfileEditModal,
} from "../mypage/components/ProfileModals";
import type {
  AccountWithdrawalValue,
  EmailEditValue,
  NicknameEditValue,
  PasswordEditValue,
  ProfileModalKind,
} from "../mypage/components/ProfileModals";
import type { ArchiveRecord, MyPageView } from "../mypage/types";
import { useRoomObjectCatalog } from "../../hooks/useRoomObjectCatalog";
import { useResponsiveStageWidth } from "../../hooks/useResponsiveStageWidth";
import { fetchUserCreatedPlazas, fetchUserPlazaEntries } from "../../services/plazaService";
import {
  deleteUserAccount,
  fetchUserProfile,
  sendUserEmailChangeCode,
  updateUserEmail,
  updateUserProfile,
} from "../../services/userService";
import type { Plaza } from "../../types/plaza";
import {
  clearAuthenticated,
  normalizeProfileNickname,
  setCurrentUserIsAdmin,
  setProfileEmail,
  setProfileNickname,
} from "../../utils/authSession";

type ProfileNotice = {
  message: string;
  tone: "success" | "error";
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
const LOCAL_AUTH_PROVIDER = "LOCAL";
const SOCIAL_EMAIL_CHANGE_BLOCK_MESSAGE = "소셜로그인 이용자는 이메일 수정이 불가능합니다.";

type MyPageProfile = {
  email: string;
  nickname: string;
  joinedAt: string;
  isAdmin?: boolean;
  authProvider?: string | null;
};

function hasRequiredPasswordSpecialCharacter(value: string) {
  return /[^A-Za-z0-9]/.test(value);
}

function MyPage() {
  useRoomObjectCatalog();

  const navigate = useNavigate();
  const profileNoticeTimerRef = useRef<number | null>(null);

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [authProvider, setAuthProvider] = useState(LOCAL_AUTH_PROVIDER);
  const [activeProfileModal, setActiveProfileModal] = useState<ProfileModalKind | null>(null);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [profileNotice, setProfileNotice] = useState<ProfileNotice | null>(null);
  const [createdPlazas, setCreatedPlazas] = useState<Plaza[]>([]);
  const [archiveRecords, setArchiveRecords] = useState<ArchiveRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<MyPageView>("writtenObjects");

  const stageWidth = useResponsiveStageWidth({
    designWidth: MYPAGE_LAYOUT_WIDTH,
    designHeight: MYPAGE_LAYOUT_HEIGHT,
    pagePaddingX: MYPAGE_PAGE_PADDING_X,
    pagePaddingY: MYPAGE_PAGE_PADDING_Y,
  });
  const stageScale = stageWidth / MYPAGE_LAYOUT_WIDTH;
  const stageHeight = MYPAGE_LAYOUT_HEIGHT * stageScale;
  const isSocialLoginUser = authProvider.trim().toUpperCase() !== LOCAL_AUTH_PROVIDER;

  function applyProfile(profile: MyPageProfile) {
    setNickname(profile.nickname);
    setEmail(profile.email);
    setJoinedAt(profile.joinedAt);
    setAuthProvider(profile.authProvider ?? LOCAL_AUTH_PROVIDER);
    setProfileNickname(profile.nickname);
    setProfileEmail(profile.email);
    setCurrentUserIsAdmin(profile.isAdmin);
  }

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

        applyProfile(profile);
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
    closeProfileNotice();
    setActiveProfileModal("menu");
  }

  function handleCloseProfileModal() {
    if (isSavingProfile) {
      return;
    }

    closeProfileNotice();
    setActiveProfileModal(null);
  }

  function handleOpenProfileModal(kind: ProfileModalKind) {
    if (kind === "email" && isSocialLoginUser) {
      showProfileNotice(SOCIAL_EMAIL_CHANGE_BLOCK_MESSAGE, "error");
      return;
    }

    closeProfileNotice();
    setActiveProfileModal(kind);
  }

  function handleRequestWithdrawal() {
    setActiveProfileModal(null);
    closeProfileNotice();
    setIsWithdrawalOpen(true);
  }

  function handleCloseWithdrawal() {
    if (isDeletingAccount) {
      return;
    }

    setIsWithdrawalOpen(false);
  }

  async function handleSaveNickname(value: NicknameEditValue) {
    const nextNickname = normalizeProfileNickname(value.nickname);

    try {
      setIsSavingProfile(true);
      closeProfileNotice();

      const profile = await updateUserProfile({ nickname: nextNickname });

      applyProfile(profile);
      setActiveProfileModal(null);
      showProfileNotice("닉네임이 변경되었습니다.");
    } catch (caughtError) {
      showProfileNotice(caughtError instanceof Error ? caughtError.message : "닉네임을 수정하지 못했습니다.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSendEmailChangeCode(value: Omit<EmailEditValue, "verificationCode">) {
    const nextEmail = value.newEmail.trim();

    if (!value.currentPassword) {
      showProfileNotice("현재 비밀번호를 입력해주세요.", "error");
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) {
      showProfileNotice("올바른 이메일 형식으로 입력해주세요.", "error");
      return false;
    }

    if (email && email.toLowerCase() === nextEmail.toLowerCase()) {
      showProfileNotice("현재 이메일과 다른 이메일을 입력해주세요.", "error");
      return false;
    }

    try {
      setIsSavingProfile(true);
      closeProfileNotice();

      await sendUserEmailChangeCode({
        currentPassword: value.currentPassword,
        newEmail: nextEmail,
      });

      showProfileNotice("새 이메일로 인증번호가 발송되었습니다.");
      return true;
    } catch (caughtError) {
      showProfileNotice(caughtError instanceof Error ? caughtError.message : "인증번호 전송에 실패했습니다.", "error");
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveEmail(value: EmailEditValue) {
    const nextEmail = value.newEmail.trim();

    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) {
      showProfileNotice("올바른 이메일 형식으로 입력해주세요.", "error");
      return;
    }

    if (!/^\d{6}$/.test(value.verificationCode)) {
      showProfileNotice("인증번호 6자리를 입력해주세요.", "error");
      return;
    }

    try {
      setIsSavingProfile(true);
      closeProfileNotice();

      const profile = await updateUserEmail({
        newEmail: nextEmail,
        verificationCode: value.verificationCode,
      });

      applyProfile(profile);
      setActiveProfileModal(null);
      showProfileNotice("이메일이 변경되었습니다.");
    } catch (caughtError) {
      showProfileNotice(caughtError instanceof Error ? caughtError.message : "이메일을 변경하지 못했습니다.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSavePassword(value: PasswordEditValue) {
    if (!value.currentPassword) {
      showProfileNotice("현재 비밀번호를 입력해주세요.", "error");
      return;
    }

    if (!value.newPassword) {
      showProfileNotice("새 비밀번호를 입력해주세요.", "error");
      return;
    }

    if (value.newPassword.length < PASSWORD_MIN_LENGTH || !hasRequiredPasswordSpecialCharacter(value.newPassword)) {
      showProfileNotice("새 비밀번호는 8자 이상이고 특수문자를 포함해야 합니다.", "error");
      return;
    }

    if (value.newPassword !== value.newPasswordConfirm) {
      showProfileNotice("새 비밀번호 확인이 일치하지 않습니다.", "error");
      return;
    }

    try {
      setIsSavingProfile(true);
      closeProfileNotice();

      const profile = await updateUserProfile({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
      });

      applyProfile(profile);
      setActiveProfileModal(null);
      showProfileNotice("비밀번호가 변경되었습니다.");
    } catch (caughtError) {
      showProfileNotice(caughtError instanceof Error ? caughtError.message : "비밀번호를 변경하지 못했습니다.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleConfirmWithdrawal(value: AccountWithdrawalValue) {
    if (!value.currentPassword) {
      showProfileNotice("현재 비밀번호를 입력해주세요.", "error");
      return;
    }

    try {
      setIsDeletingAccount(true);
      closeProfileNotice();

      await deleteUserAccount({ currentPassword: value.currentPassword });
      clearAuthenticated();
      navigate("/", { replace: true });
    } catch (caughtError) {
      showProfileNotice(caughtError instanceof Error ? caughtError.message : "회원탈퇴에 실패했습니다.", "error");
    } finally {
      setIsDeletingAccount(false);
    }
  }

  // 헤더 로그아웃 버튼과 동일하게 인증 플래그를 지우고 랜딩 페이지로 이동합니다.
  function handleLogout() {
    clearAuthenticated();
    navigate("/", { replace: true });
  }

  const ProfileNoticeIcon = profileNotice?.tone === "error" ? CircleAlert : CheckCircle2;
  const profileNoticeIconClass = profileNotice?.tone === "error"
    ? "border-[#b36a5e]/30 bg-[#f4dfd9] text-[#c86f67]"
    : "border-[#7c9b78]/30 bg-[#edf5e7] text-[#5f875b]";
  const profileNoticeMessageClass = profileNotice?.tone === "error" ? "text-[#c86f67]" : "";

  return (
    <div className="mw-app min-h-screen flex flex-col select-none">
      <AppHeader />

      {profileNotice && (
        <div className="fixed left-1/2 top-6 z-[120] w-[min(420px,calc(100vw-32px))] -translate-x-1/2">
          <div className="mw-surface flex items-center gap-3 rounded-xl bg-[#fffbf6f2] px-4 py-3 text-[#5a4632] shadow-xl backdrop-blur-sm">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border ${profileNoticeIconClass}`}>
              <ProfileNoticeIcon size={17} />
            </span>
            <p className={`min-w-0 flex-1 text-sm leading-5 ${profileNoticeMessageClass}`}>{profileNotice.message}</p>
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
            <MyPageProfileSummary
              nickname={nickname}
              email={email}
              joinedAt={joinedAt}
              isProfileLoading={isProfileLoading}
              isSavingProfile={isSavingProfile}
              onEditProfile={handleStartEdit}
              onLogout={handleLogout}
            />

            <MyPageActivitySection
              activeView={activeView}
              archiveRecords={archiveRecords}
              createdPlazas={createdPlazas}
              isActivityLoading={isActivityLoading}
              selectedRecordId={selectedRecordId}
              onChangeView={setActiveView}
              onSelectRecord={setSelectedRecordId}
              onCreatePlaza={() => navigate("/plaza")}
              onOpenPlaza={(plazaId) => navigate(`/plaza/${plazaId}`)}
            />
          </div>
        </div>
      </main>

      {activeProfileModal === "menu" && (
        <ProfileEditModal
          nickname={nickname}
          email={email}
          isSaving={isSavingProfile}
          onClose={handleCloseProfileModal}
          onEditNickname={() => handleOpenProfileModal("nickname")}
          onEditEmail={() => handleOpenProfileModal("email")}
          onEditPassword={() => handleOpenProfileModal("password")}
          onRequestWithdrawal={handleRequestWithdrawal}
        />
      )}

      {activeProfileModal === "nickname" && (
        <NicknameEditModal
          nickname={nickname}
          isSaving={isSavingProfile}
          onClose={handleCloseProfileModal}
          onCancel={() => handleOpenProfileModal("menu")}
          onSave={(value) => void handleSaveNickname(value)}
        />
      )}

      {activeProfileModal === "email" && (
        <EmailEditModal
          currentEmail={email}
          isSaving={isSavingProfile}
          onClose={handleCloseProfileModal}
          onCancel={() => handleOpenProfileModal("menu")}
          onSendCode={(value) => handleSendEmailChangeCode(value)}
          onSave={(value) => void handleSaveEmail(value)}
        />
      )}

      {activeProfileModal === "password" && (
        <PasswordEditModal
          isSaving={isSavingProfile}
          onClose={handleCloseProfileModal}
          onCancel={() => handleOpenProfileModal("menu")}
          onSave={(value) => void handleSavePassword(value)}
        />
      )}

      {isWithdrawalOpen && (
        <AccountWithdrawalModal
          isDeleting={isDeletingAccount}
          onClose={handleCloseWithdrawal}
          onConfirm={(value) => void handleConfirmWithdrawal(value)}
        />
      )}
    </div>
  );
}

export default MyPage;
