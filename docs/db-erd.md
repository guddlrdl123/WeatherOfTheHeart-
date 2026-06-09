# Weather Of The Heart DB ERD

이 다이어그램은 현재 백엔드 JPA 엔티티 기준으로 정리한 구조입니다.
DBeaver에서 FK 선이 안 보일 수 있는 이유는 일부 관계가 실제 DB 외래키 제약이 아니라 `Long userId`, `Long plazaId`, `object_key`, `slot_key` 같은 값 참조로만 관리되기 때문입니다.

```mermaid
erDiagram
    USERS {
        BIGINT id PK
        VARCHAR email UK
        VARCHAR password
        VARCHAR nickname
        BOOLEAN is_admin
        DATETIME created_at
        DATETIME updated_at
    }

    EMAIL_VERIFICATIONS {
        BIGINT id PK
        VARCHAR email
        VARCHAR code
        BOOLEAN verified
        DATETIME expires_at
        DATETIME created_at
    }

    REFRESH_TOKENS {
        BIGINT id PK
        BIGINT user_id UK
        VARCHAR token_value
        DATETIME expired_at
        DATETIME created_at
        DATETIME updated_at
    }

    PRIVATE_ROOMS {
        BIGINT id PK
        BIGINT user_id FK
        INT year
        INT month
        VARCHAR title
        DATETIME archived_at
        DATETIME created_at
        DATETIME updated_at
    }

    PRIVATE_MEMORIES {
        BIGINT id PK
        BIGINT private_room_id FK
        VARCHAR title
        TEXT content
        VARCHAR mood_key
        VARCHAR weather_key
        VARCHAR object_key
        VARCHAR slot_key
        DATE memory_date
        VARCHAR image_url
        INT position_x
        INT position_y
        BOOLEAN flip_x
        INT tilt_deg
        INT layer_index
        BOOLEAN content_updated
        DATETIME created_at
        DATETIME updated_at
    }

    PLAZAS {
        BIGINT id PK
        BIGINT owner_id FK
        VARCHAR title
        TEXT topic
        INT max_objects
        BOOLEAN allow_search
        BOOLEAN allow_invite
        VARCHAR invite_code UK
        BOOLEAN allow_duplicate_objects
        VARCHAR background_type
        VARCHAR background_color
        VARCHAR background_key
        BOOLEAN is_active
        DATETIME completed_at
        DATETIME created_at
        DATETIME updated_at
    }

    PLAZA_ENTRIES {
        BIGINT id PK
        BIGINT plaza_id FK
        BIGINT owner_id FK
        VARCHAR title
        TEXT content
        VARCHAR mood_key
        VARCHAR weather_key
        VARCHAR object_key
        VARCHAR slot_key
        INT position_x
        INT position_y
        INT layer_index
        DATETIME create_at
        DATETIME update_at
    }

    OBJECT_LIKES {
        BIGINT id PK
        BIGINT user_id FK
        BIGINT plaza_entry_id FK
        DATETIME created_at
        DATETIME updated_at
    }

    LETTERS {
        BIGINT id PK
        BIGINT sender_id FK
        BIGINT receiver_id FK
        VARCHAR title
        TEXT message
        VARCHAR plaza_title
        BIGINT plaza_id
        LONGTEXT generated_image_data
        DATETIME completed_at
        BOOLEAN is_read
        DATETIME created_at
        DATETIME updated_at
    }

    OBJECT_CATALOGS {
        BIGINT id PK
        VARCHAR object_key UK
        VARCHAR object_name
        VARCHAR mood
        VARCHAR slot_key
        VARCHAR image_url
        DOUBLE image_scale
        BOOLEAN flip_x
        INT tilt_deg
        TEXT description
        BOOLEAN is_active
        BOOLEAN allow_private
        BOOLEAN allow_plaza
        DATETIME created_at
        DATETIME updated_at
    }

    OBJECT_SLOTS {
        BIGINT id PK
        VARCHAR slot_key UK
        VARCHAR slot_name
        INT position_x
        INT position_y
        BOOLEAN is_active
        DATETIME created_at
        DATETIME updated_at
    }

    USERS ||--o{ PRIVATE_ROOMS : owns
    PRIVATE_ROOMS ||--o{ PRIVATE_MEMORIES : contains

    USERS ||--o{ PLAZAS : creates
    PLAZAS ||--o{ PLAZA_ENTRIES : contains
    USERS ||--o{ PLAZA_ENTRIES : writes

    USERS ||--o{ OBJECT_LIKES : likes
    PLAZA_ENTRIES ||--o{ OBJECT_LIKES : receives

    USERS ||--o{ LETTERS : sends
    USERS ||--o{ LETTERS : receives

    USERS ||--|| REFRESH_TOKENS : token_user_id

    OBJECT_SLOTS ||--o{ OBJECT_CATALOGS : slot_key
    OBJECT_CATALOGS ||--o{ PRIVATE_MEMORIES : object_key
    OBJECT_CATALOGS ||--o{ PLAZA_ENTRIES : object_key
    OBJECT_SLOTS ||--o{ PRIVATE_MEMORIES : slot_key
    OBJECT_SLOTS ||--o{ PLAZA_ENTRIES : slot_key

    PLAZAS ||--o{ LETTERS : plaza_id_logical
```

## 관계 메모

- `users.id` -> `private_rooms.user_id`
- `private_rooms.id` -> `private_memories.private_room_id`
- `users.id` -> `plazas.owner_id`
- `plazas.id` -> `plaza_entries.plaza_id`
- `users.id` -> `plaza_entries.owner_id`
- `users.id` -> `object_likes.user_id`
- `plaza_entries.id` -> `object_likes.plaza_entry_id`
- `users.id` -> `letters.sender_id`
- `users.id` -> `letters.receiver_id`

## 논리 참조

아래는 코드에서 값으로 연결하지만, 엔티티상 `@ManyToOne`으로 직접 매핑되지는 않은 관계입니다.

- `refresh_tokens.user_id` -> `users.id`
- `letters.plaza_id` -> `plazas.id`
- `private_memories.object_key` -> `object_catalogs.object_key`
- `plaza_entries.object_key` -> `object_catalogs.object_key`
- `object_catalogs.slot_key` -> `object_slots.slot_key`
- `private_memories.slot_key` -> `object_slots.slot_key`
- `plaza_entries.slot_key` -> `object_slots.slot_key`

