package com.woth.backend.global.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
// API 응답을 표준화하기 위한 DTO 클래스입니다.
// 성공과 실패 응답을 구분하여 상태, 메시지, 데이터를 포함하도록 설계되었습니다.
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ApiResponse<T> {
    private String status;
    private String message;
    private T data;

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .status("success")
                .message("요청이 성공적으로 처리되었습니다.")
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .status("error")
                .message(message)
                .data(null)
                .build();
    }
}
