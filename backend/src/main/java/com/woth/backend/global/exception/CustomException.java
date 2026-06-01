package com.woth.backend.global.exception;
// CustomException은 애플리케이션에서 발생하는 예외를 처리하기 위한 사용자 정의 예외 클래스
// ErrorCode 열거형을 사용하여 예외의 유형과 메시지를 관리하며, RuntimeException을 상속하여 예외 처리를 간편하게 한다.
import lombok.Getter;
@Getter
public class CustomException extends RuntimeException {
    private final ErrorCode errorCode;

    public CustomException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

}
