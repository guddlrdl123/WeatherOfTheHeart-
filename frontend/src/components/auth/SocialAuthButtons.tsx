import { getSocialAuthorizeUrl, type SocialProvider } from "../../services/authService";
import { useState } from "react";

type SocialAuthButtonsProps = {
  disabled?: boolean;
  onError?: (message: string) => void;
};

const OAUTH_STATE_KEY_PREFIX = "mw-oauth-state";

const PROVIDERS: Array<{
  provider: SocialProvider;
  label: string;
  className: string;
}> = [
  {
    provider: "google",
    label: "Google로 계속하기",
    className: "border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f8fafd]",
  },
  {
    provider: "kakao",
    label: "카카오로 계속하기",
    className: "border-[#fee500] bg-[#fee500] text-[#191919] hover:bg-[#f4dc00]",
  },
  {
    provider: "naver",
    label: "네이버로 계속하기",
    className: "border-[#03c75a] bg-[#03c75a] text-white hover:bg-[#02b350]",
  },
];

export function getOAuthStateKey(provider: SocialProvider) {
  return `${OAUTH_STATE_KEY_PREFIX}:${provider}`;
}

export function getOAuthRedirectUri(provider: SocialProvider) {
  return `${window.location.origin}/oauth/callback/${provider}`;
}

function createState() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function SocialAuthButtons({ disabled, onError }: SocialAuthButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);

  async function handleSocialLogin(provider: SocialProvider) {
    const state = createState();
    const redirectUri = getOAuthRedirectUri(provider);

    sessionStorage.setItem(getOAuthStateKey(provider), state);

    try {
      setPendingProvider(provider);
      const { authorizationUrl } = await getSocialAuthorizeUrl(provider, redirectUri, state);
      window.location.assign(authorizationUrl);
    } catch (caughtError) {
      sessionStorage.removeItem(getOAuthStateKey(provider));
      onError?.(caughtError instanceof Error ? caughtError.message : "소셜 로그인 주소를 가져오지 못했습니다.");
      setPendingProvider(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {PROVIDERS.map(({ provider, label, className }) => (
        <button
          key={provider}
          type="button"
          disabled={disabled || Boolean(pendingProvider)}
          onClick={() => void handleSocialLogin(provider)}
          className={`h-11 rounded-[8px] border px-3 text-sm font-medium transition disabled:opacity-50 ${className}`}
        >
          {pendingProvider === provider ? "이동 중..." : label}
        </button>
      ))}
    </div>
  );
}
