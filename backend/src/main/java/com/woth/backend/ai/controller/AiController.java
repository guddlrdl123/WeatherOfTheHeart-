package com.woth.backend.ai.controller;

import com.woth.backend.ai.dto.AnalyzeEmotionRequest;
import com.woth.backend.ai.dto.EmotionAnalysisResponse;
import com.woth.backend.ai.service.AiService;
import com.woth.backend.auth.AuthenticatedUser;
import com.woth.backend.auth.CurrentUser;
import com.woth.backend.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

// AI 관련 API 요청을 처리하는 컨트롤러 클래스

@RestController
@RequestMapping(path = "/api/ai", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class AiController {

	private final AiService aiService;

	@PostMapping("/analyze")
	public ApiResponse<EmotionAnalysisResponse> analyze(
			@CurrentUser AuthenticatedUser currentUser,
			@RequestBody AnalyzeEmotionRequest request
	) {
		EmotionAnalysisResponse response = aiService.analyze(
				currentUser.id(),
				request.content()
		);

		return ApiResponse.success(response);
	}
}
