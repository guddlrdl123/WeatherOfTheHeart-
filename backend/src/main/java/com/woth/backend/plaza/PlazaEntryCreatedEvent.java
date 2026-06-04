package com.woth.backend.plaza;

// 광장 엔트리 저장 또는 방장 종료가 커밋된 뒤 완성 여부를 비동기로 확인하기 위한 이벤트입니다.
public record PlazaEntryCreatedEvent(Long plazaId, boolean forceComplete) {

    public PlazaEntryCreatedEvent(Long plazaId) {
        this(plazaId, false);
    }

}
