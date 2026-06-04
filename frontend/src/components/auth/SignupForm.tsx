import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { sendEmailVerification, signup, verifyEmail } from "../../services/authService";
import { PROFILE_NICKNAME_MAX_LENGTH, setAuthenticated, setCurrentUserId, setProfileNickname } from "../../utils/authSession";
// import { useAppStore } from "../../stores/AppStore";

// 백엔드 회원가입 API를 호출하고 성공하면 내 방으로 이동시키는 폼입니다.
export function SignupForm() {
    //   const { signup, navigate } = useAppStore();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [isVerificationSent, setIsVerificationSent] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [emailMessage, setEmailMessage] = useState("");
    const [verificationMessage, setVerificationMessage] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [nickname, setNickname] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSendingVerification, setIsSendingVerification] = useState(false);
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    function resetEmailVerification(nextEmail: string) {
        setEmail(nextEmail);
        setVerificationCode("");
        setIsVerificationSent(false);
        setIsEmailVerified(false);
        setVerificationMessage("");
        setEmailMessage("");
    }

    function handleVerificationCodeChange(value: string) {
        setVerificationCode(value.replace(/\D/g, "").slice(0, 6));
    }

    async function handleSendVerificationCode() {
        setError("");
        setEmailMessage("");

        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            setError("올바른 이메일 형식으로 입력해주세요.");
            return;
        }

        try {
            setIsSendingVerification(true);
            await sendEmailVerification(email.trim());
            setVerificationCode("");
            setIsVerificationSent(true);
            setIsEmailVerified(false);
            setEmailMessage("인증번호를 전송했습니다.");
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : "인증번호 전송에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setIsSendingVerification(false);
        }
    }

    async function handleVerifyCode() {
        setError("");
        setVerificationMessage("");

        if (!isVerificationSent) {
            setError("먼저 인증번호를 받아주세요.");
            return;
        }

        if (!/^\d{6}$/.test(verificationCode)) {
            setVerificationMessage("인증번호 6자리를 입력해주세요.");
            return;
        }

        try {
            setIsVerifyingEmail(true);
            await verifyEmail({ email: email.trim(), verificationCode });
            setIsEmailVerified(true);
            setVerificationMessage("이메일 인증이 완료되었습니다.");
        } catch {
            setVerificationMessage("인증번호가 올바르지 않거나 만료되었습니다.");
        } finally {
            setIsVerifyingEmail(false);
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        // 백엔드가 붙기 전에도 사용 흐름을 확인할 수 있도록 기본 검증을 둡니다.
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            setError("올바른 이메일 형식으로 입력해주세요.");
            return;
        }

        if (!isEmailVerified) {
            setError("이메일 인증을 완료해주세요.");
            return;
        }

        if (password.length < 8) {
            setError("비밀번호는 8자 이상이어야 합니다.");
            return;
        }

        if (password !== passwordConfirm) {
            setError("비밀번호 확인이 일치하지 않습니다.");
            return;
        }

        try {
            setIsSubmitting(true);
            const auth = await signup({ email: email.trim(), password, nickname });
            const userId = auth.userId ?? auth.id;

            if (userId) {
                setCurrentUserId(userId);
            }

            setAuthenticated();
            // 회원가입 직후 마이페이지에서 입력한 닉네임이 바로 보이도록 임시 프로필 저장소에 동기화합니다.
            setProfileNickname(auth.nickname ?? nickname);
            navigate("/room", { replace: true });
        } catch {
            setError("회원가입에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="mw-surface mx-auto flex w-full max-w-[440px] flex-col gap-4 rounded-xl p-8 select-none">
            <div>
                <p className="mb-2 text-[0.68rem] tracking-[0.2em] text-[#e0d2ba]">SIGNUP</p>
                {/* <h1 className="text-xl font-normal text-[#e0d2ba]" style={{ fontFamily: "'Noto Serif KR', Georgia, serif" }}>
                    조용한 방 하나 만들기
                </h1> */}
            </div>


            <div className="flex flex-col gap-2 text-sm text-white/54">
                <span>이메일</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                        className="mw-input h-11 px-3 text-sm"
                        value={email}
                        onChange={(event) => resetEmailVerification(event.target.value)}
                    />
                    <button
                        type="button"
                        onClick={handleSendVerificationCode}
                        disabled={isEmailVerified || isSendingVerification}
                        className="mw-button h-11 shrink-0 rounded-[8px] px-3 text-sm disabled:opacity-50"
                    >
                        {isEmailVerified ? "인증완료" : isSendingVerification ? "전송 중" : "인증"}
                    </button>
                </div>
                {emailMessage && (
                    <span className="text-xs text-[#9b6b54]/80">
                        {emailMessage}
                    </span>
                )}
            </div>

            {/* <button type="button" className="border border-[#9b6b54]/60 bg-[#9b6b54]/10 hover:bg-[#9b6b54]/20 rounded-md px-5 py-3 text-sm text-[#9b6b54]/80">
                인증번호 받기
            </button> */}

            {isVerificationSent && (
                <label className="flex flex-col gap-2 text-sm text-white/54">
                    <span>인증번호</span>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            className="mw-input h-11 px-3 text-sm"
                            value={verificationCode}
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="숫자 6자리"
                            disabled={isEmailVerified}
                            onChange={(event) => handleVerificationCodeChange(event.target.value)}
                        />
                        <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={isEmailVerified || isVerifyingEmail}
                            className="mw-button h-11 shrink-0 rounded-[8px] px-3 text-sm disabled:opacity-50"
                        >
                            {isVerifyingEmail ? "확인 중" : "확인"}
                        </button>
                    </div>
                    {verificationMessage && (
                        <span className={isEmailVerified ? "text-xs text-[#6f8f62]" : "text-xs text-[#e6a1a1]"}>
                            {verificationMessage}
                        </span>
                    )}
                </label>
            )}

            <label className="flex flex-col gap-2 text-sm text-white/54">
                닉네임
                <input className="mw-input h-11 px-3 text-sm" value={nickname} maxLength={PROFILE_NICKNAME_MAX_LENGTH} onChange={(event) => setNickname(event.target.value)} />
            </label>

            <label className="flex flex-col gap-2 text-sm text-white/54">
                비밀번호
                <div className="relative">
                    <input
                        className="mw-input h-11 px-3 pr-10 text-sm"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-[#5a4632]/60 hover:text-[#5a4632]"
                        aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                        title={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </label>

            <label className="flex flex-col gap-2 text-sm text-white/54">
                비밀번호 확인
                <div className="relative">
                    <input
                        className="mw-input h-11 px-3 pr-10 text-sm"
                        type={showPasswordConfirm ? "text" : "password"}
                        value={passwordConfirm}
                        onChange={(event) => setPasswordConfirm(event.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPasswordConfirm((prev) => !prev)}
                        className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center text-[#5a4632]/60 hover:text-[#5a4632]"
                        aria-label={showPasswordConfirm ? "비밀번호 확인 숨기기" : "비밀번호 확인 보기"}
                        title={showPasswordConfirm ? "비밀번호 확인 숨기기" : "비밀번호 확인 보기"}
                    >
                        {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </label>

            {error && <p className="text-sm text-[#e6a1a1]">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="mw-button-solid mt-2 h-11 rounded-[8px] px-3 text-sm disabled:opacity-50">
                {isSubmitting ? "가입 중" : "회원가입"}
            </button>

            <p className="text-center text-xs text-white/38">
                이미 계정이 있나요?
                <Link to="/login" state={{ fromLanding: true }} className="ml-2 text-xs text-[#d8bd9a] hover:text-[#ead2b1]">
                    로그인
                </Link>
            </p>
        </form>
    );
}
