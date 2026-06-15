# 마음의 날씨

말하지 못한 이야기를 기록하면, 감정이 날씨와 오브젝트로 표현되는 개인 감정 기록 서비스입니다. 사용자는 자신의 방에 기억을 남기고, 감정 분석 결과에 따라 방의 날씨와 배치 오브젝트를 관리할 수 있습니다. 또한 광장 기능을 통해 여러 사용자의 이야기를 하나의 공간에 모아 공유할 수 있습니다.

## 프로젝트 개요

마음의 날씨는 감정을 단순 텍스트로만 저장하지 않고, 날씨와 공간이라는 시각적 요소로 바꾸어 보여주는 웹 애플리케이션입니다. 프론트엔드는 사용자가 방과 광장을 직접 조작하는 경험을 담당하고, 백엔드는 인증, 데이터 검증, 감정 분석, 오브젝트/기억/광장 데이터 관리를 담당합니다. 데이터베이스는 사용자, 기억, 광장, 편지함 등의 상태를 안정적으로 저장합니다.

## 주요 기능

- 회원가입, 로그인, 이메일 인증
- 개인 방에서 기억 작성, 수정, 삭제
- 기억의 감정, 날씨, 오브젝트, 위치 정보 저장
- 날짜별 기억 확인을 위한 캘린더/사이드바
- AI 기반 감정 분석 API
- 오브젝트 카탈로그 조회 및 방 배치
- 광장 생성, 광장 입장, 광장 글 작성
- 광장 글 좋아요, 위치 수정, 삭제
- 광장 완료 후 편지함에서 결과 확인
- 마이페이지에서 프로필과 내가 만든/참여한 광장 확인

## 기술 스택

### Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Lucide React

### Backend

- Java 21
- Spring Boot
- Spring Web MVC
- Spring Data JPA
- Spring Validation
- Spring Mail
- Spring WebFlux WebClient
- MySQL
- AWS S3 SDK
- LangChain4j OpenAI

## 폴더 구조

```text
.
├── backend
│   ├── src/main/java/com/woth/backend
│   │   ├── ai          # 감정 분석 API
│   │   ├── auth        # 로그인, 회원가입, 이메일 인증, 토큰
│   │   ├── memory      # 개인 기억 관리
│   │   ├── object      # 오브젝트 카탈로그
│   │   ├── plaza       # 광장과 광장 글 관리
│   │   ├── mailbox     # 완료된 광장 편지함
│   │   ├── user        # 사용자 프로필
│   │   └── global      # 공통 응답, 예외, 설정
│   └── src/main/resources
│       ├── application.yaml
│       └── schema.sql
├── frontend
│   ├── src
│   │   ├── app         # 라우팅
│   │   ├── components  # 공통 UI
│   │   ├── constants   # 날씨, 감정, 오브젝트 상수
│   │   ├── features    # 화면 단위 기능
│   │   ├── services    # API 호출
│   │   ├── types       # 타입 정의
│   │   └── utils       # 인증, 날짜, 상태 유틸
│   └── public
└── docs                # ERD, 시스템 아키텍처 문서
```

## 실행 방법

### 1. 저장소 준비

```bash
git clone <repository-url>
cd lastdance
```

### 2. 백엔드 실행

백엔드는 기본적으로 `5000` 포트에서 실행됩니다.

```bash
cd backend
./gradlew bootRun
```

Windows PowerShell에서는 다음 명령을 사용할 수 있습니다.

```powershell
cd backend
.\gradlew.bat bootRun
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

Vite 개발 서버가 실행되면 브라우저에서 안내되는 로컬 주소로 접속합니다.

## 환경 변수

백엔드는 루트 또는 `backend` 폴더의 `.env` 파일을 읽을 수 있습니다.

```env
SERVER_PORT=5000

DB_URL=jdbc:mysql://localhost:3306/woth
DB_USERNAME=root
DB_PASSWORD=your_password

OPENAI_API_KEY=your_openai_api_key

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password

AWS_REGION=ap-northeast-2
AWS_S3_BUCKET_NAME=your_bucket_name
AWS_S3_PUBLIC_BASE_URL=https://your_bucket_name.s3.ap-northeast-2.amazonaws.com
AWS_S3_RAG_BUCKET_NAME=your_rag_bucket_name
```

프론트엔드는 `frontend/.env`에 API 주소를 설정할 수 있습니다.

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_S3_ASSET_BASE_URL=https://your_bucket_name.s3.ap-northeast-2.amazonaws.com
```

## 주요 API

| 구분 | Method | Endpoint | 설명 |
| --- | --- | --- | --- |
| Auth | POST | `/api/auth/signup` | 회원가입 |
| Auth | POST | `/api/auth/login` | 로그인 |
| Auth | POST | `/api/auth/email/send` | 이메일 인증 코드 발송 |
| Auth | POST | `/api/auth/email/verify` | 이메일 인증 코드 확인 |
| AI | POST | `/api/ai/analyze` | 감정 분석 |
| Memory | GET | `/api/memories` | 개인 기억 목록 조회 |
| Memory | POST | `/api/memories` | 개인 기억 생성 |
| Memory | PATCH | `/api/memories/{memoryId}` | 개인 기억 수정 |
| Memory | PATCH/PUT | `/api/memories/{memoryId}/position` | 기억 오브젝트 위치 수정 |
| Memory | DELETE | `/api/memories/{memoryId}` | 개인 기억 삭제 |
| Object | GET | `/api/objects` | 오브젝트 카탈로그 조회 |
| Plaza | GET | `/api/plazas` | 광장 목록 조회 |
| Plaza | POST | `/api/plazas` | 광장 생성 |
| Plaza | POST | `/api/plazas/with-first-entry` | 첫 글과 함께 광장 생성 |
| Plaza | GET | `/api/plazas/{plazaId}/entries` | 광장 글 목록 조회 |
| Plaza | POST | `/api/plazas/{plazaId}/entries` | 광장 글 작성 |
| Plaza | POST | `/api/plazas/entries/{entryId}/likes` | 광장 글 좋아요 토글 |
| Mailbox | GET | `/api/mailbox` | 편지함 조회 |
| Mailbox | GET | `/api/mailbox/unread-count` | 읽지 않은 편지 수 조회 |

## 설계 포인트

이 프로젝트에서는 같은 기능이라도 프론트엔드, 백엔드, 데이터베이스 중 어디에서 책임질지에 따라 유지보수성과 보안성이 달라진다는 점을 중요하게 다뤘습니다.

- 프론트엔드는 사용자의 조작 경험과 화면 상태를 담당합니다.
- 백엔드는 인증, 권한 확인, 데이터 검증, 감정 분석 호출 등 신뢰해야 하는 로직을 담당합니다.
- 데이터베이스는 사용자, 기억, 광장, 좋아요, 편지함처럼 오래 유지되어야 하는 상태를 저장합니다.

예를 들어 오브젝트 위치는 사용자가 프론트에서 직접 움직이지만, 최종 위치는 백엔드 API를 통해 검증 후 데이터베이스에 저장됩니다. 감정 분석도 프론트에서 직접 처리하지 않고 백엔드를 거치도록 하여 API 키와 분석 로직을 보호했습니다.

## 문서

- `docs/weather-of-heart-system-architecture-current.png`
- `docs/weather-of-heart-erd-current.png`
- `docs/db-erd.md`

## 테스트 및 빌드

프론트엔드 빌드:

```bash
cd frontend
npm run build
```

백엔드 테스트:

```bash
cd backend
./gradlew test
```

Windows PowerShell:

```powershell
cd backend
.\gradlew.bat test
```
