import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../services/authService";
import { setAuthenticated, setCurrentUserId, setCurrentUserIsAdmin, setProfileEmail, setProfileNickname } from "../../utils/authSession";
// import { useAppStore } from "../../stores/AppStore";

// 백엔드 로그인 API를 호출하는 로그인 폼입니다.
export function LoginForm() {
  //   const { login, navigate } = useAppStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // 사용자가 바로 이해할 수 있는 최소한의 프론트 validation만 수행합니다.
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("올바른 이메일 형식으로 입력해주세요.");
      return;
    }

    if (!password.trim()) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      const auth = await login({ email: email.trim(), password });
      const userId = auth.userId ?? auth.id;

      if (userId) {
        setCurrentUserId(userId);
      }

      if (auth.nickname) {
        setProfileNickname(auth.nickname);
      }

      setCurrentUserIsAdmin(auth.isAdmin);
      setProfileEmail(auth.email ?? email.trim());
      setAuthenticated(auth.accessToken, auth.accessTokenExpiresAt);
      navigate("/room", { replace: true });
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mw-surface mx-auto flex w-full max-w-[420px] flex-col gap-4 rounded-xl p-8 select-none">
      <div>
        <p className="mb-2 text-[0.68rem] tracking-[0.2em] text-[#e0d2ba]">LOGIN</p>
        {/* <h1 className="text-xl font-normal text-[#e0d2ba]" style={{ fontFamily: "'Noto Serif KR', Georgia, serif" }}>
          다시 방으로 돌아가기
        </h1> */}
      </div>

      <label className="flex flex-col gap-2 text-sm">
        이메일
        <input className="mw-input h-11 px-3 text-sm" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        비밀번호
        <div className="relative">
          <input
            className="mw-input h-11 px-3 text-sm"
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

      {error && <p className="text-sm text-[#e6a1a1]">{error}</p>}

      <button type="submit" disabled={isSubmitting} className="mw-button-solid mt-2 h-11 rounded-[8px] px-3 text-sm disabled:opacity-50">
        로그인
      </button>

      <p className="text-center text-xs text-white/38">
        처음 오셨나요?
        <Link to="/signup" state={{ fromLanding: true }} className="ml-2 text-[#d8bd9a] text-xs hover:text-[#ead2b1]">
          회원가입
        </Link>
      </p>
    </form>
  );
}
