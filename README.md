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
│   └── src/
│       ├── components/         React 컴포넌트
│       ├── pages/              라우팅 페이지
│       └── utils/              핵심 로직
├── services/
│   └── backend-core/           백엔드 API (Spring Boot)
│       └── src/main/java/com/jh0103/core/
│           ├── common/         공통 유틸
│           ├── config/         애플리케이션 설정
│           ├── job/            공고 관리 도메인
│           └── user/           사용자 및 인증 도메인
├── ai-engine/collectorAI/      이미지 분석 AI 서버 (Python)
├── extension/                  크롬 확장프로그램
├── infra/db/init/              DB 초기화 스크립트
└── docker-compose.yml          서비스 실행을 위한 Docker 설정
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

4. **서비스 접속**
   - **UI**: `http://localhost:5173`
   - **Backend API**: `http://localhost:8080`
   - **AI Collector**: `http://localhost:5000`

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
- `src/main.tsx`: React 애플리케이션 진입점.
- `src/App.tsx`: 메인 컴포넌트 및 라우팅 설정.
- `src/components/job/DynamicJobDetail.tsx`: 공고 상세 정보 동적 렌더링.
- `src/components/map/KakaoMapContainer.tsx`: 카카오맵 연동 컴포넌트.
- `src/pages/Dashboard.tsx`: 메인 대시보드 페이지.
- `src/utils/jsonNormalizer.ts`: AI가 추출한 JSON 데이터를 정규화하는 로직.
- `src/utils/odsayApi.ts`: 대중교통 길찾기 API 연동 로직.

### 3.2 Backend - `services/backend-core/`
- `build.gradle`: Gradle 빌드 설정 및 의존성 관리.
- `src/main/java/com/jh0103/core/BackendCoreApplication.java`: Spring Boot 애플리케이션 진입점.

#### 공고 도메인 (`job/`)
- `JobController.java`: 공고 관련 CRUD REST API 엔드포인트.
- `JobService.java`: 공고 비즈니스 로직.
- `Job.java`: 공고 데이터 JPA 엔티티.
- `JobRepository.java`: 공고 데이터 JPA Repository.

#### 사용자/인증 도메인 (`user/`)
- `UserController.java`: 사용자 정보 관련 REST API.
- `CustomOAuth2UserService.java`: OAuth2 로그인 성공 후 사용자 정보를 처리하는 서비스.
- `SecurityConfig.java`: Spring Security 설정 (OAuth2, CORS 등).
- `User.java`: 사용자 데이터 JPA 엔티티.
- `UserRepository.java`: 사용자 데이터 JPA Repository.
- `OAuthAttributes.java`: 소셜 로그인 플랫폼별 사용자 정보를 DTO로 변환.

### 3.3 AI Engine - `ai-engine/collectorAI/`
- `server.py`: 이미지 분석 요청을 받는 Flask 기반 웹 서버.
- `config.py`: Ollama 모델 및 프롬프트 설정.
- `requirements.txt`: Python 의존성 목록.
- `Dockerfile`: AI 서버의 Docker 이미지 빌드 설정.

### 3.4 Extension - `extension/`
- `manifest.json`: 확장 프로그램의 권한, 이름, 아이콘 등 메타데이터.
- `background.js`: 웹 페이지와 독립적으로 실행되는 백그라운드 로직 (캡처, API 통신).
- `content.js`: 현재 웹 페이지의 DOM에 접근하여 상호작용하는 스크립트.
- `popup.js`: 확장 프로그램 아이콘 클릭 시 나타나는 팝업 UI 로직.

---

## 4. 주요 함수 및 API

### 4.1 Frontend (`UI/src/utils/`)
- `jsonNormalizer.ts`: `normalizeJobJson(rawJson)` - AI가 생성한 불규칙한 JSON을 정제.
- `jobParser.ts`: `parseJsonToJob(rawJson)` - 정제된 JSON을 프론트엔드 `Job` 모델로 변환.
- `odsayApi.ts`: `searchTransitRoute(...)` - 출발지와 목적지 좌표로 대중교통 경로 검색.
- `axios` 인스턴스: 백엔드 API (`/api/jobs`, `/api/user/me`)와 통신.

### 4.2 Backend (`services/backend-core/`)
- `JobController`:
  - `GET /api/jobs`: 모든 공고 목록 조회.
  - `GET /api/jobs/{id}`: 특정 공고 상세 조회.
  - `POST /api/jobs`: 새 공고 저장 (AI 분석 결과).
  - `PATCH /api/jobs/{id}/status`: 공고 상태 변경.
- `UserController`:
  - `GET /api/user/me`: 현재 로그인된 사용자 정보 조회.
- `CustomOAuth2UserService`:
  - `loadUser(...)`: 소셜 로그인 성공 시 호출되어 사용자 정보를 DB에 저장 또는 업데이트.

### 4.3 AI Server (`ai-engine/collectorAI/`)
- `server.py`:
  - `POST /analyze`: Base64로 인코딩된 스크린샷 이미지를 받아 AI 분석을 요청하고 작업 ID 반환.
  - `GET /status/{job_id}`: AI 분석 작업의 상태 및 결과를 조회.

---

## 5. 데이터 흐름

### 5.1 공고 수집 및 분석
1.  **사용자**: `Alt+Shift+S` 단축키 입력.
2.  **Extension (`background.js`)**: 단축키 감지 후 `content.js`에 메시지 전송.
3.  **Extension (`content.js`)**: 현재 페이지 DOM에서 불필요한 UI 제거 후 캡처 준비 완료 메시지 전송.
4.  **Extension (`background.js`)**: Chrome DevTools Protocol(CDP)을 사용해 보이는 영역 스크린샷 캡처.
5.  **Extension → AI Server**: 캡처한 이미지를 `POST /analyze` API로 전송.
6.  **AI Server**: 비동기적으로 이미지 분석 후 결과를 내부 저장소에 저장.
7.  **Extension → UI**: 분석이 완료되면 `chrome.runtime.sendMessage`를 통해 UI에 알림.
8.  **UI (`Dashboard.tsx`)**: 새 공고가 감지되면 백엔드에 `GET /api/jobs`를 요청하여 목록을 갱신.

---

## 6. 환경 변수

### 6.1 Docker Compose (`.env`)
프로젝트 루트의 `.env` 파일에 의해 설정됩니다. (상세 내용은 [시작하기](#2-시작하기) 섹션 참고)
- `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GH_CLIENT_ID`, `GH_CLIENT_SECRET`
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`

### 6.2 Frontend (`UI/.env.example`)
프론트엔드 개발 시 필요한 환경 변수입니다. `docker-compose` 사용 시에는 내부적으로 처리될 수 있습니다.
- `VITE_API_BASE_URL`: 백엔드 API 서버 주소.
- `VITE_KAKAO_MAP_API_KEY`: 카카오맵 JavaScript API 키.
- `VITE_ODSAY_API_KEY`: ODsay 대중교통 API 키.