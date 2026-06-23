import type { SocialProvider } from "../services/authService";

const OAUTH_STATE_KEY_PREFIX = "mw-oauth-state";

export function getOAuthStateKey(provider: SocialProvider) {
  return `${OAUTH_STATE_KEY_PREFIX}:${provider}`;
}

export function getOAuthRedirectUri(provider: SocialProvider) {
  return `${window.location.origin}/oauth/callback/${provider}`;
}
