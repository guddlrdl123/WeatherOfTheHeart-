import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import {
  AuthApiError,
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetCode,
} from "../../services/authService";

const CODE_LENGTH = 6;
const RESET_CODE_EXPIRES_SECONDS = 10 * 60;
const PASSWORD_MIN_LENGTH = 8;
const EMPTY_CODE_DIGITS = Array.from({ length: CODE_LENGTH }, () => "");

function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

function hasRequiredPasswordSpecialCharacter(value: string) {
  return /[^A-Za-z0-9]/.test(value);
}

function formatRemainingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

type ResetStep = "request" | "code" | "password" | "done";

export function ResetPasswordPage() {
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [step, setStep] = useState<ResetStep>("request");
  const [email, setEmail] = useState("");
  const [codeDigits, setCodeDigits] = useState<string[]>(EMPTY_CODE_DIGITS);
  const [verifiedCode, setVerifiedCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const verificationCode = codeDigits.join("");
  const isCodeFlowActive = step === "code" || step === "password";
  const isCodeExpired = isCodeFlowActive && remainingSeconds <= 0;
  const remainingTimeText = formatRemainingTime(remainingSeconds);

  useEffect(() => {
    if (!isCodeFlowActive || remainingSeconds <= 0) {
      return;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isCodeFlowActive, remainingSeconds]);

  function focusCodeInput(index: number) {
    window.setTimeout(() => codeInputRefs.current[index]?.focus(), 0);
  }

  function moveToCodeStep(normalizedEmail: string) {
    setEmail(normalizedEmail);
    setCodeDigits([...EMPTY_CODE_DIGITS]);
    setVerifiedCode("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setRemainingSeconds(RESET_CODE_EXPIRES_SECONDS);
    setStep("code");
    focusCodeInput(0);
  }

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();

    if (!isValidEmail(normalizedEmail)) {
      setError("올바른 이메일 형식으로 입력해 주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      await requestPasswordReset(normalizedEmail);
      moveToCodeStep(normalizedEmail);
    } catch (caughtError) {
      if (caughtError instanceof AuthApiError && caughtError.code === "USER_001") {
        moveToCodeStep(normalizedEmail);
        return;
      }

      setError(caughtError instanceof AuthApiError ? caughtError.message : "비밀번호 재설정 메일 발송에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCodeDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...codeDigits];
    nextDigits[index] = digit;
    setCodeDigits(nextDigits);

    if (digit && index < CODE_LENGTH - 1) {
      focusCodeInput(index + 1);
    }
  }

  function handleCodeKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !codeDigits[index] && index > 0) {
      focusCodeInput(index - 1);
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusCodeInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      focusCodeInput(index + 1);
    }
  }

  function handleCodePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pastedCode = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);

    if (!pastedCode) {
      return;
    }

    event.preventDefault();

    const nextDigits = [...EMPTY_CODE_DIGITS];
    pastedCode.split("").forEach((digit, index) => {
      nextDigits[index] = digit;
    });
    setCodeDigits(nextDigits);
    focusCodeInput(Math.min(pastedCode.length, CODE_LENGTH) - 1);
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (verificationCode.length !== CODE_LENGTH) {
      setError("인증번호를 입력해 주세요.");
      return;
    }

    if (isCodeExpired) {
      setError("인증번호가 만료되었습니다. 다시 받아 주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      await verifyPasswordResetCode({ email, token: verificationCode });
      setVerifiedCode(verificationCode);
      setNewPassword("");
      setNewPasswordConfirm("");
      setStep("password");
    } catch (caughtError) {
      setError(caughtError instanceof AuthApiError ? caughtError.message : "인증번호 확인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isCodeExpired) {
      setError("인증번호가 만료되었습니다. 다시 받아 주세요.");
      return;
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH || !hasRequiredPasswordSpecialCharacter(newPassword)) {
      setError("새 비밀번호는 8자 이상이고 특수문자를 포함해야 합니다.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    try {
      setIsSubmitting(true);
      await confirmPasswordReset({
        email,
        token: verifiedCode,
        newPassword,
      });
      setStep("done");
    } catch (caughtError) {
      setError(caughtError instanceof AuthApiError ? caughtError.message : "비밀번호 재설정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    setError("");

    try {
      setIsSubmitting(true);
      await requestPasswordReset(email);
      setCodeDigits([...EMPTY_CODE_DIGITS]);
      setVerifiedCode("");
      setRemainingSeconds(RESET_CODE_EXPIRES_SECONDS);
      focusCodeInput(0);
    } catch (caughtError) {
      setError(caughtError instanceof AuthApiError ? caughtError.message : "인증번호 재발송에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mw-app h-[100dvh] overflow-hidden">
      <main className="flex h-full -translate-y-8 items-center justify-center px-5">
        <div className="w-full max-w-[420px]">
          <Link
            to="/"
            className="mb-6 block text-center text-2xl font-semibold text-[#5a4632]"
            style={{ fontFamily: "'Noto Serif KR', Georgia, serif" }}
          >
            마음의 날씨
          </Link>

          <section className="mw-surface mx-auto flex w-full max-w-[420px] flex-col gap-5 rounded-xl p-8 text-[#5a4632] select-none">
            <div>
              <p className="mb-2 text-[0.68rem] tracking-[0.2em] text-[#e0d2ba]">RESET PASSWORD</p>
              <h1 className="text-xl font-normal">비밀번호 찾기</h1>
              <p className="mt-2 text-sm leading-6 text-[#5a4632]/58">
                {step === "request" && "이메일로 인증번호를 받을 수 있어요."}
                {step === "code" && "메일로 받은 6자리 인증번호를 입력해 주세요."}
                {step === "password" && "새 비밀번호를 입력해 주세요."}
                {step === "done" && "비밀번호 재설정이 완료되었습니다."}
              </p>
            </div>

            {step === "request" && (
              <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2 text-sm">
                  이메일
                  <input
                    className="mw-input h-11 px-3 text-sm"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    disabled={isSubmitting}
                  />
                </label>

                {error && <p className="text-sm text-[#e6a1a1]">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mw-button-solid mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] px-3 text-sm disabled:opacity-50"
                >
                  다음
                </button>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
                {/* <div className="rounded-lg border border-[#8aa178]/25 bg-[#8aa178]/10 px-4 py-3 text-sm leading-6 text-[#5a4632]/65">
                  <span className="font-medium text-[#5f754f]">{email}</span> 주소로 비밀번호 재설정 안내를
                  보냈습니다. 메일이 오지 않는다면 이메일 주소를 다시 확인해 주세요.
                </div> */}

                <div className="flex flex-col gap-2 text-sm">
                  인증번호
                  <div className="grid grid-cols-6 gap-2">
                    {codeDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          codeInputRefs.current[index] = element;
                        }}
                        className="mw-input h-12 w-full px-0 text-center text-lg font-semibold tabular-nums"
                        value={digit}
                        onChange={(event) => handleCodeDigitChange(index, event.target.value)}
                        onKeyDown={(event) => handleCodeKeyDown(index, event)}
                        onPaste={handleCodePaste}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        aria-label={`인증번호 ${index + 1}번째 자리`}
                        disabled={isSubmitting}
                      />
                    ))}
                  </div>
                  <p
                    className={`text-xs ${isCodeExpired ? "text-[#e6a1a1]" : "text-[#5a4632]/55"
                      }`}
                    role="status"
                  >
                    {isCodeExpired
                      ? "인증번호가 만료되었습니다."
                      : `인증번호 유효시간 ${remainingTimeText}`}
                  </p>
                </div>

                {error && <p className="text-sm text-[#e6a1a1]">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting || isCodeExpired}
                  className="mw-button-solid mt-1 h-11 rounded-[8px] px-3 text-sm disabled:opacity-50"
                >
                  다음
                </button>

                <div className="flex items-center justify-center gap-4 text-xs">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isSubmitting}
                    className="text-[#5a4632]/55 hover:text-[#5a4632] disabled:opacity-50"
                  >
                    인증번호 다시 받기
                  </button>
                </div>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                <p
                  className={`text-xs ${isCodeExpired ? "text-[#e6a1a1]" : "text-[#5a4632]/55"
                    }`}
                  role="status"
                >
                  {isCodeExpired
                    ? "인증번호가 만료되었습니다."
                    : `인증번호 유효시간 ${remainingTimeText}`}
                </p>

                <label className="flex flex-col gap-2 text-sm">
                  새 비밀번호
                  <div className="relative">
                    <input
                      className="mw-input h-11 px-3 pr-11 text-sm"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((current) => !current)}
                      className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-[#5a4632]/60 hover:text-[#5a4632]"
                      aria-label={showNewPassword ? "새 비밀번호 숨기기" : "새 비밀번호 보기"}
                      title={showNewPassword ? "새 비밀번호 숨기기" : "새 비밀번호 보기"}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  새 비밀번호 확인
                  <div className="relative">
                    <input
                      className="mw-input h-11 px-3 pr-11 text-sm"
                      type={showNewPasswordConfirm ? "text" : "password"}
                      value={newPasswordConfirm}
                      onChange={(event) => setNewPasswordConfirm(event.target.value)}
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPasswordConfirm((current) => !current)}
                      className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-[#5a4632]/60 hover:text-[#5a4632]"
                      aria-label={showNewPasswordConfirm ? "새 비밀번호 확인 숨기기" : "새 비밀번호 확인 보기"}
                      title={showNewPasswordConfirm ? "새 비밀번호 확인 숨기기" : "새 비밀번호 확인 보기"}
                    >
                      {showNewPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                {error && <p className="text-sm text-[#e6a1a1]">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting || isCodeExpired}
                  className="mw-button-solid mt-1 h-11 rounded-[8px] px-3 text-sm disabled:opacity-50"
                >
                  비밀번호 변경
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("code");
                    setError("");
                    focusCodeInput(0);
                  }}
                  disabled={isSubmitting}
                  className="text-xs text-[#5a4632]/55 hover:text-[#5a4632] disabled:opacity-50"
                >
                  인증번호 다시 입력
                </button>
              </form>
            )}

            {step === "done" && (
              <div className="rounded-lg border border-[#8aa178]/25 bg-[#8aa178]/10 px-4 py-5">
                <div className="mb-3 flex items-center gap-2 text-sm text-[#5f754f]">
                  <CheckCircle2 size={17} />
                  비밀번호 변경 완료
                </div>
                <p className="text-sm leading-6 text-[#5a4632]/65">새 비밀번호로 다시 로그인해 주세요.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
