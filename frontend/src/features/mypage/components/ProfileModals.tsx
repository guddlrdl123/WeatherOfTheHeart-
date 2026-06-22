import { useEffect, useState } from "react";
import { CircleAlert, Eye, EyeOff, KeyRound, Mail, UserRound, X } from "lucide-react";
import { PROFILE_NICKNAME_MAX_LENGTH } from "../../../utils/authSession";

export type ProfileModalKind = "menu" | "nickname" | "email" | "password";

export type NicknameEditValue = {
  nickname: string;
};

export type EmailEditValue = {
  currentPassword: string;
  newEmail: string;
  verificationCode: string;
};

export type PasswordEditValue = {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
};

export type AccountWithdrawalValue = {
  currentPassword: string;
  verificationCode: string;
};

const EMAIL_VERIFICATION_CODE_TTL_SECONDS = 10 * 60;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const PASSWORD_SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;
const EMAIL_FORMAT_ERROR_MESSAGE = "올바른 이메일 형식으로 입력해주세요.";
const PASSWORD_FORMAT_ERROR_MESSAGE = "새 비밀번호는 8자 이상이고 특수문자를 포함해야 합니다.";
const PASSWORD_CONFIRM_ERROR_MESSAGE = "새 비밀번호 확인이 일치하지 않습니다.";

function isValidEmailFormat(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

function isValidPasswordFormat(value: string) {
  return value.length >= 8 && PASSWORD_SPECIAL_CHARACTER_PATTERN.test(value);
}

function formatVerificationTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

type ProfileEditModalProps = {
  nickname: string;
  email: string;
  isSaving: boolean;
  onClose: () => void;
  onEditNickname: () => void;
  onEditEmail: () => void;
  onEditPassword: () => void;
  onRequestWithdrawal: () => void;
};

export function ProfileEditModal({
  nickname,
  email,
  isSaving,
  onClose,
  onEditNickname,
  onEditEmail,
  onEditPassword,
  onRequestWithdrawal,
}: ProfileEditModalProps) {
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
        }}
      >
        <div className="mb-8 flex items-start justify-between gap-4">
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

        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserRound size={16} className="shrink-0 text-[#9b6b54]" />
              <div className="min-w-0">
                <p className="text-[11px] text-[#5a4632]/42">닉네임</p>
                <p className="truncate text-sm">{nickname}</p>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-md border border-[#9b6b54]/30 px-2 py-1 text-xs hover:bg-[#9b6b54]/10 disabled:opacity-50"
              onClick={onEditNickname}
              disabled={isSaving}
            >
              수정
            </button>
          </div>

          <div className="border-t border-[#b36a5e]/18 pt-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Mail size={16} className="shrink-0 text-[#9b6b54]" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[#5a4632]/42">이메일</p>
                  <p className="truncate text-sm">{email || "이메일 정보 없음"}</p>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-md border border-[#9b6b54]/30 px-2 py-1 text-xs hover:bg-[#9b6b54]/10 disabled:opacity-50"
                onClick={onEditEmail}
                disabled={isSaving}
              >
                수정
              </button>
            </div>
          </div>

          <div className="border-t border-[#b36a5e]/18 pt-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <KeyRound size={16} className="shrink-0 text-[#9b6b54]" />
                <div className="min-w-0">
                  <p className="truncate text-sm">비밀번호</p>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-md border border-[#9b6b54]/30 px-2 py-1 text-xs hover:bg-[#9b6b54]/10 disabled:opacity-50"
                onClick={onEditPassword}
                disabled={isSaving}
              >
                수정
              </button>
            </div>
          </div>

          <div className="border-t border-[#b36a5e]/18 pt-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex items-center gap-3">
                <UserRound size={16} className="shrink-0 text-[#9b6b54]" />
                <p className="text-sm">회원탈퇴</p>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9]/45 px-2 py-1 text-xs text-[#9f5c53] hover:bg-[#f4dfd9] disabled:opacity-50"
                onClick={onRequestWithdrawal}
                disabled={isSaving}
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

type NicknameEditModalProps = {
  nickname: string;
  isSaving: boolean;
  onClose: () => void;
  onCancel: () => void;
  onSave: (value: NicknameEditValue) => void;
};

export function NicknameEditModal({ nickname, isSaving, onClose, onCancel, onSave }: NicknameEditModalProps) {
  const [value, setValue] = useState<NicknameEditValue>({ nickname });

  function handleChange(nextNickname: string) {
    setValue({ nickname: nextNickname.slice(0, PROFILE_NICKNAME_MAX_LENGTH) });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-sm select-none"
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className="w-full max-w-[500px] rounded-xl bg-[#fffbf6f2] p-6 text-[#5a4632] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nickname-edit-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(value);
        }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.18em] text-[#5a4632]/40">PROFILE</p>
            <h2 id="nickname-edit-title" className="mt-3 text-2xl font-normal leading-9 text-[#5a4632]">닉네임 수정</h2>
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

        <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
          <span className="block text-xs text-[#5a4632]/55">닉네임</span>
          <input
            className="mw-input h-10 px-3 text-sm"
            value={value.nickname}
            placeholder="나그네"
            maxLength={PROFILE_NICKNAME_MAX_LENGTH}
            onChange={(event) => handleChange(event.target.value)}
            disabled={isSaving}
            autoFocus
          />
          <span className="text-right text-[0.68rem] text-[#5a4632]/55">
            {value.nickname.length}/{PROFILE_NICKNAME_MAX_LENGTH}
          </span>
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-[#9b6b54]/60 bg-[#9b6b54]/10 hover:bg-[#9b6b54]/20 rounded-md px-4 py-2 text-sm text-[#9b6b54]/80"
            disabled={isSaving}
          >
            취소
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-[#9b6b54] px-4 py-2 text-sm text-white hover:bg-[#875a47] disabled:opacity-50"
            disabled={isSaving}
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
}

type EmailEditModalProps = {
  currentEmail: string;
  isSaving: boolean;
  onClose: () => void;
  onCancel: () => void;
  onSendCode: (value: Omit<EmailEditValue, "verificationCode">) => Promise<boolean>;
  onSave: (value: EmailEditValue) => void;
};

export function EmailEditModal({ currentEmail, isSaving, onClose, onCancel, onSendCode, onSave }: EmailEditModalProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [value, setValue] = useState<EmailEditValue>({
    currentPassword: "",
    newEmail: "",
    verificationCode: "",
  });
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [remainingVerificationSeconds, setRemainingVerificationSeconds] = useState(0);
  const [isVerificationExpired, setIsVerificationExpired] = useState(false);
  const [hasNewEmailBlurred, setHasNewEmailBlurred] = useState(false);
  const [newEmailError, setNewEmailError] = useState("");

  useEffect(() => {
    if (!isVerificationSent || isVerificationExpired) {
      return;
    }

    const timerId = window.setInterval(() => {
      setRemainingVerificationSeconds((seconds) => {
        if (seconds <= 1) {
          setIsVerificationExpired(true);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isVerificationSent, isVerificationExpired]);

  function updateValue(key: keyof EmailEditValue, nextValue: string) {
    setValue((previousValue) => {
      const normalizedValue = key === "verificationCode" ? nextValue.replace(/\D/g, "").slice(0, 6) : nextValue;
      const nextState = {
        ...previousValue,
        [key]: normalizedValue,
      };

      if (key === "newEmail") {
        setIsVerificationSent(false);
        setSentEmail("");
        setRemainingVerificationSeconds(0);
        setIsVerificationExpired(false);
        nextState.verificationCode = "";
      }

      return nextState;
    });
  }

  function getNewEmailFormatError(nextEmail: string) {
    return nextEmail.trim() && !isValidEmailFormat(nextEmail) ? EMAIL_FORMAT_ERROR_MESSAGE : "";
  }

  function handleNewEmailChange(nextEmail: string) {
    updateValue("newEmail", nextEmail);

    if (hasNewEmailBlurred) {
      setNewEmailError(getNewEmailFormatError(nextEmail));
    }
  }

  function handleNewEmailBlur() {
    setHasNewEmailBlurred(true);
    setNewEmailError(getNewEmailFormatError(value.newEmail));
  }

  async function handleSendCode() {
    const nextEmail = value.newEmail.trim();

    if (!isValidEmailFormat(nextEmail)) {
      setHasNewEmailBlurred(true);
      setNewEmailError(EMAIL_FORMAT_ERROR_MESSAGE);
      return;
    }

    const didSend = await onSendCode({
      currentPassword: value.currentPassword,
      newEmail: nextEmail,
    });

    if (!didSend) {
      return;
    }

    setValue((previousValue) => ({
      ...previousValue,
      newEmail: nextEmail,
      verificationCode: "",
    }));
    setSentEmail(nextEmail);
    setIsVerificationSent(true);
    setRemainingVerificationSeconds(EMAIL_VERIFICATION_CODE_TTL_SECONDS);
    setIsVerificationExpired(false);
    setNewEmailError("");
  }

  function handleSubmitEmailEdit() {
    const nextEmail = value.newEmail.trim();

    if (!isValidEmailFormat(nextEmail)) {
      setHasNewEmailBlurred(true);
      setNewEmailError(EMAIL_FORMAT_ERROR_MESSAGE);
      return;
    }

    if (!isVerificationSent || sentEmail !== nextEmail || isVerificationExpired) {
      return;
    }

    onSave(value);
  }

  const canSubmit = isVerificationSent && sentEmail === value.newEmail.trim() && !isVerificationExpired;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-sm select-none"
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className="w-full max-w-[540px] max-h-[calc(100vh-64px)] overflow-y-auto rounded-xl bg-[#fffbf6f2] p-6 text-[#5a4632] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-edit-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmitEmailEdit();
        }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.18em] text-[#5a4632]/40">PROFILE</p>
            <h2 id="email-edit-title" className="mt-3 text-2xl font-normal leading-9 text-[#5a4632]">이메일 수정</h2>
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
          {/* <div className="rounded-lg border border-[#5a4632]/12 bg-white/25 px-4 py-3 text-sm">
            <p className="break-all">{currentEmail || "이메일 정보 없음"}</p>
          </div> */}

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
                autoFocus
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

          <div className="flex flex-col gap-2 text-sm text-[#5a4632]">
            <span className="block text-xs text-[#5a4632]/55">새 이메일</span>
            <div className="flex gap-2">
              <input
                className="mw-input h-10 min-w-0 flex-1 px-3 text-sm"
                placeholder={currentEmail || "현재 이메일 정보 없음"}
                value={value.newEmail}
                onChange={(event) => handleNewEmailChange(event.target.value)}
                onBlur={handleNewEmailBlur}
                disabled={isSaving}
                autoComplete="email"
              />
              <button
                type="button"
                onClick={() => void handleSendCode()}
                disabled={isSaving}
                className="mw-button h-10 shrink-0 rounded-md px-3 text-sm disabled:opacity-50"
              >
                {isVerificationSent && !isVerificationExpired ? "재전송" : "인증"}
              </button>
            </div>
            {newEmailError ? (
              <span className="text-xs text-[#c86f67]">{newEmailError}</span>
            ) : isVerificationSent && (
              <span className={isVerificationExpired ? "text-xs text-[#c86f67]" : "text-xs text-[#9b6b54]/80"}>
                {isVerificationExpired ? "인증번호가 만료되었습니다." : `인증번호가 발송되었습니다. ${formatVerificationTime(remainingVerificationSeconds)}`}
              </span>
            )}
          </div>

          {isVerificationSent && (
            <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
              <span className="block text-xs text-[#5a4632]/55">인증번호</span>
              <input
                className="mw-input h-10 px-3 text-sm"
                value={value.verificationCode}
                inputMode="numeric"
                maxLength={6}
                placeholder="숫자 6자리"
                onChange={(event) => updateValue("verificationCode", event.target.value)}
                disabled={isSaving}
              />
            </label>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-[#9b6b54]/60 bg-[#9b6b54]/10 hover:bg-[#9b6b54]/20 rounded-md px-4 py-2 text-sm text-[#9b6b54]/80"
            disabled={isSaving}
          >
            취소
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-[#9b6b54] px-4 py-2 text-sm text-white hover:bg-[#875a47] disabled:opacity-50"
            disabled={isSaving || !canSubmit}
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
}

type PasswordEditModalProps = {
  isSaving: boolean;
  onClose: () => void;
  onCancel: () => void;
  onSave: (value: PasswordEditValue) => void;
};

export function PasswordEditModal({ isSaving, onClose, onCancel, onSave }: PasswordEditModalProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [value, setValue] = useState<PasswordEditValue>({
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });
  const [hasNewPasswordBlurred, setHasNewPasswordBlurred] = useState(false);
  const [hasNewPasswordConfirmBlurred, setHasNewPasswordConfirmBlurred] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState("");
  const [newPasswordConfirmError, setNewPasswordConfirmError] = useState("");

  function updateValue(key: keyof PasswordEditValue, nextValue: string) {
    setValue((previousValue) => ({
      ...previousValue,
      [key]: nextValue,
    }));
  }

  function getNewPasswordFormatError(nextPassword: string) {
    return nextPassword && !isValidPasswordFormat(nextPassword) ? PASSWORD_FORMAT_ERROR_MESSAGE : "";
  }

  function getNewPasswordConfirmError(nextPassword: string, nextPasswordConfirm: string) {
    return nextPasswordConfirm && nextPassword !== nextPasswordConfirm ? PASSWORD_CONFIRM_ERROR_MESSAGE : "";
  }

  function handleNewPasswordChange(nextPassword: string) {
    updateValue("newPassword", nextPassword);

    if (hasNewPasswordBlurred) {
      setNewPasswordError(getNewPasswordFormatError(nextPassword));
    }

    if (hasNewPasswordConfirmBlurred) {
      setNewPasswordConfirmError(getNewPasswordConfirmError(nextPassword, value.newPasswordConfirm));
    }
  }

  function handleNewPasswordBlur() {
    setHasNewPasswordBlurred(true);
    setNewPasswordError(getNewPasswordFormatError(value.newPassword));
  }

  function handleNewPasswordConfirmChange(nextPasswordConfirm: string) {
    updateValue("newPasswordConfirm", nextPasswordConfirm);

    if (hasNewPasswordConfirmBlurred) {
      setNewPasswordConfirmError(getNewPasswordConfirmError(value.newPassword, nextPasswordConfirm));
    }
  }

  function handleNewPasswordConfirmBlur() {
    setHasNewPasswordConfirmBlurred(true);
    setNewPasswordConfirmError(getNewPasswordConfirmError(value.newPassword, value.newPasswordConfirm));
  }

  function handleSubmitPasswordEdit() {
    const nextNewPasswordError = getNewPasswordFormatError(value.newPassword);
    const nextNewPasswordConfirmError = getNewPasswordConfirmError(value.newPassword, value.newPasswordConfirm);

    if (nextNewPasswordError || nextNewPasswordConfirmError) {
      setHasNewPasswordBlurred(true);
      setHasNewPasswordConfirmBlurred(true);
      setNewPasswordError(nextNewPasswordError);
      setNewPasswordConfirmError(nextNewPasswordConfirmError);
      return;
    }

    onSave(value);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-sm select-none"
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className="w-full max-w-[520px] rounded-xl bg-[#fffbf6f2] p-6 text-[#5a4632] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-edit-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmitPasswordEdit();
        }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.18em] text-[#5a4632]/40">PROFILE</p>
            <h2 id="password-edit-title" className="mt-3 text-2xl font-normal leading-9 text-[#5a4632]">비밀번호 수정</h2>
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
                autoFocus
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
                onChange={(event) => handleNewPasswordChange(event.target.value)}
                onBlur={handleNewPasswordBlur}
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
            {newPasswordError && <span className="mt-2 block text-xs text-[#c86f67]">{newPasswordError}</span>}
          </label>
          <label className="block">
            <span className="mb-2 block text-xs text-[#5a4632]/55">새 비밀번호 확인</span>
            <div className="relative">
              <input
                className="mw-input h-10 px-3 pr-10 text-sm"
                type={showNewPasswordConfirm ? "text" : "password"}
                value={value.newPasswordConfirm}
                onChange={(event) => handleNewPasswordConfirmChange(event.target.value)}
                onBlur={handleNewPasswordConfirmBlur}
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
            {newPasswordConfirmError && <span className="mt-2 block text-xs text-[#c86f67]">{newPasswordConfirmError}</span>}
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-[#9b6b54]/60 bg-[#9b6b54]/10 hover:bg-[#9b6b54]/20 rounded-md px-4 py-2 text-sm text-[#9b6b54]/80"
            disabled={isSaving}
          >
            취소
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-[#9b6b54] px-4 py-2 text-sm text-white hover:bg-[#875a47] disabled:opacity-50"
            disabled={isSaving}
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
}

type AccountWithdrawalModalProps = {
  email: string;
  isDeleting: boolean;
  isSendingCode: boolean;
  isSocialLoginUser: boolean;
  onClose: () => void;
  onSendCode: () => Promise<boolean>;
  onConfirm: (value: AccountWithdrawalValue) => void;
};

export function AccountWithdrawalModal({
  email,
  isDeleting,
  isSendingCode,
  isSocialLoginUser,
  onClose,
  onSendCode,
  onConfirm,
}: AccountWithdrawalModalProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [value, setValue] = useState<AccountWithdrawalValue>({
    currentPassword: "",
    verificationCode: "",
  });
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [remainingVerificationSeconds, setRemainingVerificationSeconds] = useState(0);
  const [isVerificationExpired, setIsVerificationExpired] = useState(false);

  useEffect(() => {
    if (!isVerificationSent || isVerificationExpired) {
      return;
    }

    const timerId = window.setInterval(() => {
      setRemainingVerificationSeconds((seconds) => {
        if (seconds <= 1) {
          setIsVerificationExpired(true);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isVerificationSent, isVerificationExpired]);

  function updateValue(key: keyof AccountWithdrawalValue, nextValue: string) {
    setValue((previousValue) => ({
      ...previousValue,
      [key]: key === "verificationCode" ? nextValue.replace(/\D/g, "").slice(0, 6) : nextValue,
    }));
  }

  async function handleSendCode() {
    const didSend = await onSendCode();

    if (!didSend) {
      return;
    }

    setValue((previousValue) => ({
      ...previousValue,
      verificationCode: "",
    }));
    setIsVerificationSent(true);
    setRemainingVerificationSeconds(EMAIL_VERIFICATION_CODE_TTL_SECONDS);
    setIsVerificationExpired(false);
  }

  function handleSubmit() {
    if (isSocialLoginUser && (!isVerificationSent || isVerificationExpired || value.verificationCode.length !== 6)) {
      return;
    }

    onConfirm(value);
  }

  const isPending = isDeleting || isSendingCode;
  const canSubmit = isSocialLoginUser
    ? isVerificationSent && !isVerificationExpired && value.verificationCode.length === 6
    : true;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-sm select-none"
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className="w-full max-w-[520px] rounded-xl bg-[#fffbf6f2] p-6 text-[#5a4632] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-withdrawal-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="account-withdrawal-title" className="text-2xl font-normal leading-9 text-[#5a4632]">회원탈퇴</h2>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#5a4632]/10 text-[#5a4632] hover:bg-black/5 disabled:opacity-50"
            onClick={onClose}
            disabled={isPending}
            aria-label="닫기"
            title="닫기"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mb-5 flex gap-2 text-xs leading-6 text-[#8f5149]">
          <CircleAlert size={14} className="mt-0.5 shrink-0" />
          <p>회원탈퇴 시 계정은 즉시 삭제되며 복구할 수 없습니다.
            다만 이미 종료된 광장에 남긴 오브젝트와 글은 유지됩니다.</p>
        </div>

        <div className="grid gap-4">
          {isSocialLoginUser ? (
            <>
              <div className="rounded-lg border border-[#b36a5e]/18 bg-white/25 px-4 py-3 text-sm text-[#5a4632]">
                <div className="flex min-w-0 items-center gap-2">
                  <Mail size={15} className="shrink-0 text-[#9b6b54]" />
                  <p className="min-w-0 break-all">{email || "계정 이메일 정보 없음"}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-sm text-[#5a4632]">
                <span className="block text-xs text-[#5a4632]/55">이메일 인증번호</span>
                <div className="flex gap-2">
                  <input
                    className="mw-input h-10 min-w-0 flex-1 px-3 text-sm"
                    value={value.verificationCode}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="숫자 6자리"
                    onChange={(event) => updateValue("verificationCode", event.target.value)}
                    disabled={isPending || !isVerificationSent}
                    autoFocus={isVerificationSent}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendCode()}
                    disabled={isPending}
                    className="mw-button h-10 shrink-0 rounded-md px-3 text-sm disabled:opacity-50"
                  >
                    {isVerificationSent && !isVerificationExpired ? "재전송" : "인증번호 발송"}
                  </button>
                </div>
                {isVerificationSent && (
                  <span className={isVerificationExpired ? "text-xs text-[#c86f67]" : "text-xs text-[#9b6b54]/80"}>
                    {isVerificationExpired ? "인증번호가 만료되었습니다." : `인증번호가 발송되었습니다. ${formatVerificationTime(remainingVerificationSeconds)}`}
                  </span>
                )}
              </div>
            </>
          ) : (
            <label className="block">
              <span className="mb-2 block text-xs text-[#5a4632]/55">현재 비밀번호</span>
              <div className="relative">
                <input
                  className="mw-input h-10 px-3 pr-10 text-sm"
                  type={showCurrentPassword ? "text" : "password"}
                  value={value.currentPassword}
                  onChange={(event) => updateValue("currentPassword", event.target.value)}
                  disabled={isDeleting}
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((current) => !current)}
                  className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-[#5a4632]/60 hover:text-[#5a4632] disabled:opacity-50"
                  disabled={isDeleting}
                  aria-label={showCurrentPassword ? "현재 비밀번호 숨기기" : "현재 비밀번호 보기"}
                  title={showCurrentPassword ? "현재 비밀번호 숨기기" : "현재 비밀번호 보기"}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-[#b36a5e] px-4 py-2 text-sm text-white hover:bg-[#9f5c53] disabled:opacity-50"
            disabled={isPending || !canSubmit}
          >
            탈퇴하기
          </button>
        </div>
      </form>
    </div>
  );
}
