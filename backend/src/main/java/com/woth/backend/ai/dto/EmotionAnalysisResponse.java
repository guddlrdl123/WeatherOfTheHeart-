package com.woth.backend.ai.dto;
// 감정 분석 API의 응답 데이터를 담는 DTO 클래스
public record EmotionAnalysisResponse(
		String weatherKey,
		String weatherLabel,
		Double confidence,
		String reason
) {
}