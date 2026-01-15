# JH0103 프로젝트 코드 색인

채용공고 수집 및 분석 시스템의 전체 파일 구조와 주요 기능을 정리한 문서입니다.

## 프로젝트 개요

CareerOS Collector는 로컬에서 작동하는 AI 취업준비 시스템입니다.
원클릭 공고 수집, 자동 회사 분석, 맞춤형 이력서 생성으로 체계적인 취업 준비를 지원합니다.

**주요 기능**
- 원클릭 채용공고 자동 캡처 (Alt+Shift+S)
- AI 기반 공고 정보 자동 추출 및 구조화
- 동적 섹션 기반 유연한 공고 표시
- 카카오맵 연동 회사 위치 표시
- ODsay API 연동 대중교통 경로 안내
- 공고 상태 관리 (PENDING, DRAFT, APPLIED, CLOSED)
- OAuth2 소셜 로그인 (Google, GitHub, Naver)

**지원 사이트**
- 사람인 (saramin.co.kr)
- 잡코리아 (jobkorea.co.kr)
- 원티드 (wanted.co.kr)

**기술 스택**
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Axios
- **Backend**: Java 21, Spring Boot 3, Spring Security, JPA
- **Database**: MySQL 8.0
- **AI Engine**: Python, Flask, Ollama
- **Extension**: Chrome Extension (Manifest V3)
- **DevOps**: Docker, GitHub Actions

더 자세한 개발 히스토리는 [HISTORY.md](HISTORY.md)를 참고하세요.

---

## 목차
1. [프로젝트 구조](#1-프로젝트-구조)
2. [시작하기 (Setup & Run)](#2-시작하기)
3. [상세 파일 색인](#3-상세-파일-색인)
4. [주요 함수 및 API](#4-주요-함수-및-api)
5. [데이터 흐름](#5-데이터-흐름)
6. [환경 변수](#6-환경-변수)

---

## 1. 프로젝트 구조

```
JH0103/
├── .github/workflows/          CI/CD (GitHub Actions)
├── UI/                         웹 애플리케이션 (Frontend)
│   ├── src/
│   │   ├── components/         React 컴포넌트
│   │   │   ├── job/            공고 관련 컴포넌트
│   │   │   ├── layout/         레이아웃 컴포넌트
│   │   │   ├── map/            카카오맵 컴포넌트
│   │   │   ├── settings/       설정 관련 컴포넌트
│   │   │   └── views/          페이지 뷰 컴포넌트 (AuthView 등)
│   │   ├── pages/              라우팅 페이지 (Dashboard 등)
│   │   ├── types/              TypeScript 타입 정의
│   │   ├── utils/              유틸 함수 (API 통신, 데이터 정규화)
│   │   ├── assets/             이미지, 아이콘 등 정적 자산
│   │   ├── main.tsx            React 진입점
│   │   ├── App.tsx             메인 컴포넌트
│   │   └── index.css           전역 스타일
│   └── Vite, Tailwind 설정 파일
├── services/
│   └── backend-core/           백엔드 API (Spring Boot)
│       └── src/main/java/com/jh0103/core/
│           ├── config/         애플리케이션 설정 (Security, CORS)
│           ├── job/            공고 관리 도메인
│           │   ├── controller/ REST API 엔드포인트
│           │   ├── service/    비즈니스 로직
│           │   ├── domain/     JPA 엔티티 (Job, JobStatus)
│           │   ├── dto/        데이터 전송 객체
│           │   └── repository/ JPA Repository
│           └── user/           사용자 및 인증 도메인
│               ├── controller/ REST API 엔드포인트
│               ├── service/    OAuth2, 사용자 서비스
│               ├── domain/     JPA 엔티티 (User, Role)
│               ├── dto/        OAuth 정보 변환 객체
│               ├── repository/ JPA Repository
│               └── config/     Security 설정
├── ai-engine/
│   └── collectorAI/            이미지 분석 AI 서버 (Python)
│       ├── server.py           Flask 웹 서버
│       ├── config.py           Ollama 모델 설정
│       ├── requirements.txt    Python 의존성
│       └── Dockerfile          Docker 빌드 설정
├── extension/                  크롬 확장프로그램 (Manifest V3)
│   ├── manifest.json           확장 프로그램 설정
│   ├── background.js           백그라운드 로직 (캡처, API 통신)
│   ├── content.js              웹 페이지 DOM 접근 스크립트
│   ├── popup.html              팝업 UI
│   ├── popup.js                팝업 로직
│   └── toast.css               알림 스타일
├── infra/
│   └── db/
│       └── init/               DB 초기화 스크립트
│           └── init.sql        MySQL 테이블 및 기본 데이터
├── HISTORY.md                  개발 히스토리 및 변경 사항
├── README.md                   프로젝트 설명 (현재 파일)
└── docker-compose.yml          모든 서비스 실행을 위한 Docker 설정
```

---

## 2. 시작하기

### 사전 요구사항
- Docker Desktop 설치 및 실행
- Git

### 실행 절차
1. **프로젝트 클론**
   ```bash
   git clone <repository-url>
   cd JH0103
   ```

2. **환경 변수 설정**
   프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 `docker-compose.yml`에서 요구하는 환경 변수를 설정합니다. 아래는 예시입니다.
   ```env
   # Database
   MYSQL_ROOT_PASSWORD=your_root_password
   MYSQL_DATABASE=jh0103_db
   MYSQL_USER=your_db_user
   MYSQL_PASSWORD=your_db_password

   # Google OAuth2
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # GitHub OAuth2
   GH_CLIENT_ID=your_github_client_id
   GH_CLIENT_SECRET=your_github_client_secret

   # Naver OAuth2
   NAVER_CLIENT_ID=your_naver_client_id
   NAVER_CLIENT_SECRET=your_naver_client_secret
   ```

3. **Docker Compose 실행**
   아래 명령어를 실행하여 모든 서비스를 빌드하고 시작합니다.
   ```bash
   docker-compose up -d --build
   ```
   - `-d`: 백그라운드에서 실행
   - `--build`: 이미지를 새로 빌드
   
   실행되는 서비스:
   - `jh0103-db`: MySQL 8.0 데이터베이스
   - `ui-service`: React 프론트엔드 (Node 20)
   - `backend-core`: Spring Boot 백엔드
   - `collector-service`: Python AI 이미지 분석 서버

4. **서비스 접속**
   - **UI (Frontend)**: `http://localhost:5173`
   - **Backend API**: `http://localhost:8080`
   - **AI Collector**: `http://localhost:5000`
   - **MySQL 데이터베이스**: `localhost:3306`

### 백엔드 테스트 실행
`docker-compose`를 사용하거나 Gradle을 직접 사용하여 테스트를 실행할 수 있습니다.
```bash
# Docker를 이용하는 경우
docker-compose run backend-core-test

# 또는 Gradle Wrapper를 직접 사용하는 경우
cd services/backend-core
./gradlew test
```

---

## 3. 상세 파일 색인

### 3.1 UI (Frontend) - `UI/`
- `package.json`: 의존성 라이브러리 목록 및 스크립트.
- `vite.config.ts`: Vite 빌드 도구 설정.
- `tsconfig.json`: TypeScript 컴파일러 설정.
- `tailwind.config.js`: Tailwind CSS 설정.
- `src/main.tsx`: React 애플리케이션 진입점.
- `src/App.tsx`: 메인 컴포넌트 및 라우팅 설정.

**Components:**
- `components/job/DynamicJobDetail.tsx`: 공고 상세 정보 동적 렌더링.
- `components/map/KakaoMapContainer.tsx`: 카카오맵 연동 컴포넌트.
- `components/views/AuthView.tsx`: OAuth2 로그인 페이지.
- `components/settings/`: 설정 관련 컴포넌트.
- `components/layout/`: 레이아웃 감싸기 컴포넌트.

**Pages:**
- `pages/Dashboard.tsx`: 메인 대시보드 페이지 (공고 목록).

**Utils:**
- `utils/jsonNormalizer.ts`: AI가 추출한 JSON 데이터를 정규화하는 로직.
- `utils/jobParser.ts`: 정규화된 JSON을 프론트엔드 Job 모델로 변환.
- `utils/odsayApi.ts`: 대중교통 길찾기 API 연동 로직.

**Types:**
- `types/`: Job, User 등 TypeScript 인터페이스 정의.

**Assets:**
- `assets/`: 이미지, 아이콘 등 정적 자산.

### 3.2 Backend - `services/backend-core/`
- `build.gradle`: Gradle 빌드 설정 및 의존성 관리.
- `Dockerfile`: Spring Boot 애플리케이션 Docker 이미지 빌드 설정.
- `src/main/java/com/jh0103/core/BackendCoreApplication.java`: Spring Boot 애플리케이션 진입점.
- `src/main/resources/application.yml`: 애플리케이션 설정 (DB, OAuth2, 로깅 등).
- `src/main/resources/application.properties`: 추가 설정.

#### Config 패키지 (`config/`)
- `SecurityConfig.java`: Spring Security 설정 (OAuth2 로그인, CORS, 인가 규칙).
- `CorsConfig.java`: CORS 정책 설정.

#### 공고 도메인 (`job/`)
**Controller:**
- `JobController.java`: 공고 관련 REST API 엔드포인트.

**Service:**
- `JobService.java`: 공고 비즈니스 로직 (저장, 조회, 상태 업데이트, 삭제).

**Domain (Entity):**
- `Job.java`: 공고 데이터 JPA 엔티티.
- `JobStatus.java`: 공고 상태 열거형 (PENDING, DRAFT, APPLIED, CLOSED).

**DTO:**
- `UpdateJobStatusRequest.java`: 공고 상태 업데이트 요청 객체.

**Repository:**
- `JobRepository.java`: 공고 데이터 JPA Repository (조회, 저장, 삭제).

#### 사용자/인증 도메인 (`user/`)
**Controller:**
- `UserController.java`: 사용자 정보 관련 REST API.

**Service:**
- `UserService.java`: 사용자 관리 비즈니스 로직.
- `CustomOAuth2UserService.java`: OAuth2 로그인 성공 후 사용자 정보를 처리하는 서비스.

**Domain (Entity):**
- `User.java`: 사용자 데이터 JPA 엔티티.
- `Role.java`: 사용자 역할 열거형.

**DTO:**
- `SessionUser.java`: 세션에 저장되는 사용자 정보 객체.
- `OAuthAttributes.java`: 소셜 로그인 플랫폼별 사용자 정보를 DTO로 변환.

**Config:**
- `SecurityConfig.java`: 사용자 인증 관련 보안 설정 (중복 주의).

**Repository:**
- `UserRepository.java`: 사용자 데이터 JPA Repository (이메일로 조회 등).

### 3.3 AI Engine - `ai-engine/collectorAI/`
- `server.py`: 이미지 분석 요청을 받는 Flask 기반 비동기 웹 서버.
  - `POST /analyze`: Base64로 인코딩된 스크린샷 이미지를 받아 AI 분석을 시작하고 작업 ID 반환.
  - `GET /status/{job_id}`: AI 분석 작업의 상태 및 결과를 조회.
- `config.py`: Ollama 모델 설정 및 프롬프트 템플릿 (이미지 분석 지시사항).
- `requirements.txt`: Python 의존성 목록 (Flask, Ollama, Pillow 등).
- `Dockerfile`: AI 서버의 Docker 이미지 빌드 설정 (Python 환경 구성).

### 3.4 Extension - `extension/`
- `manifest.json`: 확장 프로그램의 메타데이터 (이름, 버전, 권한, 호스트 권한).
- `background.js`: 웹 페이지와 독립적으로 실행되는 서비스 워커 (캡처 단축키 감지, 이미지 캡처, API 통신).
- `content.js`: 현재 웹 페이지의 DOM에 접근하여 상호작용하는 스크립트 (UI 숨김, 캡처 준비).
- `popup.html`: 확장 프로그램 아이콘 클릭 시 나타나는 팝업 UI 마크업.
- `popup.js`: 팝업 UI 로직 및 이벤트 처리.
- `toast.css`: 알림 메시지(Toast) 스타일.

### 3.5 Infrastructure - `infra/db/init/`
- `init.sql`: MySQL 초기화 스크립트 (테이블 생성, 기본 데이터 추가).
  - `users` 테이블: 사용자 정보 (이메일, OAuth ID, 이름, 역할 등).
  - `jobs` 테이블: 공고 정보 (회사명, 공고명, 상태, JSON 데이터, 스크린샷 등).

---

## 4. 주요 함수 및 API

### 4.1 Frontend (`UI/src/utils/`)
- `jsonNormalizer.ts`: `normalizeJobJson(rawJson)` - AI가 생성한 불규칙한 JSON을 정제.
- `jobParser.ts`: `parseJsonToJob(rawJson)` - 정제된 JSON을 프론트엔드 `Job` 모델로 변환.
- `odsayApi.ts`: `searchTransitRoute(...)` - 출발지와 목적지 좌표로 대중교통 경로 검색.
- `axios` 인스턴스: 백엔드 API (`/api/jobs`, `/api/user/me`)와 통신.

### 4.2 Backend (`services/backend-core/`)
- `JobController`:
  - `POST /api/v1/jobs`: 새 공고 저장 (AI 분석 결과) - Python AI 서버에서 호출.
  - `GET /api/v1/jobs`: 모든 공고 목록 조회 - 프론트엔드에서 호출.
  - `GET /api/v1/jobs/{id}`: 특정 공고 상세 조회.
  - `DELETE /api/v1/jobs/{id}`: 공고 삭제.
  - `PATCH /api/v1/jobs/{jobId}/status`: 공고 상태 변경 (PENDING → DRAFT → APPLIED 등).
- `UserController`:
  - `GET /api/v1/user`: 현재 로그인된 사용자 정보 조회 (세션에서 조회).
- `CustomOAuth2UserService`:
  - `loadUser(...)`: OAuth2 로그인 성공 시 호출되어 사용자 정보를 DB에 저장 또는 업데이트.
- `SecurityConfig`:
  - OAuth2 로그인 설정 (Google, GitHub, Naver).
  - 로그아웃 엔드포인트 (`/api/v1/auth/logout`).
  - CORS 정책 설정.

### 4.3 AI Server (`ai-engine/collectorAI/`)
- `POST /analyze`: 이미지 분석 요청.
  - **요청 본문**: JSON 형식 (Base64 인코딩된 이미지, 사용자 이메일, 원본 URL 등).
  - **응답**: 분석 작업 ID 및 AI 분석 결과 (회사 정보, 공고 정보 등 JSON 형식).
- `GET /status/{job_id}`: 분석 작업의 현재 상태 및 결과 조회.

---

## 5. 데이터 흐름

### 5.1 공고 수집 및 분석 (전체 플로우)
1. **사용자**: 채용공고 페이지에서 `Alt+Shift+S` 단축키 입력.
2. **Extension (`background.js`)**: 단축키 감지 후 `content.js`에 메시지 전송.
3. **Extension (`content.js`)**: 
   - 현재 페이지 DOM에서 불필요한 UI 요소 제거 (네비게이션, 광고 등).
   - 캡처 준비 완료 메시지를 background에 전송.
4. **Extension (`background.js`)**: 
   - Chrome DevTools Protocol(CDP)을 사용해 보이는 영역(viewport) 스크린샷 캡처.
   - 이미지를 Base64로 인코딩.
5. **Extension → AI Server**: 
   - `POST /analyze` API 호출.
   - 요청 본문: Base64 이미지, 사용자 이메일, 현재 URL, 기타 메타데이터.
6. **AI Server (`server.py`)**: 
   - Ollama 모델을 사용해 비동기적으로 이미지 분석 수행.
   - 회사 정보, 공고 정보, 급여, 근무지 등을 자동 추출.
   - 분석 결과를 JSON 형식으로 정리 후 내부 저장소(또는 DB)에 저장.
7. **Extension → Backend**: 
   - AI 분석 결과를 `POST /api/v1/jobs` API로 백엔드에 전송.
   - 백엔드가 데이터를 MySQL에 저장.
8. **Extension → UI**: 
   - `chrome.runtime.sendMessage`를 통해 UI에 분석 완료 알림.
9. **UI (`Dashboard.tsx`)**: 
   - 새 공고가 감지되면 백엔드에 `GET /api/v1/jobs` 요청.
   - 목록을 갱신하여 새로 저장된 공고를 화면에 표시.

### 5.2 사용자 로그인 (OAuth2 플로우)
1. **사용자**: UI의 로그인 버튼 (`AuthView.tsx`) 클릭.
2. **Frontend**: Google/GitHub/Naver OAuth2 로그인 페이지로 리다이렉트.
3. **사용자**: 소셜 계정으로 인증.
4. **Backend (`SecurityConfig`)**: OAuth2 인증 성공 후 콜백 수신.
5. **Backend (`CustomOAuth2UserService`)**: 
   - 사용자 정보를 `OAuthAttributes`로 변환.
   - 이메일로 기존 사용자 조회, 없으면 새로 생성.
   - 사용자를 `users` 테이블에 저장/업데이트.
6. **Backend**: 기본 성공 URL (`http://localhost:5173`)로 리다이렉트.
7. **Frontend**: 대시보드 페이지로 이동, `GET /api/v1/user` 요청하여 사용자 정보 확인.

### 5.3 공고 상태 관리
- 공고는 다음 상태를 가집니다: `PENDING` → `DRAFT` → `APPLIED` → `CLOSED`.
- 사용자가 UI에서 상태를 변경하면 `PATCH /api/v1/jobs/{jobId}/status` 요청 전송.
- 백엔드가 상태를 업데이트하고 변경 결과 반환.

---

## 6. 환경 변수

### 6.1 Docker Compose (`.env`)
프로젝트 루트의 `.env` 파일에 의해 설정됩니다. (상세 내용은 [시작하기](#2-시작하기) 섹션 참고)

**Database:**
- `MYSQL_ROOT_PASSWORD`: MySQL 루트 비밀번호.
- `MYSQL_DATABASE`: 생성할 데이터베이스 이름.
- `MYSQL_USER`: 데이터베이스 사용자명.
- `MYSQL_PASSWORD`: 데이터베이스 사용자 비밀번호.

**Google OAuth2:**
- `GOOGLE_CLIENT_ID`: Google OAuth2 클라이언트 ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth2 클라이언트 시크릿.

**GitHub OAuth2:**
- `GH_CLIENT_ID`: GitHub OAuth2 클라이언트 ID (환경 변수 이름: `GITHUB_CLIENT_ID` 매핑됨).
- `GH_CLIENT_SECRET`: GitHub OAuth2 클라이언트 시크릿 (환경 변수 이름: `GITHUB_CLIENT_SECRET` 매핑됨).

**Naver OAuth2:**
- `NAVER_CLIENT_ID`: Naver OAuth2 클라이언트 ID.
- `NAVER_CLIENT_SECRET`: Naver OAuth2 클라이언트 시크릿.

### 6.2 Frontend (`UI/.env` 또는 빌드 시 설정)
- `VITE_API_BASE_URL`: 백엔드 API 서버 주소 (기본값: `http://localhost:8080`).
- `VITE_KAKAO_MAP_API_KEY`: 카카오맵 JavaScript API 키.
- `VITE_ODSAY_API_KEY`: ODsay 대중교통 API 키.

### 6.3 Backend (`services/backend-core/src/main/resources/application.yml`)
Spring Boot 애플리케이션이 시작될 때 다음 환경 변수를 참조합니다:
- `SPRING_DATASOURCE_URL`: MySQL JDBC 연결 문자열.
- `SPRING_DATASOURCE_USERNAME`: MySQL 사용자명.
- `SPRING_DATASOURCE_PASSWORD`: MySQL 비밀번호.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth2.
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: GitHub OAuth2.
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`: Naver OAuth2.