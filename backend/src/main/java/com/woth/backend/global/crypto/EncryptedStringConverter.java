package com.woth.backend.global.crypto;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * {@code @Convert} 로 지정한 엔티티 String 필드를 DB 저장 시 암호화, 조회 시 복호화합니다.
 *
 * autoApply=false(기본) 이므로, 명시적으로 {@code @Convert(converter = EncryptedStringConverter.class)}
 * 를 단 필드(일기 제목/본문)에만 적용됩니다. 검색 조건에 쓰이는 컬럼에는 적용하지 마세요.
 */
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    @Override
    public String convertToDatabaseColumn(String attribute) {
        return EncryptionHolder.encryptor().encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return EncryptionHolder.encryptor().decrypt(dbData);
    }
}
