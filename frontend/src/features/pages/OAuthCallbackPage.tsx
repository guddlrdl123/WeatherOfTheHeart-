import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { socialLogin, type SocialProvider } from "../../services/authService";
import { getOAuthRedirectUri, getOAuthStateKey } from "../../utils/oauth";
import {
  markSignupCompletedNotice,
  setAuthenticated,
  setCurrentUserId,
  setCurrentUserIsAdmin,
  setProfileEmail,
  setProfileNickname,
} from "../../utils/authSession";

const SOCIAL_PROVIDERS = new Set(["google", "kakao", "naver"]);

function isSocialProvider(value: string | undefined): value is SocialProvider {
  return Boolean(value && SOCIAL_PROVIDERS.has(value));
}

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { provider } = useParams();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const socialProvider = isSocialProvider(provider) ? provider : null;

  useEffect(() => {
    async function completeLogin() {
      if (!socialProvider) {
        return;
      }

      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const providerError = searchParams.get("error");
      const savedState = sessionStorage.getItem(getOAuthStateKey(socialProvider));

      if (providerError) {
        setError("소셜 인증이 취소되었거나 실패했습니다.");
        return;
      }

      if (!code || !state || !savedState || state !== savedState) {
        setError("소셜 인증 요청을 확인할 수 없습니다. 다시 시도해주세요.");
        return;
      }

      try {
        const auth = await socialLogin(socialProvider, {
          code,
          state,
          redirectUri: getOAuthRedirectUri(socialProvider),
        });
        const userId = auth.userId ?? auth.id;

        if (userId) {
          setCurrentUserId(userId);
        }

        if (auth.nickname) {
          setProfileNickname(auth.nickname);
        }

        setCurrentUserIsAdmin(auth.isAdmin);
        setProfileEmail(auth.email ?? "");
        if (auth.isNewUser) {
          markSignupCompletedNotice();
        }
        setAuthenticated(auth.accessToken, auth.accessTokenExpiresAt);
        sessionStorage.removeItem(getOAuthStateKey(socialProvider));
        navigate("/room", { replace: true, state: auth.isNewUser ? { signupCompleted: true } : null });
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "소셜 인증에 실패했습니다.");
      }
    }

    void completeLogin();
  }, [navigate, searchParams, socialProvider]);

  if (!socialProvider) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mw-app min-h-[100dvh]">
      <main className="flex min-h-[100dvh] items-center justify-center px-5">
        <div className="mw-surface w-full max-w-[420px] rounded-xl p-8 text-center">
          <p className="mb-3 text-[0.68rem] tracking-[0.2em] text-[#e0d2ba]">SOCIAL AUTH</p>
          {error ? (
            <>
              <p className="text-sm text-[#e6a1a1]">{error}</p>
              <Link to="/" className="mt-5 inline-flex text-sm text-[#d8bd9a] hover:text-[#ead2b1]">
                처음 화면으로 돌아가기
              </Link>
            </>
          ) : (
            <p className="text-sm text-white/54">소셜 계정을 확인하고 있습니다.</p>
          )}
        </div>
      </main>
    </div>
  );
}
