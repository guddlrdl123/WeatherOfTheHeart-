package com.woth.backend.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SocialAuthService {

    private static final Logger log = LoggerFactory.getLogger(SocialAuthService.class);

    private static final String GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
    private static final String KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
    private static final String KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
    private static final String KAKAO_USERINFO_URL = "https://kapi.kakao.com/v2/user/me";
    private static final String NAVER_AUTHORIZE_URL = "https://nid.naver.com/oauth2.0/authorize";
    private static final String NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
    private static final String NAVER_USERINFO_URL = "https://openapi.naver.com/v1/nid/me";

    private final AuthService authService;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final Set<String> allowedRedirectUris;
    private final String googleClientId;
    private final String googleClientSecret;
    private final String kakaoRestApiKey;
    private final String kakaoClientSecret;
    private final String naverClientId;
    private final String naverClientSecret;

    public SocialAuthService(
            AuthService authService,
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper,
            @Value("${oauth.allowed-redirect-uris:${OAUTH_ALLOWED_REDIRECT_URIS:}}") String allowedRedirectUris,
            @Value("${oauth.google.client-id:${GOOGLE_OAUTH_CLIENT_ID:}}") String googleClientId,
            @Value("${oauth.google.client-secret:${GOOGLE_OAUTH_CLIENT_SECRET:}}") String googleClientSecret,
            @Value("${oauth.kakao.rest-api-key:${KAKAO_REST_API_KEY:}}") String kakaoRestApiKey,
            @Value("${oauth.kakao.client-secret:${KAKAO_CLIENT_SECRET:}}") String kakaoClientSecret,
            @Value("${oauth.naver.client-id:${NAVER_CLIENT_ID:}}") String naverClientId,
            @Value("${oauth.naver.client-secret:${NAVER_CLIENT_SECRET:}}") String naverClientSecret
    ) {
        this.authService = authService;
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
        this.allowedRedirectUris = parseAllowedRedirectUris(allowedRedirectUris);
        this.googleClientId = googleClientId;
        this.googleClientSecret = googleClientSecret;
        this.kakaoRestApiKey = kakaoRestApiKey;
        this.kakaoClientSecret = kakaoClientSecret;
        this.naverClientId = naverClientId;
        this.naverClientSecret = naverClientSecret;
    }

    public String createAuthorizationUrl(String providerKey, String redirectUri, String state) {
        OAuthProvider provider = OAuthProvider.from(providerKey);
        validateRedirectUri(redirectUri);

        return switch (provider) {
            case GOOGLE -> createGoogleAuthorizationUrl(redirectUri, state);
            case KAKAO -> createKakaoAuthorizationUrl(redirectUri, state);
            case NAVER -> createNaverAuthorizationUrl(redirectUri, state);
        };
    }

    public User login(String providerKey, String code, String redirectUri, String state) {
        OAuthProvider provider = OAuthProvider.from(providerKey);
        validateRedirectUri(redirectUri);

        OAuthProfile profile = switch (provider) {
            case GOOGLE -> fetchGoogleProfile(code, redirectUri);
            case KAKAO -> fetchKakaoProfile(code, redirectUri);
            case NAVER -> fetchNaverProfile(code, redirectUri, state);
        };

        return authService.loginWithOAuth(profile);
    }

    private String createGoogleAuthorizationUrl(String redirectUri, String state) {
        requireCredential(googleClientId);

        return UriComponentsBuilder.fromUriString(GOOGLE_AUTHORIZE_URL)
                .queryParam("response_type", "code")
                .queryParam("client_id", googleClientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("scope", "openid email profile")
                .queryParam("state", state)
                .build()
                .toUriString();
    }

    private String createKakaoAuthorizationUrl(String redirectUri, String state) {
        requireCredential(kakaoRestApiKey);

        return UriComponentsBuilder.fromUriString(KAKAO_AUTHORIZE_URL)
                .queryParam("response_type", "code")
                .queryParam("client_id", kakaoRestApiKey)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("scope", "profile_nickname,account_email")
                .queryParam("state", state)
                .build()
                .toUriString();
    }

    private String createNaverAuthorizationUrl(String redirectUri, String state) {
        requireCredential(naverClientId);

        return UriComponentsBuilder.fromUriString(NAVER_AUTHORIZE_URL)
                .queryParam("response_type", "code")
                .queryParam("client_id", naverClientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("state", state)
                .build()
                .toUriString();
    }

    private OAuthProfile fetchGoogleProfile(String code, String redirectUri) {
        requireCredential(googleClientId);
        requireCredential(googleClientSecret);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", googleClientId);
        form.add("client_secret", googleClientSecret);
        form.add("redirect_uri", redirectUri);
        form.add("code", code);

        JsonNode token = postForm(GOOGLE_TOKEN_URL, form);
        JsonNode userInfo = getBearer(GOOGLE_USERINFO_URL, requiredText(token, "access_token"));

        if (userInfo.has("email_verified") && !userInfo.path("email_verified").asBoolean(false)) {
            throw new CustomException(ErrorCode.OAUTH_EMAIL_MISSING);
        }

        return new OAuthProfile(
                OAuthProvider.GOOGLE,
                requiredText(userInfo, "sub"),
                requiredText(userInfo, "email"),
                textOrNull(userInfo, "name")
        );
    }

    private OAuthProfile fetchKakaoProfile(String code, String redirectUri) {
        requireCredential(kakaoRestApiKey);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", kakaoRestApiKey);
        form.add("redirect_uri", redirectUri);
        form.add("code", code);
        if (hasText(kakaoClientSecret)) {
            form.add("client_secret", kakaoClientSecret);
        }

        JsonNode token = postForm(KAKAO_TOKEN_URL, form);
        JsonNode userInfo = getBearer(KAKAO_USERINFO_URL, requiredText(token, "access_token"));
        JsonNode account = userInfo.path("kakao_account");

        if (account.has("is_email_verified") && !account.path("is_email_verified").asBoolean(false)) {
            throw new CustomException(ErrorCode.OAUTH_EMAIL_MISSING);
        }

        return new OAuthProfile(
                OAuthProvider.KAKAO,
                requiredText(userInfo, "id"),
                requiredText(account, "email"),
                textOrNull(account.path("profile"), "nickname")
        );
    }

    private OAuthProfile fetchNaverProfile(String code, String redirectUri, String state) {
        requireCredential(naverClientId);
        requireCredential(naverClientSecret);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", naverClientId);
        form.add("client_secret", naverClientSecret);
        form.add("redirect_uri", redirectUri);
        form.add("code", code);
        form.add("state", state);

        JsonNode token = postForm(NAVER_TOKEN_URL, form);
        JsonNode userInfo = getBearer(NAVER_USERINFO_URL, requiredText(token, "access_token"));
        JsonNode response = userInfo.path("response");

        return new OAuthProfile(
                OAuthProvider.NAVER,
                requiredText(response, "id"),
                requiredText(response, "email"),
                textOrNull(response, "nickname")
        );
    }

    private JsonNode postForm(String url, MultiValueMap<String, String> form) {
        try {
            String responseBody = webClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters.fromFormData(form))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            JsonNode response = parseJson(responseBody);

            if (response == null || response.has("error")) {
                log.warn("OAuth token request failed. url={}, response={}", url, response);
                throw new CustomException(ErrorCode.OAUTH_LOGIN_FAILED);
            }

            return response;
        } catch (WebClientResponseException e) {
            log.warn(
                    "OAuth token request failed. url={}, status={}, body={}",
                    url,
                    e.getStatusCode(),
                    e.getResponseBodyAsString()
            );
            throw new CustomException(ErrorCode.OAUTH_LOGIN_FAILED);
        }
    }

    private JsonNode getBearer(String url, String accessToken) {
        try {
            String responseBody = webClient.get()
                    .uri(url)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            JsonNode response = parseJson(responseBody);

            if (response == null || response.has("error") || response.has("error_description")) {
                log.warn("OAuth userinfo request failed. url={}, response={}", url, response);
                throw new CustomException(ErrorCode.OAUTH_LOGIN_FAILED);
            }

            return response;
        } catch (WebClientResponseException e) {
            log.warn(
                    "OAuth userinfo request failed. url={}, status={}, body={}",
                    url,
                    e.getStatusCode(),
                    e.getResponseBodyAsString()
            );
            throw new CustomException(ErrorCode.OAUTH_LOGIN_FAILED);
        }
    }

    private Set<String> parseAllowedRedirectUris(String value) {
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(uri -> !uri.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    private JsonNode parseJson(String body) {
        try {
            if (!hasText(body)) {
                return null;
            }

            return objectMapper.readTree(body);
        } catch (Exception e) {
            log.warn("OAuth response JSON parsing failed. body={}", body);
            throw new CustomException(ErrorCode.OAUTH_LOGIN_FAILED);
        }
    }

    private void validateRedirectUri(String redirectUri) {
        if (!hasText(redirectUri) || !allowedRedirectUris.contains(redirectUri)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private void requireCredential(String value) {
        if (!hasText(value)) {
            throw new CustomException(ErrorCode.OAUTH_CONFIG_MISSING);
        }
    }

    private String requiredText(JsonNode node, String fieldName) {
        String value = textOrNull(node, fieldName);

        if (!hasText(value)) {
            throw new CustomException(ErrorCode.OAUTH_EMAIL_MISSING);
        }

        return value;
    }

    private String textOrNull(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.path(fieldName).isNull()) {
            return null;
        }

        return node.path(fieldName).asText();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
