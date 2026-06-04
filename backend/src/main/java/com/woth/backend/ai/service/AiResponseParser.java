package com.woth.backend.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.woth.backend.ai.dto.EmotionAnalysisResponse;
import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
// JSON 응답을 EmotionAnalysisResponse DTO로 변환하는 역할을 하는 컴포넌트 클래스
@Component
@RequiredArgsConstructor
public class AiResponseParser {

	private static final Map<String, String> WEATHER_LABEL_BY_KEY = Map.of(
			"sunny", "맑음",
			"cloudy", "흐림",
			"rainy", "비",
			"sunset", "노을",
			"night", "밤",
			"dawn", "새벽",
			"cherry", "벚꽃"
	);
	private static final Set<String> WEATHER_KEYS = WEATHER_LABEL_BY_KEY.keySet();

	private final ObjectMapper objectMapper;

	public EmotionAnalysisResponse parse(String response) {

		try {
			EmotionAnalysisResponse parsedResponse = objectMapper.readValue(
					response,
					EmotionAnalysisResponse.class
			);

			validate(parsedResponse);
			return parsedResponse;
		} catch (Exception e) {
			throw new CustomException(ErrorCode.INVALID_INPUT);
		}
	}

	private void validate(EmotionAnalysisResponse response) {
		if (response.weatherKey() == null || !WEATHER_KEYS.contains(response.weatherKey())) {
			throw new IllegalArgumentException("Unsupported weatherKey");
		}

		if (!WEATHER_LABEL_BY_KEY.get(response.weatherKey()).equals(response.weatherLabel())) {
			throw new IllegalArgumentException("weatherKey and weatherLabel do not match");
		}

		if (response.confidence() == null || response.confidence() < 0.0 || response.confidence() > 1.0) {
			throw new IllegalArgumentException("confidence must be between 0.0 and 1.0");
		}

		if (response.reason() == null || response.reason().isBlank()) {
			throw new IllegalArgumentException("reason is required");
		}
	}
}