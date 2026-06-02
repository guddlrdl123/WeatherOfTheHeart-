package com.woth.backend.ai.service;

import com.woth.backend.ai.dto.EmotionAnalysisResponse;
import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * [AI 관련 비즈니스 로직을 처리하는 서비스 클래스]
 * 사용자 입력을 기반으로 감정 분석을 수행하고, OpenAI API와의 통신을 담당한다.
 * analyze 메서드는 사용자 ID와 입력된 글을 받아 감정 분석을 수행한다. 
 * 사용자 존재 여부를 확인하고, 입력 검증 후 프롬프트를 생성하여 OpenAI API에 요청한다. 
 * API 응답을 파싱하여 최종적으로 EmotionAnalysisResponse 객체로 반환한다.
 */
@Service
public class AiService {

	private final OpenAiClient openAiClient;
	private final EmotionPromptBuilder emotionPromptBuilder;
	private final AiResponseParser aiResponseParser;
	private final UserRepository userRepository;

	public AiService(
			OpenAiClient openAiClient,
			EmotionPromptBuilder emotionPromptBuilder,
			AiResponseParser aiResponseParser,
			UserRepository userRepository
	) {
		this.openAiClient = openAiClient;
		this.emotionPromptBuilder = emotionPromptBuilder;
		this.aiResponseParser = aiResponseParser;
		this.userRepository = userRepository;
	}

	@Transactional(readOnly = true)
	public EmotionAnalysisResponse analyze(Long userId, String content) {

		userRepository.findById(userId)
		              .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

		if (content == null || content.isBlank()) {
			throw new CustomException(ErrorCode.INVALID_INPUT);
		}

		String prompt = emotionPromptBuilder.build(content);

		String response = openAiClient.chat(prompt);

		return aiResponseParser.parse(response);
	}
}
