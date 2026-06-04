
--1. 사용자 정보 테이블
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

--2. 월별 방 정보 테이블
CREATE TABLE monthly_rooms(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    archived_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_monthly_rooms_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uk_user_year_month UNIQUE (user_id, year, month)
);

--3. 일기(기억) 테이블
CREATE TABLE memory_entries(
    id BIGINT NOT NULL,
    monthly_room_id BIGINT NOT NULL,
    memory_date DATE NOT NULL,
    content TEXT NOT NULL,
    mood VARCHAR(30) NOT NULL,
    weather VARCHAR(30) NOT NULL,
    lighting VARCHAR(30) NOT NULL,
    object_key VARCHAR(50) NOT NULL,
    slot_key VARCHAR(50) NOT NULL,
    message VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_memory_entries_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_memory_entries_monthly_room FOREIGN KEY(monthly_room_id) REFERENCES monthly_rooms(id),
    CONSTRAINT uk_user_memory_date UNIQUE (user_id, memory_date),
    INDEX idx_memory_user_date(user_id,memory_date DESC)
);

--4. 사물 카탈로그 테이블
CREATE TABLE room_objects(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    object_key VARCHAR(50) NOT NULL UNIQUE,
    object_name VARCHAR(50) NOT NULL,
    mood VARCHAR(30) NOT NULL,
    slot_key VARCHAR(50) NOT NULL,
    image_url VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

--5. 사물 배치 위치 테이블
CREATE TABLE object_slots(
    id BIGINT AUTO_INCREMENT PRIMRAY KEY,
    slot_key VARCHAR(50) NOT NULL UNIQUE,
    slot_name VARCHAR(50) NOT NULL,
    position_x INT NOT NULL,
    position_y INT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

--6. 인증 정보 테이블
CREATE TABLE refresh_tokens(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);

--7. 광장 메인 테이블
CREATE TABLE plazas(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

--8. 광장 글 공유 테이블
CREATE TABLE plaza_entries(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plaza_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    memory_id BIGINT NOT NULL,
    like_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_plaza_entries_plaza FOREIGN KEY (plaza_id) REFERENCES plazas(id),
    CONSTRAINT fk_plaza_entries_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_plaza_entries_memory FOREIGN KEY (memory_id) REFERENCES memory_entries(id)
);

--9. 광장 좋아요 테이블
CREATE TABLE plaza_likes(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    plaza_entry_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_plaza_likes_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_plaza_likes_entry FOREIGN KEY (plaza_entry_id) REFERENCES plaza_entries(id),
    CONSTRAINT fk_user_plaza_entry UNIQUE (user_id, plaza_entry_id)
);



















