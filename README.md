# JH0103 프로젝트 통합 문서 및 아키텍처 가이드

이 문서는 `kimkuhyun/JH0103` 프로젝트의 전체 구조, 코드 상세 명세, 그리고 향후 로드맵(이력서 AI, 개인 지식 관리 시스템)을 위한 아키텍처 개선 제안을 포함합니다.

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [디렉토리별 상세 명세 (Code Inventory)](#2-디렉토리별-상세-명세-code-inventory)
    - [UI (Frontend)](#21-ui-frontend)
    - [AI Engine (Collector)](#22-ai-engine-collector)
    - [Extension (Chrome)](#23-extension-chrome)
    - [Services (Backend)](#24-services-backend)
3. [채용공고 수집 고도화 방안 (One-Click Solution)](#3-채용공고-수집-고도화-방안-one-click-solution)
4. [아키텍처 리뷰 및 로드맵](#4-아키텍처-리뷰-및-로드맵)

---

## 1. 프로젝트 개요

본 프로젝트는 개인 맞춤형 커리어 관리 서비스를 목표로 합니다. 로컬 환경에서 프라이빗하게 동작하며, 다음과 같은 핵심 기능을 지향합니다.

* **지능형 채용공고 분석**: 웹상의 채용공고를 자동으로 수집 및 구조화(JSON)하여 데이터베이스화.
* **AI 이력서/자소서 코칭**: 사용자 경험(Experience)을 기반으로 해당 공고에 최적화된 자소서 작성 보조 및 톤앤매너 튜닝.
* **개인 지식 관리(PKM)**: 노션(Notion)과 유사한 블록 기반 에디터를 통해 커리어 관련 자료 및 회사 조사 내용을 체계적으로 관리.
* **회사 분석 에이전트**: MCP(Model Context Protocol)를 활용하여 지원 회사의 최신 뉴스, 인재상 등을 심층 조사.

---

## 2. 디렉토리별 상세 명세 (Code Inventory)

각 모듈의 핵심 파일과 내부 함수, 변수를 정리했습니다. 개발 시 빠른 탐색을 위해 참고하십시오.

### 2.1 UI (Frontend)
**경로**: `UI/`
**기술 스택**: React, Vite, TypeScript, TailwindCSS

* **src/utils/jobParser.ts**
    * **목적**: 업로드된 JSON 데이터를 애플리케이션 내부 모델인 `Job` 객체로 변환 및 지오코딩 처리.
    * **핵심 인터페이스**:
        * `UploadedJson`: 업로드된 파일의 원본 구조 정의 (meta, timeline, job_summary, analysis 등 포함).
    * **핵심 함수**:
        * `parseJsonToJob(json)`: 비동기 함수. JSON 데이터에서 회사명, 직무, 마감일, 필수 역량을 추출하고 `getCoordsFromAddress`를 호출하여 주소를 위경도 좌표로 변환함. 누락된 필드는 기본값으로 처리.

* **src/components/views/AuthView.tsx**
    * **목적**: 사용자 로그인 및 회원가입, 계정 복구 UI 제공.
    * **핵심 변수**:
        * `INPUT_BASE_CLASS`, `INPUT_DEFAULT_CLASS`: TailwindCSS 스타일 상수 관리.
    * **핵심 컴포넌트**:
        * `AuthView`: 메인 컴포넌트. `mode` 상태(login/register)에 따라 화면 전환.
    * **주요 로직**:
        * `usernameIssue`, `displayNameIssue`: `useMemo`를 활용한 실시간 유효성 검사.
        * `handleSocialLogin`: 소셜 로그인(Google, Naver) 트리거.

* **src/components/map/KakaoMapContainer.tsx** (참조됨)
    * **목적**: 카카오맵 API 연동 및 주소-좌표 변환.
    * **핵심 함수**:
        * `getCoordsFromAddress(address)`: 주소 문자열을 받아 위도(lat), 경도(lng)를 반환.

### 2.2 AI Engine (Collector)
**경로**: `ai-engine/collectorAI/`
**기술 스택**: Python, Flask, Pillow, Ollama (Local LLM)

* **server.py**
    * **목적**: 이미지 기반의 비정형 채용공고 데이터를 받아 LLM을 통해 구조화된 JSON으로 변환 및 저장.
    * **핵심 변수**:
        * `SAVE_DIR`: 결과 파일 저장 경로 (`/app/data`).
        * `OLLAMA_URL`: 로컬 LLM API 엔드포인트.
    * **핵심 함수**:
        * `resize_image(base64_str, max_size)`: 입력 이미지를 RGB로 변환하고 크기를 최적화하여 토큰 비용 절감 및 처리 속도 향상.
        * `analyze()`: `/analyze` (POST) 엔드포인트 핸들러. 이미지를 리사이징한 후 프롬프트와 함께 Ollama(`qwen2.5vl`)에 전송. 응답 텍스트에서 JSON을 추출하여 파일로 저장.

### 2.3 Extension (Chrome)
**경로**: `extension/`
**기술 스택**: JavaScript (Chrome Extension API)

* **background.js**
    * **목적**: 브라우저 백그라운드 작업 처리 (단축키, 캡처 상태 관리, 서버 통신).
    * **핵심 상수**:
        * `STORAGE_KEYS`: 로컬 스토리지 키 관리 (`isCapturing`, `capturedImages`, `analysisJobs`).
    * **핵심 함수**:
        * `toggleCapture()`: 캡처 모드 활성화/비활성화.
        * `takeSnapshot()`: 현재 탭의 보이는 영역을 캡처하여 스토리지에 저장.
        * `finishAnalysis()`: 캡처된 이미지들을 모아 작업 대기열(`JOBS`)에 추가.
        * `processNextJob()`: 대기 중인 작업을 Python 서버(`/analyze`)로 전송하고 결과를 모니터링. 성공 시 자동 삭제 처리.

* **popup.js**
    * **목적**: 확장프로그램 팝업 UI 동작 제어.
    * **핵심 함수**:
        * `restoreState()`: 스토리지 상태를 읽어 UI 복원.
        * `renderJobs(jobs)`: 작업 목록을 상태별(대기, 분석중, 완료, 실패)로 렌더링.
        * `deleteJob(jobId)`: 개별 작업 삭제 기능.
    * **이벤트 핸들러**: 시작, 캡처, 종료, 리셋 버튼에 대한 이벤트 연결.

### 2.4 Services (Backend)
**경로**: `services/auth-service/`
**기술 스택**: Java, Spring Boot, Spring Security, OAuth2

* **controller/UserController.java**
    * **목적**: 인증된 사용자 세션 정보 제공.
    * **API**: `GET /api/v1/user` - 현재 세션의 유저 정보(`SessionUser`) 반환.

* **service/CustomOAuth2UserService.java**
    * **목적**: OAuth2 로그인 후처리 로직 (사용자 정보 로드 및 DB 동기화).
    * **핵심 함수**:
        * `loadUser(userRequest)`: Google, Naver 등 공급자로부터 사용자 속성 획득.
        * `saveOrUpdate(attributes)`: 이메일 기준으로 기존 회원은 업데이트, 신규 회원은 저장.

---

## 3. 채용공고 수집 고도화 방안 (One-Click Solution)

### 현황 및 문제점
현재 방식은 사용자가 수동으로 스크린샷을 여러 장 찍어야 하여 사용성이 떨어집니다. 외부 API(Tavily 등)나 Headless Browser(Playwright)는 채용 사이트의 봇 차단 정책으로 인해 사용이 불가능합니다.

### 제안 솔루션: 하이브리드 추출 (DOM Parsing + Viewport Shot)
사용자가 이미 보고 있는 브라우저 화면(DOM)에 직접 접근하여 데이터를 추출함으로써 봇 차단을 우회하고 원클릭 경험을 제공합니다.

### 구현 단계
1.  **권한 확장**: `manifest.json`에 `scripting` 권한 추가.
2.  **Content Script 주입**: 사용자가 버튼 클릭 시 `Readability.js`(Mozilla 오픈소스)를 현재 페이지에 주입하여 본문 텍스트와 HTML 구조를 추출합니다. 이는 이미지 없이도 LLM이 텍스트 정보를 완벽히 이해하게 돕습니다.
3.  **보조 스크린샷**: 레이아웃 파악을 위해 `captureVisibleTab`으로 현재 보이는 화면 1장만 자동으로 캡처합니다.
4.  **데이터 파이프라인 변경**:
    * 기존: 다수의 이미지 배열 전송
    * 변경: `{ html_content: string, screenshot: string }` 전송
5.  **프롬프트 최적화**: 텍스트(HTML)를 주 데이터로 분석하고, 이미지는 보조 자료로만 활용하도록 프롬프트를 수정하여 정확도와 속도를 동시에 개선합니다.

---

## 4. 아키텍처 리뷰 및 로드맵

시니어 개발자 관점에서 제안하는 안정적이고 확장 가능한 아키텍처입니다.

### 4.1 현행 구조 진단
* **장점**: 모듈 간 분리가 명확하며 도커 기반 배포가 용이함. 로컬 LLM 사용으로 데이터 프라이버시 확보.
* **약점**:
    * **데이터 파편화**: 인증 정보는 DB에, 분석 결과는 JSON 파일 시스템에 저장되어 통합 관리 불가.
    * **확장성 부족**: Extension이 AI 서버와 직접 통신하여 보안 및 트래픽 관리에 취약.

### 4.2 개선된 타겟 아키텍처 (Target Architecture)

#### 1. 통합 백엔드 및 API Gateway 도입 (BFF 패턴)
* 현재의 `auth-service`를 API Gateway 역할을 겸하도록 확장하거나 별도 레이어로 분리.
* 클라이언트(UI, Extension)는 오직 Gateway와 통신하며, Gateway가 요청을 적절한 마이크로서비스(AI, DB 등)로 라우팅.

#### 2. 데이터베이스 중심 설계 (PostgreSQL 도입)
* 파일 시스템 저장을 중단하고 RDBMS로 통합.
* **주요 테이블 설계**:
    * `Users`: 사용자 계정 정보.
    * `JobPostings`: 분석된 공고 데이터 (JSON 구조 포함).
    * `Resumes`: 사용자 이력/경험 데이터.
    * `CoverLetters`: AI가 생성한 버전별 자소서.

#### 3. 서비스 모듈화 (Modular Monolith / Microservices)
* **Collector Service**: Python 기반. 텍스트/이미지 분석 및 데이터 정제 담당.
* **Resume Service**: RAG(검색 증강 생성) 기반. 사용자의 경험 데이터와 공고 내용을 매칭하여 자소서 생성. 벡터 DB(pgvector 등) 활용 고려.
* **Agent Service**: MCP 프로토콜을 활용하여 외부 검색 및 심층 회사 분석 수행.

#### 4. 로컬 프라이빗 동기화 전략
* 개인 자료 관리를 위해 **Local-First** 아키텍처 도입 권장.
* 클라이언트(브라우저)에 SQLite(WASM) 등을 내장하고, 서버의 PostgreSQL과 동기화(예: RxDB, PouchDB)하여 오프라인 지원 및 반응 속도 극대화.

### 4.3 실행 로드맵
1.  **1단계 (수집 고도화)**: Extension을 수정하여 '원클릭 분석(HTML 추출)' 구현.
2.  **2단계 (데이터 통합)**: Python 서버의 파일 저장 로직을 PostgreSQL 저장 로직으로 변경.
3.  **3단계 (이력서 엔진)**: 사용자 경험 입력 UI 개발 및 LLM 기반 자소서 생성 파이프라인 구축.
4.  **4단계 (에이전트 확장)**: MCP 서버 연동을 통해 기업 정보 자동 조사 기능 추가.
