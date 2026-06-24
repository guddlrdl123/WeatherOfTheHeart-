package com.woth.backend.memory;

import com.woth.backend.global.crypto.AesGcmTextEncryptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 일기 본문/제목 암호화 도입에 따른 스키마/데이터 정합성 처리 (애플리케이션 기동 시 실행).
 *
 * <ol>
 *   <li><b>항상</b>: title 컬럼이 암호문을 담을 수 있도록 TEXT 인지 확인하고, VARCHAR면 TEXT로 확장합니다.
 *       (ddl-auto=update 는 기존 컬럼 타입을 바꾸지 않으므로 직접 처리합니다.)</li>
 *   <li><b>플래그 ON</b>(app.encryption.migrate-on-startup=true): 기존 평문 행을 일회성으로 암호화합니다.
 *       이미 암호화된 행은 건너뛰므로 재실행해도 안전합니다.</li>
 * </ol>
 *
 * 운영: 기존 평문 데이터가 있으면 .env 에 {@code MEMORY_ENCRYPTION_MIGRATE=true} 로 한 번 기동 후,
 * 로그에서 건수를 확인하고 다시 {@code false} 로 되돌리세요.
 */
@Component
public class MemoryEncryptionMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MemoryEncryptionMigration.class);

    private final JdbcTemplate jdbcTemplate;
    private final AesGcmTextEncryptor encryptor;
    private final boolean migrateOnStartup;

    public MemoryEncryptionMigration(
            JdbcTemplate jdbcTemplate,
            AesGcmTextEncryptor encryptor,
            @Value("${app.encryption.migrate-on-startup:false}") boolean migrateOnStartup) {
        this.jdbcTemplate = jdbcTemplate;
        this.encryptor = encryptor;
        this.migrateOnStartup = migrateOnStartup;
    }

    @Override
    public void run(ApplicationArguments args) {
        ensureTitleColumnCanStoreCiphertext();
        if (migrateOnStartup) {
            encryptExistingPlaintextRows();
        }
    }

    /** 암호문(접두어+base64)은 평문보다 길어지므로 title(VARCHAR(100))을 TEXT로 확장합니다. */
    private void ensureTitleColumnCanStoreCiphertext() {
        String dataType = jdbcTemplate.query(
                "SELECT DATA_TYPE FROM information_schema.COLUMNS "
                        + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'private_memories' "
                        + "AND COLUMN_NAME = 'title'",
                rs -> rs.next() ? rs.getString(1) : null);

        if (dataType == null) {
            log.warn("private_memories.title 컬럼을 찾지 못해 스키마 확장을 건너뜁니다.");
            return;
        }
        if (dataType.toLowerCase().contains("text")) {
            return; // 이미 TEXT 계열 -> 암호문 저장에 충분
        }
        log.info("암호문 저장을 위해 private_memories.title 컬럼을 {} -> TEXT 로 확장합니다.", dataType);
        jdbcTemplate.execute("ALTER TABLE private_memories MODIFY COLUMN title TEXT NOT NULL");
    }

    /** 기존 평문 title/content 를 일회성으로 암호화합니다. 이미 암호화된 행은 건너뜁니다. */
    private void encryptExistingPlaintextRows() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, title, content FROM private_memories");

        int migrated = 0;
        for (Map<String, Object> row : rows) {
            Long id = ((Number) row.get("id")).longValue();
            String title = (String) row.get("title");
            String content = (String) row.get("content");

            boolean titleNeedsEncrypt = title != null && !encryptor.isEncrypted(title);
            boolean contentNeedsEncrypt = content != null && !encryptor.isEncrypted(content);
            if (!titleNeedsEncrypt && !contentNeedsEncrypt) {
                continue; // 이미 암호화된 행 -> 재실행 안전
            }

            String newTitle = titleNeedsEncrypt ? encryptor.encrypt(title) : title;
            String newContent = contentNeedsEncrypt ? encryptor.encrypt(content) : content;
            jdbcTemplate.update(
                    "UPDATE private_memories SET title = ?, content = ? WHERE id = ?",
                    newTitle, newContent, id);
            migrated++;
        }
        log.info("[일기 암호화 마이그레이션] 평문 {}건을 암호화했습니다. (총 {}건 검사)", migrated, rows.size());
    }
}
