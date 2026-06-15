package com.woth.backend.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    USER_NOT_FOUND("USER_001", "존재하지 않는 유저입니다."),
    USER_ALREADY_EXISTS("USER_002", "이미 등록된 이메일입니다."),
    USER_PASSWORD_MISMATCH("USER_003", "현재 비밀번호가 일치하지 않습니다."),
    USER_WITHDRAWN("USER_004", "탈퇴한 회원입니다."),
    AUTH_REQUIRED("AUTH_001", "로그인이 필요합니다."),
    AUTH_INVALID("AUTH_002", "인증 정보가 올바르지 않습니다."),
    AUTH_EXPIRED("AUTH_003", "인증 시간이 만료되었습니다."),
    EMAIL_CODE_INVALID("EMAIL_001", "이메일 인증번호가 올바르지 않습니다."),
    EMAIL_CODE_EXPIRED("EMAIL_002", "이메일 인증번호가 만료되었습니다."),
    EMAIL_NOT_VERIFIED("EMAIL_003", "이메일 인증이 완료되지 않았습니다."),
    EMAIL_SEND_FAILED("EMAIL_004", "이메일 인증번호 발송에 실패했습니다."),
    PASSWORD_RESET_TOKEN_INVALID("EMAIL_005", "비밀번호 재설정 토큰이 올바르지 않습니다."),
    PASSWORD_RESET_TOKEN_EXPIRED("EMAIL_006", "비밀번호 재설정 토큰이 만료되었습니다."),
    EMAIL_SAME_AS_CURRENT("EMAIL_007", "현재 사용 중인 이메일과 동일합니다."),
    MEMORY_DUPLICATE("MEMORY_001", "이미 해당 날짜에 기록이 존재합니다."),
    MEMORY_NOT_FOUND("MEMORY_002", "존재하지 않는 기억입니다."),
    PLAZA_NOT_FOUND("PLAZA_001", "존재하지 않는 광장입니다."),
    PLAZA_ALREADY_JOINED("PLAZA_002", "이미 이 광장에 참여한 상태입니다."),
    PLAZA_COMPLETE("PLAZA_003", "광장이 이미 완료되었습니다."),
    PLAZA_DUPLICATE_OBJECT("PLAZA_004", "이미 해당 오브젝트가 광장에 놓여 있습니다."),
    PLAZA_ENTRY_NOT_FOUND("PLAZA_005", "존재하지 않는 광장 글입니다."),
    PLAZA_ENTRY_FORBIDDEN("PLAZA_006", "광장 글/오브젝트를 수정하거나 삭제할 권한이 없습니다."),
    PLAZA_DELETE_FORBIDDEN("PLAZA_007", "AI 이미지 생성 중인 광장은 삭제할 수 없습니다."),
    MAILBOX_NOT_FOUND("MAILBOX_001", "존재하지 않는 우편입니다."),
    ROOM_NOT_FOUND("ROOM_001", "존재하지 않는 방입니다."),
    AI_API_KEY_MISSING("AI_001", "OpenAI API 키가 설정되지 않았습니다."),
    AI_API_ERROR("AI_002", "OpenAI API 호출에 실패했습니다."),
    INVALID_INPUT("GLOBAL_001", "입력값이 올바르지 않습니다.");

    private final String code;
    private final String message;
}
