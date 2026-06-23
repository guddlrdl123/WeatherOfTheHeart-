package com.woth.backend.global.exception;

import com.woth.backend.global.dto.ApiResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
// GlobalExceptionHandler는 애플리케이션 전역에서 발생하는 예외를 처리하는 클래스
// CustomException과 Spring의 일반적인 예외들을 처리하여 일관된 API 응답 형식을 제공합니다. 또한, 예상치 못한 시스템 에러에 대해서도 적절한 응답을 반환
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 우리가 정의한 비즈니스 에러 처리
    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponse<Object>> handleCustomException(CustomException e) {
        ErrorCode errorCode = e.getErrorCode();
        ApiResponse<Object> response = ApiResponse.builder()
                .status("ERROR")
                .message(errorCode.getMessage() + " [Code: " + errorCode.getCode() + "]")
                .data(null)
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler({
            MethodArgumentTypeMismatchException.class,
            MethodArgumentNotValidException.class,
            IllegalArgumentException.class
    })
    public ResponseEntity<ApiResponse<Object>> handleBadRequestException(Exception e) {
        // 방어 코드: /api/users/me처럼 숫자가 아닌 userId가 들어오면 500 대신 400을 반환합니다.
        ApiResponse<Object> response = ApiResponse.builder()
                .status("ERROR")
                .message(ErrorCode.INVALID_INPUT.getMessage() + " [Code: " + ErrorCode.INVALID_INPUT.getCode() + "]")
                .data(null)
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrityViolationException(DataIntegrityViolationException e) {
        e.printStackTrace();
        ApiResponse<Object> response = ApiResponse.builder()
                .status("ERROR")
                .message(ErrorCode.INVALID_INPUT.getMessage() + " [Code: " + ErrorCode.INVALID_INPUT.getCode() + "]")
                .data(null)
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    // 예상치 못한 시스템 에러 처리
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleServerException(Exception e) {
        // 개발 중 DB 제약조건 오류 같은 500 원인을 콘솔에서 바로 확인하기 위한 로그
        e.printStackTrace();
        ApiResponse<Object> response = ApiResponse.builder()
                .status("ERROR")
                .message("서버 내부 오류가 발생했습니다. " + e.getClass().getSimpleName() + ": " + e.getMessage())
                .data(null)
                .build();
        return ResponseEntity.internalServerError().body(response);
    }
}
