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

**지원 사이트**
- 사람인 (saramin.co.kr)
- 잡코리아 (jobkorea.co.kr)
- 원티드 (wanted.co.kr)

**기술 스택**
- 프론트엔드: React, TypeScript, Vite, Tailwind CSS
- 백엔드: Java Spring Boot, PostgreSQL
- AI 엔진: Python, Ollama (llama3.2-vision:11b)
- 확장프로그램: Chrome Extension (Manifest V3)

더 자세한 개발 히스토리는 [HISTORY.md](HISTORY.md)를 참고하세요.

---

## 목차
1. [프로젝트 구조](#1-프로젝트-구조)
2. [상세 파일 색인](#2-상세-파일-색인)
3. [주요 함수 찾기](#3-주요-함수-찾기)

---

## 1. 프로젝트 구조

```
JH0103/
├── .github/workflows/          CI/CD 설정
├── UI/                         웹 애플리케이션
│   └── src/
│       ├── components/        UI 컴포넌트
│       │   ├── job/          공고 관련
│       │   ├── layout/       레이아웃
│       │   ├── map/          지도
│       │   ├── settings/     설정
│       │   └── views/        화면
│       ├── pages/            화면 페이지
│       ├── types/            타입 정의
│       └── utils/            핵심 로직
├── ai-engine/collectorAI/     이미지 분석 서버
│   ├── config.py             모델 설정
│   ├── server.py             메인 서버
│   └── requirements.txt      의존성 관리
├── extension/                 크롬 확장프로그램
│   ├── manifest.json         권한 설정
│   ├── background.js         백그라운드 처리
│   ├── content.js            페이지 스크립트
│   └── popup.js              팝업 UI
├── src/                      백엔드 API
│   └── main/java/com/jh0103/core/
│       ├── config/          설정
│       └── job/
│           ├── domain/      도메인 모델
│           ├── repository/  데이터 접근
│           ├── service/     비즈니스 로직
│           ├── controller/  REST API
│           └── dto/         DTO
├── infra/db/init/             데이터베이스 초기화
└── docker-compose.yml         컨테이너 설정
```

---

## 2. 상세 파일 색인

### 2.1 루트 디렉토리

**설정 파일**
- `.github/workflows/auth-service-ci.yml` - 빌드 및 테스트 자동화
- `.gitignore` - 버전 관리 제외 목록
- `docker-compose.yml` - 컨테이너 실행 설정

**문서**
- `README.md` - 코드 색인 (현재 파일)
- `HISTORY.md` - 기능 개발 히스토리

---

### 2.2 UI (프론트엔드)

**위치**: `UI/src/`

#### 설정 파일
- `package.json` - 의존성 라이브러리 목록
- `vite.config.ts` - 빌드 도구 설정
- `tsconfig.json` - TypeScript 설정
- `tailwind.config.js` - 스타일 설정

#### 진입점
- `index.html` - HTML 진입점
- `main.tsx` - React 진입점
- `App.tsx` - 라우팅 설정

#### 컴포넌트 (`components/`)

**공고** (`job/`)
- `DynamicJobDetail.tsx` - 공고 상세 화면

**레이아웃** (`layout/`)
- `Sidebar.tsx` - 좌측 내비게이션

**지도** (`map/`)
- `KakaoMapContainer.tsx` - 카카오맵 연동
- `TransitRouteOverlay.tsx` - 대중교통 경로 표시

**설정** (`settings/`)
- `HomeLocationSettings.tsx` - 거주지 설정

**화면** (`views/`)
- `AuthView.tsx` - 로그인 화면

#### 페이지 (`pages/`)
- `Dashboard.tsx` - 메인 대시보드

#### 타입 정의 (`types/`)
- `index.ts` - 전역 타입 정의

#### 핵심 로직 (`utils/`)
- `jsonNormalizer.ts` - JSON 처리 중앙 모듈
- `jobParser.ts` - Job 모델 변환
- `odsayApi.ts` - 대중교통 API 연동

---

### 2.3 AI Engine (분석 서버)

**위치**: `ai-engine/collectorAI/`

#### 파일 목록
- `server.py` - 메인 서버
- `config.py` - 모델 및 프롬프트 설정
- `requirements.txt` - Python 의존성
- `Dockerfile` - 컨테이너 빌드

---

### 2.4 Extension (크롬 확장)

**위치**: `extension/`

#### 파일 목록
- `manifest.json` - 권한 및 메타데이터
- `popup.html` - 팝업 UI
- `popup.js` - 팝업 처리
- `background.js` - 백그라운드 서비스
- `content.js` - 페이지 스크립트
- `toast.css` - 알림 스타일

---

### 2.5 Backend (백엔드)

**위치**: `src/main/java/com/jh0103/core/`

#### 설정 (`config/`)
- `SecurityConfig.java` - 보안 설정

#### 공고 도메인 (`job/`)

**도메인 모델** (`job/domain/`)
- `Job.java` - 공고 데이터 모델
- `JobStatus.java` - 공고 상태 enum

**데이터 접근** (`job/repository/`)
- `JobRepository.java` - 데이터베이스 접근

**비즈니스 로직** (`job/service/`)
- `JobService.java` - 공고 관리 로직

**REST API** (`job/controller/`)
- `JobController.java` - REST 엔드포인트

**DTO** (`job/dto/`)
- `UpdateJobStatusRequest.java` - 상태 변경 요청

---

### 2.6 Infra (인프라)

**위치**: `infra/db/init/`

- `init.sql` - 데이터베이스 초기화 스크립트

---

## 3. 주요 함수 찾기

### 3.1 JSON 처리 (jsonNormalizer.ts)

**위치**: `UI/src/utils/jsonNormalizer.ts`

```typescript
// JSON 검증 및 변환
export function normalizeJobJson(rawJson: any): NormalizedJobJson

// 주소 정제
export function cleanAddress(address: string): string

// 파일명 생성
export function generateJobFilename(normalized: NormalizedJobJson): string
```

### 3.2 Job 모델 변환 (jobParser.ts)

**위치**: `UI/src/utils/jobParser.ts`

```typescript
// JSON을 Job 객체로 변환
export const parseJsonToJob = async (rawJson: any): Promise<Job>
```

### 3.3 대중교통 API (odsayApi.ts)

**위치**: `UI/src/utils/odsayApi.ts`

```typescript
// 경로 검색
export async function searchTransitRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<TransitRoute[]>

// 경로 정보 포맷팅
export function formatRouteInfo(route: TransitRoute): string

// 경로 타입 아이콘
export function getRouteTypeIcon(pathType: number): string
```

### 3.4 카카오맵 (KakaoMapContainer.tsx)

**위치**: `UI/src/components/map/KakaoMapContainer.tsx`

```typescript
// 주소를 좌표로 변환
export const getCoordsFromAddress = (address: string): Promise<{lat: number, lng: number}>
```

### 3.5 AI 서버 (server.py)

**위치**: `ai-engine/collectorAI/server.py`

```python
# 파일명 생성
def generate_simple_filename(job_id)

# 이미지 최적화
def optimize_image(base64_str)

# AI 분석
def analyze_with_ollama(image_b64, prompt)

# 백그라운드 작업 처리
def worker()

# API 엔드포인트
@app.route('/analyze', methods=['POST'])
@app.route('/status/<job_id>', methods=['GET'])
```

---

## 4. 데이터 흐름

### 4.1 공고 수집 흐름

```
1. 사용자가 Alt+Shift+S 또는 팝업 버튼 클릭
   ↓
2. background.js → content.js 메시지 전송
   ↓
3. content.js가 불필요 요소 제거 및 영역 계산
   ↓
4. background.js가 CDP로 단일 이미지 캡처
   ↓
5. AI 서버로 이미지 전송 (비동기)
   ↓
6. 서버가 백그라운드에서 분석
   ↓
7. background.js가 상태 폴링
   ↓
8. 완료되면 결과 표시
```

### 4.2 JSON 처리 흐름

```
1. AI 서버가 RAW JSON 생성
   ↓
2. 프론트엔드가 수신
   ↓
3. jsonNormalizer.normalizeJobJson() 호출
   ↓
4. V1 → V2 변환, 주소 정제, 회사명 추출 등
   ↓
5. jobParser.parseJsonToJob() 호출
   ↓
6. Job 모델 객체 생성
   ↓
7. Dashboard에서 렌더링
```

---

## 5. 환경 변수

### 5.1 프론트엔드 (.env)

```
VITE_API_BASE_URL=http://localhost:8080
VITE_KAKAO_MAP_API_KEY=카카오맵_API_키
VITE_ODSAY_API_KEY=ODsay_API_키
```

### 5.2 백엔드

application.properties에 데이터베이스 설정 등이 포함되어 있습니다.

---

## 6. 빠른 참조

### 공고 상태 (JobStatus)
- `PENDING` - 대기 중
- `DRAFT` - 임시 저장
- `APPLIED` - 지원 완료
- `CLOSED` - 마감

### AI 모델 설정
- 모델: `llama3.2-vision:11b`
- 컨텍스트: 6000 토큰
- 온도: 0 (결정적 출력)
- 타임아웃: 120초

### 이미지 설정
- 포맷: JPEG
- 품질: 80
- 최대 너비: 1000px
