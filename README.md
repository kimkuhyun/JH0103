# JH0103 - CareerOS Collector AI

채용공고 자동 수집 및 AI 분석 시스템

## 📋 프로젝트 개요

CareerOS Collector는 로컬에서 작동하는 AI 기반 취업 준비 시스템입니다.
원클릭 공고 수집, 자동 회사 분석, 맞춤형 이력서 생성으로 체계적인 취업 준비를 지원합니다.

### 주요 기능
- 🚀 원클릭 채용공고 자동 캡처 (Alt+Shift+S)
- 🤖 AI 기반 공고 정보 자동 추출 및 구조화 (Ollama + llama3.2-vision:11b)
- 📊 동적 섹션 기반 유연한 공고 표시
- 🗺️ 카카오맵 연동 회사 위치 표시
- 🚇 ODsay API 연동 대중교통 경로 안내
- 📌 공고 상태 관리 (PENDING, DRAFT, APPLIED, CLOSED)

### 지원 채용 사이트
- 사람인 (saramin.co.kr)
- 잡코리아 (jobkorea.co.kr)
- 원티드 (wanted.co.kr)

### 기술 스택
- **프론트엔드**: React 18, TypeScript, Vite, Tailwind CSS
- **백엔드**: Java Spring Boot 3, PostgreSQL
- **AI 엔진**: Python 3.11, Flask, Ollama (llama3.2-vision:11b)
- **확장 프로그램**: Chrome Extension (Manifest V3)
- **인프라**: Docker, Docker Compose

---

## 📁 프로젝트 구조

```
JH0103/
├── .github/workflows/          # CI/CD 설정
│   └── auth-service-ci.yml     # GitHub Actions 빌드/테스트 워크플로우
│
├── UI/                         # 프론트엔드 React 애플리케이션
│   ├── public/                 # 정적 파일
│   ├── src/
│   │   ├── components/
│   │   │   ├── job/           # 공고 관련 컴포넌트
│   │   │   │   └── DynamicJobDetail.tsx      # 공고 상세 화면
│   │   │   ├── layout/        # 레이아웃 컴포넌트
│   │   │   │   └── Sidebar.tsx               # 좌측 네비게이션
│   │   │   ├── map/           # 지도 관련 컴포넌트
│   │   │   │   ├── KakaoMapContainer.tsx     # 카카오맵 통합
│   │   │   │   └── TransitRouteOverlay.tsx   # 대중교통 경로 오버레이
│   │   │   ├── settings/      # 설정 컴포넌트
│   │   │   │   └── HomeLocationSettings.tsx  # 거주지 설정
│   │   │   └── views/         # 화면 컴포넌트
│   │   │       └── AuthView.tsx              # 인증 화면
│   │   ├── pages/             # 페이지 컴포넌트
│   │   │   ├── Dashboard.tsx                 # 메인 대시보드
│   │   │   └── AuthCallback.tsx              # OAuth 콜백
│   │   ├── types/             # TypeScript 타입 정의
│   │   │   └── index.ts                      # 전역 타입 (Job, Section 등)
│   │   ├── utils/             # 유틸리티 함수
│   │   │   ├── jsonNormalizer.ts             # JSON 정규화 (V1→V2 변환)
│   │   │   ├── jobParser.ts                  # Job 모델 파싱
│   │   │   └── odsayApi.ts                   # ODsay API 연동
│   │   ├── App.tsx            # 라우팅 설정
│   │   ├── main.tsx           # React 진입점
│   │   └── index.css          # 전역 스타일
│   ├── .env.example           # 환경 변수 템플릿
│   ├── package.json           # 의존성 관리
│   ├── vite.config.ts         # Vite 설정
│   ├── tsconfig.json          # TypeScript 설정
│   ├── tailwind.config.js     # Tailwind CSS 설정
│   └── README.md              # UI 설정 가이드
│
├── ai-engine/collectorAI/     # AI 이미지 분석 서버
│   ├── server.py              # Flask 메인 서버
│   ├── config.py              # 모델 및 프롬프트 설정
│   ├── requirements.txt       # Python 의존성
│   └── Dockerfile             # 컨테이너 빌드
│
├── extension/                 # Chrome 확장 프로그램
│   ├── manifest.json          # 확장 메타데이터 및 권한
│   ├── background.js          # 백그라운드 서비스 워커
│   ├── content.js             # 컨텐츠 스크립트 (DOM 제어)
│   ├── popup.html             # 팝업 UI
│   ├── popup.js               # 팝업 로직
│   └── toast.css              # 토스트 알림 스타일
│
├── services/backend-core/     # Spring Boot 백엔드 (Gradle)
│   ├── src/
│   │   └── main/
│   │       ├── java/
│   │       │   └── com/
│   │       │       └── ...    # Spring Boot 소스 (services 전용)
│   │       └── resources/
│   │           └── application.properties
│   ├── build.gradle           # Gradle 빌드 설정
│   ├── Dockerfile             # 백엔드 컨테이너
│   └── gradlew                # Gradle 래퍼
│
├── src/                       # 루트 백엔드 소스 (Maven 기반)
│   └── main/
│       ├── java/com/
│       │   ├── jh0103/core/   # 메인 비즈니스 로직
│       │   │   ├── config/    # Spring 설정
│       │   │   │   └── ...
│       │   │   └── job/       # Job 도메인
│       │   │       ├── controller/
│       │   │       │   └── JobController.java       # REST API
│       │   │       ├── domain/
│       │   │       │   ├── Job.java                 # Job 엔티티
│       │   │       │   └── JobStatus.java           # 상태 Enum
│       │   │       ├── repository/
│       │   │       │   └── JobRepository.java       # JPA Repository
│       │   │       ├── service/
│       │   │       │   └── JobService.java          # 비즈니스 로직
│       │   │       └── dto/
│       │   │           └── UpdateJobStatusRequest.java
│       │   └── jobhub/        # 추가 모듈 (공통 설정)
│       │       └── config/
│       │           └── SecurityConfig.java          # 보안 설정
│       └── resources/
│           └── application.properties
│
├── infra/db/init/             # 데이터베이스 초기화
│   └── init.sql               # PostgreSQL 스키마
│
├── docker-compose.yml         # 컨테이너 오케스트레이션
├── .gitignore                 # Git 제외 목록
├── HISTORY.md                 # 개발 히스토리
└── README.md                  # 이 파일
```

---

## 📚 상세 파일 가이드

### 1. UI (프론트엔드)

#### 📦 설정 파일
| 파일 | 역할 |
|------|------|
| `package.json` | npm 의존성 관리 (react-router-dom, axios 등) |
| `vite.config.ts` | 빌드 도구 설정 (프록시, 플러그인) |
| `tsconfig.json` | TypeScript 컴파일러 옵션 |
| `tailwind.config.js` | Tailwind CSS 커스터마이징 |
| `.env.example` | 환경 변수 템플릿 (API 키 등) |

#### 🎯 핵심 진입점
| 파일 | 주요 기능 |
|------|----------|
| `index.html` | HTML 진입점 |
| `main.tsx` | React 렌더링 시작점 |
| `App.tsx` | 라우팅 설정 (`/`, `/dashboard`, `/auth/callback`) |

#### 🧩 컴포넌트 (`src/components/`)

##### `job/` - 공고 관련
- **`DynamicJobDetail.tsx`**
  - 공고 상세 정보 표시
  - 동적 섹션 렌더링 (기본 정보, 우대 사항, 복리후생 등)
  - 상태 변경 (PENDING → DRAFT → APPLIED → CLOSED)

##### `layout/` - 레이아웃
- **`Sidebar.tsx`**
  - 좌측 네비게이션 메뉴
  - 공고 목록, 설정, 프로필 링크

##### `map/` - 지도
- **`KakaoMapContainer.tsx`**
  - 카카오맵 API 통합
  - 주소 → 좌표 변환 (`getCoordsFromAddress()`)
  - 회사 위치 마커 표시
  
- **`TransitRouteOverlay.tsx`**
  - 대중교통 경로 정보 오버레이
  - ODsay API 결과 시각화

##### `settings/` - 설정
- **`HomeLocationSettings.tsx`**
  - 거주지 주소 설정
  - 좌표 자동 변환 및 저장

##### `views/` - 화면
- **`AuthView.tsx`**
  - Google OAuth 로그인 화면
  - 토큰 처리 및 리다이렉트

#### 📄 페이지 (`src/pages/`)
- **`Dashboard.tsx`**
  - 메인 대시보드
  - 공고 목록 표시
  - 공고 추가/수정/삭제
  - 지도 통합
  
- **`AuthCallback.tsx`**
  - OAuth 콜백 처리
  - 인증 코드 → 토큰 교환

#### 🔧 유틸리티 (`src/utils/`)
- **`jsonNormalizer.ts`**
  - JSON 스키마 정규화 (V1 → V2)
  - 주소 정제 (`cleanAddress()`)
  - 파일명 생성 (`generateJobFilename()`)
  
- **`jobParser.ts`**
  - RAW JSON → Job 객체 변환 (`parseJsonToJob()`)
  - 타입 안전성 보장
  
- **`odsayApi.ts`**
  - ODsay API 연동 (`searchTransitRoute()`)
  - 경로 정보 포맷팅 (`formatRouteInfo()`)
  - 경로 타입 아이콘 (`getRouteTypeIcon()`)

#### 🎨 타입 정의 (`src/types/`)
- **`index.ts`**
  - `Job`, `JobStatus`, `Section` 타입
  - `TransitRoute`, `NormalizedJobJson` 등

---

### 2. AI Engine (Python)

**위치**: `ai-engine/collectorAI/`

| 파일 | 주요 함수/기능 |
|------|---------------|
| **`server.py`** | Flask 서버 메인 |
| → `generate_simple_filename()` | 타임스탬프 기반 파일명 생성 |
| → `optimize_image()` | 이미지 리사이징 (1000px 이하) |
| → `analyze_with_ollama()` | Ollama API 호출 (llama3.2-vision) |
| → `worker()` | 백그라운드 작업 처리 워커 |
| → `/analyze` (POST) | 분석 요청 API (큐에 작업 등록) |
| → `/status/<job_id>` (GET) | 상태 조회 API |
| **`config.py`** | 모델 및 프롬프트 설정 |
| → `MODEL_CONFIG` | 모델명, 컨텍스트 크기, 온도 등 |
| → `IMAGE_CONFIG` | 이미지 최적화 설정 |
| → `get_analysis_prompt()` | 동적 프롬프트 생성 |
| **`requirements.txt`** | Flask, Pillow, requests |
| **`Dockerfile`** | Python 3.11 기반 컨테이너 |

**데이터 흐름**:
```
1. /analyze 요청 → 큐에 등록 → job_id 반환
2. 워커 스레드: 이미지 최적화 → Ollama 분석 → 백엔드 전송
3. /status 폴링으로 결과 확인
```

---

### 3. Extension (Chrome 확장)

**위치**: `extension/`

| 파일 | 주요 기능 |
|------|----------|
| **`manifest.json`** | 확장 메타데이터, 권한 (tabs, scripting, debugger) |
| **`background.js`** | 백그라운드 서비스 워커 |
| → 키보드 단축키 (Alt+Shift+S) 처리 |
| → CDP (Chrome DevTools Protocol)로 스크린샷 캡처 |
| → AI 서버 통신 (Base64 이미지 전송) |
| → 상태 폴링 및 결과 처리 |
| **`content.js`** | 컨텐츠 스크립트 |
| → 불필요 요소 제거 (추천 공고, 헤더 등) |
| → 캡처 영역 계산 (getBounds) |
| → 토스트 알림 표시 |
| **`popup.html`** | 팝업 UI (제목, 버튼) |
| **`popup.js`** | 팝업 버튼 클릭 핸들러 |
| **`toast.css`** | 토스트 알림 스타일 |

**캡처 프로세스**:
```
1. 사용자 트리거 (Alt+Shift+S or 팝업 버튼)
2. background.js → content.js 메시지 전송
3. content.js: 불필요 요소 제거 + 영역 계산
4. background.js: CDP로 단일 이미지 캡처
5. AI 서버로 전송 (비동기)
6. 폴링으로 결과 대기
7. 완료 시 토스트 표시
```

---

### 4. Backend (Spring Boot)

#### 🔹 루트 소스 (`src/main/java/com/`)

**`jh0103.core.job`** - Job 도메인 로직
| 패키지/파일 | 역할 |
|------------|------|
| **`controller/`** | REST API 엔드포인트 |
| → `JobController.java` | `/api/v1/jobs` CRUD |
| **`domain/`** | JPA 엔티티 |
| → `Job.java` | Job 엔티티 (@Entity) |
| → `JobStatus.java` | PENDING, DRAFT, APPLIED, CLOSED |
| **`repository/`** | 데이터 접근 |
| → `JobRepository.java` | JpaRepository 상속 |
| **`service/`** | 비즈니스 로직 |
| → `JobService.java` | 공고 CRUD, 상태 변경 |
| **`dto/`** | 데이터 전송 객체 |
| → `UpdateJobStatusRequest.java` | 상태 변경 DTO |

**`jh0103.core.config`** - Spring 설정
| 파일 | 역할 |
|------|------|
| (추가 설정 파일) | CORS, JPA 등 |

**`jobhub.config`** - 공통 설정
| 파일 | 역할 |
|------|------|
| `SecurityConfig.java` | Spring Security 설정 |

#### 🔹 서비스 백엔드 (`services/backend-core/`)

- Gradle 기반 Spring Boot 프로젝트
- `build.gradle`: 의존성 관리
- `Dockerfile`: 백엔드 컨테이너화
- 독립적인 서비스 모듈 (분리된 빌드)

---

### 5. Infrastructure

#### 📊 데이터베이스 (`infra/db/init/`)
- **`init.sql`**
  - PostgreSQL 초기 스키마
  - `jobs` 테이블 생성
  - 인덱스 설정

#### 🐳 Docker 설정
- **`docker-compose.yml`**
  - `db`: PostgreSQL 13
  - `backend-core`: Spring Boot
  - `ai-server`: Python Flask
  - `ui`: React (개발 서버)
  - 네트워크 및 볼륨 설정

---

## 🔄 데이터 흐름

### 공고 수집 플로우
```
┌─────────────┐  Alt+Shift+S   ┌──────────────┐
│   사용자     │ ───────────▶   │  Extension   │
│   (웹사이트) │                │  background  │
└─────────────┘                └──────────────┘
                                      │
                                      ▼
                               [content.js]
                               - 불필요 요소 제거
                               - 캡처 영역 계산
                                      │
                                      ▼
                               [CDP 스크린샷]
                               Base64 이미지
                                      │
                                      ▼
┌──────────────┐                ┌──────────────┐
│  AI Server   │ ◀──────────────│  Extension   │
│  (Python)    │   POST /analyze│  background  │
└──────────────┘                └──────────────┘
      │
      ├─ 1. 이미지 최적화 (1000px)
      ├─ 2. Ollama 분석 (llama3.2-vision)
      └─ 3. Backend로 전송
            │
            ▼
┌──────────────┐  POST /api/v1/jobs  ┌──────────────┐
│  Backend     │ ────────────────▶   │  PostgreSQL  │
│  (Spring)    │                      └──────────────┘
└──────────────┘
      │
      ▼
  [프론트엔드 폴링]
  GET /api/v1/jobs
```

### JSON 처리 플로우
```
AI 응답 (RAW JSON)
      │
      ▼
jsonNormalizer.normalizeJobJson()
  - V1 → V2 스키마 변환
  - 주소 정제
  - 회사명 추출
      │
      ▼
jobParser.parseJsonToJob()
  - Job 모델 객체 생성
  - 타입 안전성 보장
      │
      ▼
Dashboard 렌더링
```

---

## 🚀 실행 방법

### 1. 환경 변수 설정
```bash
# UI/.env
VITE_API_BASE_URL=http://localhost:8080
VITE_KAKAO_MAP_API_KEY=your_kakao_key
VITE_ODSAY_API_KEY=your_odsay_key

# services/backend-core/src/main/resources/application.properties
spring.datasource.url=jdbc:postgresql://localhost:5432/jobhub
spring.datasource.username=postgres
spring.datasource.password=your_password
```

### 2. Docker 실행
```bash
docker-compose up -d
```

### 3. Extension 설치
1. Chrome 확장 프로그램 페이지 (`chrome://extensions/`)
2. "개발자 모드" 활성화
3. "압축 해제된 확장 프로그램 로드" → `extension/` 폴더 선택

### 4. Ollama 모델 설치
```bash
ollama pull llama3.2-vision:11b
```

---

## 📖 주요 함수 참조

### Frontend

#### JSON 처리 (`jsonNormalizer.ts`)
```typescript
// JSON 검증 및 V1→V2 변환
normalizeJobJson(rawJson: any): NormalizedJobJson

// 주소 정제 (특수문자 제거, 괄호 정리)
cleanAddress(address: string): string

// 파일명 생성 (회사명_직무_날짜.json)
generateJobFilename(normalized: NormalizedJobJson): string
```

#### Job 파싱 (`jobParser.ts`)
```typescript
// JSON → Job 객체 변환
parseJsonToJob(rawJson: any): Promise<Job>
```

#### 대중교통 API (`odsayApi.ts`)
```typescript
// 경로 검색
searchTransitRoute(
  startLat: number, startLng: number,
  endLat: number, endLng: number
): Promise<TransitRoute[]>

// 경로 정보 포맷팅 (소요시간, 환승횟수)
formatRouteInfo(route: TransitRoute): string

// 경로 타입 아이콘 (🚇 🚌 🚶)
getRouteTypeIcon(pathType: number): string
```

#### 카카오맵 (`KakaoMapContainer.tsx`)
```typescript
// 주소 → 좌표 변환
getCoordsFromAddress(address: string): Promise<{lat: number, lng: number}>
```

### Backend (Java)

#### JobService.java
```java
// 공고 생성
Job createJob(Job job)

// 공고 조회
Optional<Job> getJobById(Long id)

// 전체 공고 목록
List<Job> getAllJobs()

// 공고 상태 변경
Job updateJobStatus(Long id, JobStatus status)

// 공고 삭제
void deleteJob(Long id)
```

### AI Server (Python)

#### server.py
```python
# 파일명 생성 (타임스탬프_job_id.json)
generate_simple_filename(job_id: str) -> tuple[str, str]

# 이미지 최적화 (1000px 이하)
optimize_image(base64_str: str) -> str

# Ollama AI 분석
analyze_with_ollama(image_b64: str, prompt: str) -> dict

# 백그라운드 작업 처리
worker() -> None
```

**API 엔드포인트**:
- `POST /analyze`: 분석 요청 → `job_id` 반환
- `GET /status/<job_id>`: 상태 조회 → `{status, data}`

---

## 🔧 설정 정보

### AI 모델 설정
```python
MODEL_CONFIG = {
    "MODEL_NAME": "llama3.2-vision:11b",
    "NUM_CTX": 6000,         # 컨텍스트 윈도우
    "NUM_BATCH": 512,        # 배치 크기
    "TEMPERATURE": 0,        # 결정적 출력
    "TIMEOUT": 120           # 타임아웃 (초)
}
```

### 이미지 설정
```python
IMAGE_CONFIG = {
    "FORMAT": "JPEG",
    "QUALITY": 80,
    "MAX_WIDTH": 1000        # 최대 가로 해상도
}
```

### 공고 상태 (JobStatus)
- `PENDING`: 대기 중
- `DRAFT`: 임시 저장
- `APPLIED`: 지원 완료
- `CLOSED`: 마감

---

## 📌 추가 문서

- [HISTORY.md](HISTORY.md): 개발 히스토리 및 주요 기능 개발 과정
- [UI/README.md](UI/README.md): 프론트엔드 상세 가이드
- [UI/README_SETUP.md](UI/README_SETUP.md): 프론트엔드 초기 설정

---

## 🛠️ 트러블슈팅

### 1. Ollama 메모리 오류
- **증상**: "out of memory" 오류
- **해결**: 모델을 `qwen2.5vl` → `llama3.2-vision:11b`로 변경
- **설정**: `config.py`의 `MODEL_CONFIG` 확인

### 2. 캡처 영역 오류
- **증상**: 불필요한 추천 공고 포함
- **해결**: `content.js`에서 `.jco_content` 클래스 제거 로직 확인

### 3. CORS 오류
- **증상**: 프론트엔드 → 백엔드 요청 실패
- **해결**: `SecurityConfig.java`에서 CORS 설정 확인

### 4. 지도 표시 안됨
- **증상**: 카카오맵 로딩 실패
- **해결**: `.env`에 `VITE_KAKAO_MAP_API_KEY` 확인

---

## 📞 문의

이슈 및 문의사항은 GitHub Issues를 통해 남겨주세요.
