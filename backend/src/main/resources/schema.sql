--1. 사용자 정보 테이블
CREATE TABLE users (
                       id BIGINT AUTO_INCREMENT PRIMARY KEY,
                       email VARCHAR(100) NOT NULL,
                       password VARCHAR(255) NOT NULL,
                       nickname VARCHAR(10) NOT NULL,
                       auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
                       auth_provider_id VARCHAR(255) NULL,
                       is_admin TINYINT(1) NOT NULL DEFAULT 0,
    -- [수정] 회원 탈퇴를 hard delete가 아닌 soft delete로 처리하기 위한 상태값
                       is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    -- [수정] 회원 탈퇴 시각 저장
                       deleted_at DATETIME NULL,
                       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                       CONSTRAINT uk_users_email_auth_provider UNIQUE (email, auth_provider),
                       CONSTRAINT uk_users_auth_provider_id UNIQUE (auth_provider, auth_provider_id),
                       INDEX idx_users_email_auth_provider (email, auth_provider),
                       INDEX idx_users_auth_provider_id (auth_provider, auth_provider_id)
);

--2. 나만의 방 정보 테이블
-- [수정] 기존 monthly_rooms가 아니라 현재 엔티티 기준 테이블명은 private_rooms
CREATE TABLE private_rooms (
                               id BIGINT AUTO_INCREMENT PRIMARY KEY,
                               user_id BIGINT NOT NULL,
                               year INT NOT NULL,
                               month INT NOT NULL,
                               title VARCHAR(100) NOT NULL,
                               archived_at DATETIME NULL,
                               created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                               CONSTRAINT fk_private_rooms_user FOREIGN KEY (user_id) REFERENCES users(id),
                               CONSTRAINT uk_user_year_month UNIQUE (user_id, year, month)
);

--3. 일기(기억) 테이블
-- [수정] 기존 memory_entries가 아니라 현재 엔티티 기준 테이블명은 private_memories
CREATE TABLE private_memories (
                                  id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                  private_room_id BIGINT NOT NULL,
                                  title VARCHAR(100) NOT NULL,
                                  content TEXT NOT NULL,
                                  mood_key VARCHAR(50) NOT NULL,
                                  weather_key VARCHAR(50) NOT NULL,
                                  object_key VARCHAR(100) NOT NULL,
                                  slot_key VARCHAR(100) NOT NULL,
                                  memory_date DATE NOT NULL,
                                  image_url VARCHAR(255) NULL,
                                  position_x INT NULL,
                                  position_y INT NULL,
                                  flip_x TINYINT(1) NULL,
                                  tilt_deg INT NULL,
                                  layer_index INT NULL,
                                  content_updated TINYINT(1) NOT NULL DEFAULT 0,
                                  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                  CONSTRAINT fk_private_memories_room FOREIGN KEY (private_room_id) REFERENCES private_rooms(id),
                                  INDEX idx_private_memories_room_id (private_room_id),
                                  INDEX idx_private_memories_memory_date (memory_date)
);

--4. 사물 카탈로그 테이블
-- [수정] 현재 엔티티 기준 테이블명은 object_catalogs
CREATE TABLE object_catalogs (
                                 id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                 object_key VARCHAR(50) NOT NULL UNIQUE,
                                 object_name VARCHAR(50) NOT NULL,
                                 image_url VARCHAR(255) NOT NULL,
                                 width INT NOT NULL,
                                 category VARCHAR(30) NOT NULL DEFAULT 'decor',
                                 is_active TINYINT(1) NOT NULL DEFAULT 1
);

--5. 사물 배치 위치 테이블
CREATE TABLE object_slots (
                              id BIGINT AUTO_INCREMENT PRIMARY KEY,
                              slot_key VARCHAR(50) NOT NULL UNIQUE,
                              slot_name VARCHAR(50) NOT NULL,
                              position_x INT NOT NULL,
                              position_y INT NOT NULL,
                              is_active TINYINT(1) NOT NULL DEFAULT 1,
                              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

--6. 이메일 인증 정보 테이블
-- [수정] 회원가입 이메일 인증용 테이블 추가
CREATE TABLE email_verifications (
                                     id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                     email VARCHAR(100) NOT NULL,
                                     code VARCHAR(6) NOT NULL,
                                     verified TINYINT(1) NOT NULL DEFAULT 0,
                                     expires_at DATETIME NOT NULL,
                                     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     INDEX idx_email_verifications_email_created_at (email, created_at)
);

--7. 리프레시 토큰 테이블
-- [수정] 현재 엔티티 기준 컬럼명(token_value, expired_at)으로 반영
CREATE TABLE refresh_tokens (
                                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                user_id BIGINT NOT NULL UNIQUE,
                                token_value VARCHAR(255) NOT NULL,
                                expired_at DATETIME NOT NULL,
                                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);

--8. 광장 메인 테이블
-- [수정] 현재 Plaza 엔티티 기준 컬럼 전체 반영
CREATE TABLE plazas (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        owner_id BIGINT NULL,
                        title VARCHAR(100) NOT NULL,
                        topic TEXT NOT NULL,
                        max_objects INT NOT NULL DEFAULT 8,
                        allow_search TINYINT(1) NOT NULL DEFAULT 1,
                        allow_invite TINYINT(1) NOT NULL DEFAULT 1,
                        invite_code VARCHAR(7) NULL UNIQUE,
                        allow_duplicate_objects TINYINT(1) NOT NULL DEFAULT 0,
                        background_type VARCHAR(20) NOT NULL DEFAULT 'weather',
                        background_color VARCHAR(20) NULL,
                        background_key VARCHAR(50) NOT NULL,
                        is_active TINYINT(1) NOT NULL DEFAULT 1,
                        completed_at DATETIME NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        CONSTRAINT fk_plazas_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

--9. 광장 참여 엔트리 테이블
-- [수정] 현재 PlazaEntry 엔티티 기준 owner_id, mood_key, weather_key 등으로 반영
CREATE TABLE plaza_entries (
                               id BIGINT AUTO_INCREMENT PRIMARY KEY,
                               plaza_id BIGINT NOT NULL,
                               owner_id BIGINT NOT NULL,
                               title VARCHAR(100) NULL,
                               content TEXT NOT NULL,
                               mood_key VARCHAR(50) NOT NULL,
                               weather_key VARCHAR(50) NOT NULL,
                               object_key VARCHAR(100) NOT NULL,
                               slot_key VARCHAR(100) NOT NULL,
                               position_x INT NULL,
                               position_y INT NULL,
                               layer_index INT NULL,
                               create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               update_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                               CONSTRAINT fk_plaza_entries_plaza FOREIGN KEY (plaza_id) REFERENCES plazas(id),
                               CONSTRAINT fk_plaza_entries_owner FOREIGN KEY (owner_id) REFERENCES users(id),
                               INDEX idx_plaza_entries_plaza_id (plaza_id),
                               INDEX idx_plaza_entries_owner_id (owner_id)
);

--10. 광장 좋아요 테이블
-- [수정] 현재 엔티티 기준 테이블명은 object_likes
CREATE TABLE object_likes (
                              id BIGINT AUTO_INCREMENT PRIMARY KEY,
                              user_id BIGINT NOT NULL,
                              plaza_entry_id BIGINT NOT NULL,
                              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                              CONSTRAINT fk_object_likes_user FOREIGN KEY (user_id) REFERENCES users(id),
                              CONSTRAINT fk_object_likes_entry FOREIGN KEY (plaza_entry_id) REFERENCES plaza_entries(id),
                              CONSTRAINT uk_user_plaza_entry UNIQUE (user_id, plaza_entry_id)
);

--11. 우편함(편지) 테이블
-- [수정] 현재 Letter 엔티티 기준 컬럼 전체 반영
CREATE TABLE letters (
                         id BIGINT AUTO_INCREMENT PRIMARY KEY,
                         sender_id BIGINT NULL,
                         receiver_id BIGINT NOT NULL,
                         title VARCHAR(100) NOT NULL,
                         message TEXT NOT NULL,
                         plaza_title VARCHAR(100) NOT NULL,
                         plaza_id BIGINT NULL,
                         generated_image_data LONGTEXT NULL,
                         completed_at DATETIME NOT NULL,
                         plaza_created_at DATETIME NULL,
                         participant_count BIGINT NULL,
                         my_object_key VARCHAR(100) NULL,
                         my_object_title VARCHAR(100) NULL,
                         my_object_content TEXT NULL,
                         is_read TINYINT(1) NOT NULL DEFAULT 0,
                         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                         CONSTRAINT fk_letters_sender FOREIGN KEY (sender_id) REFERENCES users(id),
                         CONSTRAINT fk_letters_receiver FOREIGN KEY (receiver_id) REFERENCES users(id),
                         INDEX idx_letters_receiver_created_at (receiver_id, created_at)
);

--12. 비밀번호 재설정 토큰 테이블
-- [수정] 비밀번호 찾기 시 발급되는 재설정 토큰 및 만료 시간, 사용 여부를 관리
CREATE TABLE password_reset_tokens (
                                       id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                       email VARCHAR(100) NOT NULL,
                                       token VARCHAR(100) NOT NULL,
                                       used TINYINT(1) NOT NULL DEFAULT 0,
                                       expires_at DATETIME NOT NULL,
                                       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                       INDEX idx_password_reset_tokens_email_created_at (email, created_at)
);

--13. 1:1 문의 테이블
-- 사용자가 남긴 1:1 문의를 저장합니다. 목록은 모두에게 보이되 내용은 관리자만 조회합니다.
CREATE TABLE inquiries (
                           id BIGINT AUTO_INCREMENT PRIMARY KEY,
                           author_id BIGINT NULL,
                           author_nickname VARCHAR(20) NULL,
                           author_email VARCHAR(100) NULL,
                           title VARCHAR(100) NOT NULL,
                           content TEXT NOT NULL,
                           answer TEXT NULL,
                           answerer_nickname VARCHAR(20) NULL,
                           answered_at DATETIME NULL,
                           created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                           CONSTRAINT fk_inquiries_author FOREIGN KEY (author_id) REFERENCES users(id),
                           INDEX idx_inquiries_created_at (created_at)
);

--14. 공지사항 테이블
-- 관리자가 작성하는 공지사항. 모든 사용자가 열람하고, 작성/수정/삭제는 관리자만 가능합니다.
CREATE TABLE notices (
                         id BIGINT AUTO_INCREMENT PRIMARY KEY,
                         author_id BIGINT NULL,
                         author_nickname VARCHAR(20) NULL,
                         title VARCHAR(100) NOT NULL,
                         content TEXT NOT NULL,
                         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                         CONSTRAINT fk_notices_author FOREIGN KEY (author_id) REFERENCES users(id),
                         INDEX idx_notices_created_at (created_at)
);
