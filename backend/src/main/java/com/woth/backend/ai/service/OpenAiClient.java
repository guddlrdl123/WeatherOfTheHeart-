package com.woth.backend.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import jakarta.annotation.PostConstruct;
import lombok.Builder;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.CodeSource;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeoutException;

/*  
    OpenAI API 클라이언트 클래스
    OpenAI API 키 관리, 요청 생성, 응답 처리 등 외부 API 연동과 관련된 모든 로직을 담당한다. 
    WebClient를 사용하여 비동기 HTTP 요청을 수행하며, ObjectMapper로 JSON 응답을 파싱한다. 
    API 키는 다양한 소스에서 유연하게 로드할 수 있도록 설계되어 있으며, 오류 발생 시 CustomException을 통해 일관된 예외 처리를 제공한다.
*/    
@Component
public class OpenAiClient {

	private static final Logger log = LoggerFactory.getLogger(OpenAiClient.class);
	private static final String API_KEY_NAME = "OPENAI_API_KEY";
	private static final Duration OPENAI_REQUEST_TIMEOUT = Duration.ofSeconds(90);
	private static final Duration OPENAI_RETRY_DELAY = Duration.ofMillis(500);
	private static final int OPENAI_MAX_RETRY_ATTEMPTS = 2;

	@Value("${openai.api-key:}")
	private String apiKey;

	private final WebClient webClient;
	private final ObjectMapper objectMapper;

	// WebClient.Builder에 baseUrl 설정이 포함되어 있으므로 이 부분은 RequiredArgsConstructor 대신 수동 주입 유지
	public OpenAiClient(WebClient.Builder builder, ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
		this.webClient = builder
				.baseUrl("https://api.openai.com/v1")
				.build();
	}

	@PostConstruct
	public void logApiKeySource() {
		ResolvedApiKey resolvedApiKey = resolveApiKey();
		log.info("OpenAI API key source: {}, loaded: {}, user.dir: {}",
				resolvedApiKey.source(),
				!resolvedApiKey.value().isBlank(),
				Path.of("").toAbsolutePath()
		);
	}

	public String chat(String prompt) {
		ResolvedApiKey resolvedApiKey = resolveApiKey();

		if (resolvedApiKey.value().isBlank()) {
			throw new CustomException(ErrorCode.AI_API_KEY_MISSING);
		}

        // ChatCompletion API 요청을 위한 Builder DTO 적용으로 코드 명확성 및 확장성 향상
		OpenAiChatRequest requestBody = OpenAiChatRequest.builder()
				.model("gpt-4.1-mini")
				.temperature(1.0)
				.responseFormat(ResponseFormat.builder().type("json_object").build())
				.messages(List.of(
						ChatCompletionMessage.builder().role("system").content("당신은 감정 분석 AI이다. 반드시 JSON만 반환한다.").build(),
						ChatCompletionMessage.builder().role("user").content(prompt).build()
				))
				.build();

		return postOpenAi("/chat/completions", resolvedApiKey.value(), requestBody)
				.map(this::parseResponseBody)
				.map(this::extractMessageContent)
				.block();
	}

	public String generateImageDataUrl(String prompt) {
		ResolvedApiKey resolvedApiKey = resolveApiKey();

		if (resolvedApiKey.value().isBlank()) {
			throw new CustomException(ErrorCode.AI_API_KEY_MISSING);
		}

		// Image 생성 요청을 위한 Builder DTO 적용으로 코드 명확성 및 확장성 향상
		OpenAiImageRequest requestBody = OpenAiImageRequest.builder()
				.model("gpt-image-1")
				.prompt(prompt)
				.n(1)
				.size("1024x1024")
				.quality("medium")
				.build();

		return postOpenAi("/images/generations", resolvedApiKey.value(), requestBody)
				.map(this::parseResponseBody)
				.map(this::extractImageDataUrl)
				.block();
	}

	private reactor.core.publisher.Mono<String> postOpenAi(String uri, String apiKey, Object requestBody) {
		return webClient.post()
				.uri(uri)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(requestBody)
				.retrieve()
				.bodyToMono(String.class)
				.timeout(OPENAI_REQUEST_TIMEOUT)
				.retryWhen(Retry.backoff(OPENAI_MAX_RETRY_ATTEMPTS, OPENAI_RETRY_DELAY)
						.filter(this::isRetryableOpenAiError)
						.onRetryExhaustedThrow((retrySpec, signal) -> signal.failure()))
				.onErrorMap(this::toOpenAiApiException);
	}

	private boolean isRetryableOpenAiError(Throwable error) {
		if (error instanceof WebClientRequestException || error instanceof TimeoutException) {
			return true;
		}

		if (error instanceof WebClientResponseException responseException) {
			int statusCode = responseException.getStatusCode().value();
			return statusCode == 429 || statusCode >= 500;
		}

		return false;
	}

	private Throwable toOpenAiApiException(Throwable error) {
		if (error instanceof CustomException) {
			return error;
		}

		if (error instanceof WebClientResponseException responseException) {
			log.warn(
					"OpenAI API responded with status {}. body={}",
					responseException.getStatusCode(),
					responseException.getResponseBodyAsString()
			);
		} else {
			log.warn("OpenAI API request failed. reason={}", error.toString());
		}

		return new CustomException(ErrorCode.AI_API_ERROR);
	}

	private JsonNode parseResponseBody(String responseBody) {
		try {
			return objectMapper.readTree(responseBody);
		} catch (Exception e) {
			throw new CustomException(ErrorCode.AI_API_ERROR);
		}
	}

	private String extractMessageContent(JsonNode json) {
		JsonNode content = json.path("choices")
				.path(0)
				.path("message")
				.path("content");

		if (content.isMissingNode() || content.asText().isBlank()) {
			throw new CustomException(ErrorCode.AI_API_ERROR);
		}

		return content.asText();
	}

    // 이미지 생성 응답에서 base64 인코딩된 이미지 데이터를 추출하여 data URL 형식으로 반환하는 메서드
	private String extractImageDataUrl(JsonNode json) {
		JsonNode image = json.path("data").path(0).path("b64_json");

		if (image.isMissingNode() || image.asText().isBlank()) {
			throw new CustomException(ErrorCode.AI_API_ERROR);
		}

		return "data:image/png;base64," + image.asText();
	}

    // API 키를 다양한 소스에서 유연하게 로드하는 메서드
	private ResolvedApiKey resolveApiKey() {
		if (apiKey != null && !apiKey.isBlank()) {
			return new ResolvedApiKey(cleanEnvValue(apiKey), "spring-property openai.api-key");
		}

		String envApiKey = System.getenv(API_KEY_NAME);

		if (envApiKey != null && !envApiKey.isBlank()) {
			return new ResolvedApiKey(cleanEnvValue(envApiKey), "system-env " + API_KEY_NAME);
		}

		return readApiKeyFromEnvFile().orElse(new ResolvedApiKey("", "not-found"));
	}

    // .env 파일에서 API 키를 읽어오는 메서드. 여러 후보 경로를 탐색하여 가장 먼저 발견된 유효한 키를 반환한다.
	private Optional<ResolvedApiKey> readApiKeyFromEnvFile() {
		for (Path candidate : findEnvFileCandidates()) {
			if (!Files.exists(candidate)) {
				continue;
			}

			try {
				Optional<String> apiKeyLine = Files.readAllLines(candidate).stream()
						.map(String::trim)
						.filter(line -> line.startsWith(API_KEY_NAME + "="))
						.findFirst();

				if (apiKeyLine.isPresent()) {
					String value = cleanEnvValue(apiKeyLine.get().substring((API_KEY_NAME + "=").length()).trim());
					if (!value.isBlank()) {
						return Optional.of(new ResolvedApiKey(value, ".env file " + candidate.toAbsolutePath()));
					}
				}
			} catch (IOException ignored) {
			}
		}

		return Optional.empty();
	}

	private List<Path> findEnvFileCandidates() {
		List<Path> candidates = new ArrayList<>();
		addEnvCandidates(candidates, Path.of("").toAbsolutePath());
		getClassLocation().ifPresent(path -> addEnvCandidates(candidates, path));
		return candidates;
	}

    // .env 파일 후보 경로를 탐색하여 candidates 리스트에 추가하는 헬퍼 메서드
	private void addEnvCandidates(List<Path> candidates, Path startPath) {
		Path currentPath = Files.isRegularFile(startPath) ? startPath.getParent() : startPath;

		while (currentPath != null) {
			candidates.add(currentPath.resolve(".env"));
			candidates.add(currentPath.resolve("backend/.env"));
			candidates.add(currentPath.resolve("WeatherOfTheHeart/backend/.env"));
			currentPath = currentPath.getParent();
		}
	}

	private Optional<Path> getClassLocation() {
		CodeSource codeSource = OpenAiClient.class.getProtectionDomain().getCodeSource();

		if (codeSource == null || codeSource.getLocation() == null) {
			return Optional.empty();
		}

		try {
			return Optional.of(Path.of(codeSource.getLocation().toURI()).toAbsolutePath());
		} catch (Exception e) {
			return Optional.empty();
		}
	}

	private String cleanEnvValue(String value) {
		if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
			return value.substring(1, value.length() - 1);
		}

		return value;
	}

	private record ResolvedApiKey(String value, String source) {
	}


	// 외부 연동 요청을 위한 전용 Builder DTO들
	@Getter
	@Builder
	private static class OpenAiChatRequest {
		private final String model;
		private final Double temperature;
		@JsonProperty("response_format")
		private final ResponseFormat responseFormat;
		private final List<ChatCompletionMessage> messages;
	}

	@Getter
	@Builder
	private static class ResponseFormat {
		private final String type;
	}

	@Getter
	@Builder
	private static class ChatCompletionMessage {
		private final String role;
		private final String content;
	}

	@Getter
	@Builder
	private static class OpenAiImageRequest {
		private final String model;
		private final String prompt;
		private final Integer n;
		private final String size;
		private final String quality;
	}
}
