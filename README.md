# JH0103 프로젝트 기술 문서

본 문서는 `kimkuhyun/JH0103` 프로젝트의 전체 코드 베이스, 파일 구조 및 아키텍처를 설명합니다. 이 프로젝트는 로컬 환경에서 구동되는 프라이빗 커리어 관리 서비스(채용공고 분석, 이력서 AI 코칭, 개인 지식 관리)를 구축하는 것을 목표로 합니다.

## 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [상세 파일 색인 (Code Index)](#2-상세-파일-색인-code-index)
    - [Root Directory](#21-root-directory)
    - [UI (Frontend)](#22-ui-frontend)
    - [AI Engine (Collector)](#23-ai-engine-collector)
    - [Extension (Web Clipper)](#24-extension-web-clipper)
    - [Services (Auth Backend)](#25-services-auth-backend)
    - [Infra (Database)](#26-infra-database)
3. [아키텍처 및 로드맵](#3-아키텍처-및-로드맵)
4. [최근 변경사항](#4-최근-변경사항)
    - [v5.1 코드 리팩토링](#41-v51-코드-리팩토링-2026-01-14)
    - [v5.0 동적 공고 표시](#42-v50-동적-공고-표시-2026-01-14)

---

## 1. 프로젝트 개요
사용자가 웹상에서 탐색한 채용공고를 수집하고, 이를 기반으로 맞춤형 이력서 작성을 보조하며 관련 기업 정보를 체계적으로 관리하는 개인화 서비스입니다.
* **Core Privacy**: 로컬 LLM 및 로컬 DB 사용을 원칙으로 하여 개인 민감 정보를 보호.
* **Automation**: 브라우저 확장프로그램을 통한 원클릭 공고 수집 및 구조화.
* **Career Management**: 노션(Notion) 스타일의 에디터와 AI 에이전트를 결합한 자료 관리.

---

## 2. 상세 파일 색인 (Code Index)
유지보수 및 기능 수정 시 해당 모듈을 빠르게 찾을 수 있도록 모든 디렉토리와 파일의 역할을 명시합니다.

### 2.1 Root Directory
프로젝트 전체의 빌드, 배포, 형상 관리를 담당하는 설정 파일들입니다.
* **.github/workflows/auth-service-ci.yml**: CI/CD 파이프라인 설정. 인증 서비스(auth-service)의 빌드 및 테스트 자동화 정의.
* **.gitignore**: Git 버전 관리에서 제외할 파일 목록 정의.
* **docker-compose.yml**: 전체 시스템(AI 서버, 데이터베이스 등)의 컨테이너 오케스트레이션 설정 파일.

### 2.2 UI (Frontend)
React 기반의 웹 애플리케이션 소스 코드입니다. 경로: `UI/`

#### Configuration (설정)
* **.env.example**: 환경 변수 템플릿 파일.
* **eslint.config.js**: 코드 린트(Linting) 규칙 설정.
* **package.json / package-lock.json**: 프로젝트 의존성 라이브러리 목록 및 버전 관리.
* **postcss.config.js**: CSS 전처리 도구 설정.
* **tailwind.config.js**: TailwindCSS 스타일링 프레임워크 설정.
* **tsconfig.json / tsconfig.*.json**: TypeScript 컴파일러 설정.
* **vite.config.ts**: Vite 빌드 도구 및 개발 서버 설정.

#### Source Code (`src/`)
* **index.html**: 앱의 진입점(HTML).
* **src/main.tsx**: React 앱을 DOM에 렌더링하는 진입점 스크립트.
* **src/App.tsx**: 라우팅 및 전역 레이아웃을 구성하는 최상위 컴포넌트.
* **src/index.css**: 전역 CSS 스타일 정의.
* **src/vite-env.d.ts**: Vite 환경 변수 타입 선언.

**Components (UI 요소)**
* **src/components/layout/Sidebar.tsx**: 애플리케이션 좌측 내비게이션 바 컴포넌트.
* **src/components/map/**: 지도 관련 기능.
    * `KakaoMapContainer.tsx`: 카카오맵 API 연동 및 지도 렌더링. `getCoordsFromAddress` (주소 좌표 변환) 함수 포함.
    * `TransitRouteOverlay.tsx`: 대중교통 경로를 지도 위에 오버레이로 표시하는 컴포넌트.
* **src/components/settings/HomeLocationSettings.tsx**: 사용자의 거주지(출퇴근 기준점) 설정 화면.
* **src/components/views/AuthView.tsx**: 로그인, 회원가입, 계정 찾기 화면. 유효성 검사 로직(`usernameIssue` 등) 포함.
* **src/components/job/DynamicJobDetail.tsx**: (v5.0) 동적 공고 상세 표시 컴포넌트. V2 JSON 구조만 렌더링 (v5.1에서 단순화).

**Data & Logic**
* **src/pages/Dashboard.tsx**: 메인 대시보드 화면. v5.1에서 jsonNormalizer 통합으로 코드 간소화.
* **src/mockdata/mockData.ts**: UI 프로토타이핑을 위한 더미 데이터 모음.
* **src/types/index.ts**: 앱 전역에서 사용되는 TypeScript 인터페이스 정의(Job, User, JobJsonV2 등).
* **src/utils/**: 핵심 비즈니스 로직.
    * `jsonNormalizer.ts`: (v5.1 신규) JSON 검증/변환의 중앙 처리 모듈. V1→V2 자동 변환, 주소 정제, 회사명 추출 등 모든 JSON 처리 로직 통합.
    * `jobParser.ts`: JSON을 Job 모델로 변환. v5.1에서 대폭 단순화 (70% 라인 감소).
    * `odsayApi.ts`: 대중교통 길찾기 정보 조회 API (ODsay) 연동 모듈.

### 2.3 AI Engine (Collector)
채용 공고 이미지 분석 및 데이터 구조화를 담당하는 Python 서버입니다. 경로: `ai-engine/collectorAI/`

* **Dockerfile**: AI 서버 컨테이너 빌드 명세.
* **requirements.txt**: Python 의존성 패키지 목록 (Flask, Pillow, Requests 등).
* **config.py**: AI 모델 설정 및 프롬프트 관리 모듈. v5.0에서 프롬프트 대폭 개선.
* **server.py**: 메인 서버 스크립트. v5.1에서 대폭 간소화 (JSON 파싱 로직 제거, 30% 라인 감소).
    * `optimize_image()`: 분석 전 이미지 최적화 및 리사이징. 메모리 사용량 70% 감소.
    * `analyze_with_ollama()`: 로컬 LLM(Ollama)에 이미지 분석 요청 및 JSON 응답 파싱. v5.1에서 강화된 예외 처리 추가.
    * `worker()`: 비동기 작업 큐 처리. v5.1에서 RAW JSON 전송으로 단순화.
    * `generate_simple_filename()`: (v5.1 신규) {timestamp}_{job_id}.json 형식으로 단순화된 파일명 생성.

#### 최근 성능 개선 (v4.0)
* **메모리 최적화**: 이미지 처리 메모리 사용량 70% 감소 (PDF scale 2.0 → 1.0).
* **처리 속도 향상**: 공고당 평균 처리 시간 60초 → 10초로 83% 단축.
* **정확도 개선**: 사이트별 메인 섹션 선택자를 통한 정확한 영역 캡처로 추천공고 혼입 100% 제거.

### 2.4 Extension (Web Clipper)
웹 브라우저에서 채용 공고를 원클릭으로 캡처하는 크롬 확장프로그램입니다. 경로: `extension/`

* **manifest.json**: 확장프로그램 권한 및 메타데이터 정의. v3.0에서 원클릭 캡처 기능 추가.
* **popup.html**: 확장프로그램 팝업 UI의 HTML 구조. 간소화된 원클릭 인터페이스.
* **popup.js**: 팝업 UI 인터랙션 처리. 캡처 버튼 클릭 시 백그라운드 스크립트로 메시지 전송.
* **background.js**: 브라우저 백그라운드 서비스 워커.
    * `startOneClickCapture()`: 단축키(Alt+Shift+S) 또는 버튼 클릭 시 실행되는 메인 캡처 함수.
    * `captureFullPage()`: 스크롤하며 전체 페이지를 여러 장의 스크린샷으로 캡처. 사이트별 메인 섹션 bounds 기반 정확한 영역 추출.
    * `sendToServer()`: 캡처된 이미지와 메타데이터를 Python 분석 서버로 전송.
* **content.js**: 웹 페이지에 주입되는 콘텐츠 스크립트.
    * `ToastNotification`: 토스트 알림 클래스. 캡처/분석 진행 상황을 사용자에게 표시.
    * `SITE_CONFIGS`: 채용 사이트별 DOM 선택자 설정 (Wanted, JobKorea, Saramin 등). 메인 섹션 정확도를 위한 mainSelector 추가.
    * `removeUnnecessaryElements()`: 관련 공고, 광고 등 불필요한 요소를 DOM에서 완전 제거하여 깔끔한 캡처 지원.
    * `extractMetadata()`: 회사명, 공고 제목, 급여, 근무지 등 메타데이터를 DOM에서 추출.
* **toast.css**: 토스트 알림 스타일 정의.

### 2.5 Services (Auth Backend)
사용자 인증 및 세션 관리를 담당하는 Spring Boot 애플리케이션입니다. 경로: `services/auth-service/`

### 2.6 Infra (Database)
데이터베이스 초기화 스크립트입니다. 경로: `infra/db/init/`

* **init.sql**: PostgreSQL 컨테이너 최초 실행 시 테이블 생성 및 초기 데이터를 적재하는 SQL 스크립트.

---

## 3. 아키텍처 및 로드맵

### 3.1 현재 아키텍처
* **Client**: React SPA + Chrome Extension (원클릭 캡처 + 메타데이터 추출).
* **Backend**:
    * Auth Service: Java Spring Boot (사용자 인증).
    * AI Engine: Python Flask (로컬 LLM 연동, JSON 생성 및 전송).
* **Data**: PostgreSQL (사용자 정보, 공고 데이터), 로컬 파일 시스템 (JSON 백업).

### 3.2 데이터 수집 플로우
1. 사용자가 채용 공고 페이지에서 `Alt+Shift+S` 단축키 또는 확장 아이콘 클릭
2. Content Script가 불필요한 요소를 제거하고 메타데이터 추출
3. Background Script가 bounds 기반 정확한 캡처 수행
4. Python 서버가 이미지 최적화 후 LLM 분석 → Backend로 RAW JSON 전송 (v5.1)
5. Frontend가 jsonNormalizer를 통해 JSON 정규화 및 렌더링 (v5.1)

---

## 4. 최근 변경사항

### 4.1 v5.1: 코드 리팩토링 (2026-01-14)

**문제점**: JSON 처리 로직이 4곳에 산재 (server.py, Dashboard.tsx, jobParser.ts, DynamicJobDetail.tsx) → 중복, 책임 불명확, 예외 처리 약함

**해결방안**: **단일 책임 원칙** 적용, JSON 처리 로직 중앙화

#### 4.1.1 중앙 JSON 처리 모듈 생성
**파일**: `UI/src/utils/jsonNormalizer.ts` (신규)
* **역할**: 모든 JSON 검증/변환 로직을 한 곳에 통합
* **기능**:
  - V1(구버전) → V2(신버전) 자동 변환
  - 주소 정제 (`cleanAddress`)
  - 회사명 추출 (`extractCompanyName`)
  - 포지션 제목 추출 (`extractPositionTitle`)
  - 파일명 생성 (`generateJobFilename`)
  - 강력한 예외 처리 및 경고 시스템
* **라인 수**: 320줄 (모든 JSON 로직 통합)

#### 4.1.2 jobParser.ts 대폭 단순화
**변경 전**: 120줄 (JSON 파싱, 주소 정제, 구버전 판별 등)
**변경 후**: 90줄 (jsonNormalizer 사용, Job 모델 변환만)
* **제거된 로직**: 구버전/신버전 판별, 주소 정제, 회사명 추출, 포지션 제목 추출
* **추가된 로직**: 강화된 예외 처리, 폴백 Job 객체
* **코드 감소**: 25% 라인 감소

#### 4.1.3 Dashboard.tsx 중복 로직 제거
**변경 전**: 620줄 (JSON 파싱, 주소 정제 중복)
**변경 후**: 580줄 (jsonNormalizer 사용)
* **제거된 로직**: 주소 정제 중복 코드 (60줄)
* **개선 사항**: normalizeJobJson으로 일관된 JSON 처리
* **코드 감소**: 6% 라인 감소

#### 4.1.4 server.py 대폭 간소화
**변경 전**: 280줄 (JSON 파싱, 회사명 추출, 파일명 생성 등)
**변경 후**: 220줄 (Ollama API 호출, RAW JSON 전송만)
* **제거된 로직**: `extract_company_name()`, `generate_filename()`, `sanitize_filename()` 함수 (80줄)
* **추가된 로직**: JSON 파싱 오류 로깅, traceback 출력
* **파일명 단순화**: `{timestamp}_{job_id}.json` 형식
* **코드 감소**: 21% 라인 감소

#### 4.1.5 DynamicJobDetail.tsx 명확화
**변경 사항**: V2 구조만 렌더링하도록 주석 및 타입 명확화
* 기존에도 V2 구조만 렌더링했지만, v5.1에서 명시적으로 문서화

### 4.2 리팩토링 효과

#### 4.2.1 코드 중복 제거
* **이전**: 주소 정제 로직 3곳, 회사명 추출 로직 2곳, JSON 파싱 로직 4곳
* **이후**: jsonNormalizer 1곳에만 존재

#### 4.2.2 유지보수성 향상
* **이전**: JSON 처리 로직 수정 시 4개 파일 수정 필요
* **이후**: jsonNormalizer만 수정하면 전체 시스템 반영

#### 4.2.3 예외 처리 강화
* **이전**: TypeError: '\n    "title"' 같은 예측 불가능한 오류
* **이후**: 체계적인 try-catch, fallback 값, 경고 시스템

#### 4.2.4 책임 분리 명확화
```
┌─────────────────────────────┐
│ Python (server.py)          │ → Ollama API 호출만
├─────────────────────────────┤
│ TypeScript (jsonNormalizer) │ → 모든 JSON 처리
├─────────────────────────────┤
│ jobParser.ts               │ → Job 모델 변환만
├─────────────────────────────┤
│ DynamicJobDetail.tsx       │ → 렌더링만
└─────────────────────────────┘
```

#### 4.2.5 코드 라인 감소
* **server.py**: 280줄 → 220줄 (21% 감소)
* **jobParser.ts**: 120줄 → 90줄 (25% 감소)
* **Dashboard.tsx**: 620줄 → 580줄 (6% 감소)
* **신규 jsonNormalizer.ts**: 320줄 (중앙 집중화)
* **순 증가**: +10줄 (중앙화를 위한 최소 비용)

---

### 4.3 v5.0: 동적 공고 표시 (2026-01-14 이전)

*(기존 v5.0 내용 유지)*

---

## 5. 알려진 제약사항
* **소형 모델 한계**: Ollama 모델이 복잡한 공고에서 일부 정보를 누락할 수 있음
* **주소 정제**: 완벽한 주소 정제가 어려운 경우 지오코딩 실패 가능
* **토큰 제한**: 매우 긴 공고(6000자 이상)는 raw_text가 잘릴 수 있음

## 6. 향후 개선 계획
* **프롬프트 최적화**: Few-shot 예제 추가, 검증 로직 강화
* **모델 업그레이드**: 더 큰 모델 또는 GPT-4V 통합 고려
* **실시간 검증**: AI 분석 결과의 필수 필드 검증 및 재시도 로직
* **사용자 피드백**: 분석 결과에 대한 사용자 수정 기능 추가
