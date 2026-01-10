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

**Data & Logic**
* **src/pages/Dashboard.tsx**: 메인 대시보드 화면. 수집된 공고 요약 및 주요 지표 표시.
* **src/mockdata/mockData.ts**: UI 프로토타이핑을 위한 더미 데이터 모음.
* **src/types/index.ts**: 앱 전역에서 사용되는 TypeScript 인터페이스 정의(Job, User 등).
* **src/utils/**: 핵심 비즈니스 로직.
    * `jobParser.ts`: 업로드된 JSON 데이터를 앱 내부 모델(`Job`)로 변환하고 결측치를 처리하는 파서.
    * `odsayApi.ts`: 대중교통 길찾기 정보 조회 API (ODsay) 연동 모듈.

### 2.3 AI Engine (Collector)
채용 공고 이미지 분석 및 데이터 구조화를 담당하는 Python 서버입니다. 경로: `ai-engine/collectorAI/`

* **Dockerfile**: AI 서버 컨테이너 빌드 명세.
* **requirements.txt**: Python 의존성 패키지 목록 (Flask, Pillow, Requests 등).
* **server.py**: 메인 서버 스크립트.
    * `resize_image()`: 분석 전 이미지 최적화 및 리사이징.
    * `extract_metadata_text()`: Extension에서 전달받은 메타데이터를 텍스트로 변환.
    * `analyze()`: POST 요청을 받아 로컬 LLM(Ollama)에 분석을 요청하고 결과를 JSON 파일로 저장. 메타데이터와 이미지를 함께 처리.

### 2.4 Extension (Web Clipper)
웹 브라우저에서 채용 공고를 원클릭으로 캡처하는 크롬 확장프로그램입니다. 경로: `extension/`

* **manifest.json**: 확장프로그램 권한 및 메타데이터 정의. v3.0에서 원클릭 캡처 기능 추가.
* **popup.html**: 확장프로그램 팝업 UI의 HTML 구조. 간소화된 원클릭 인터페이스.
* **popup.js**: 팝업 UI 인터랙션 처리. 캡처 버튼 클릭 시 백그라운드 스크립트로 메시지 전송.
* **background.js**: 브라우저 백그라운드 서비스 워커.
    * `startOneClickCapture()`: 단축키(Alt+Shift+S) 또는 버튼 클릭 시 실행되는 메인 캡처 함수.
    * `captureFullPage()`: 스크롤하며 전체 페이지를 여러 장의 스크린샷으로 캡처.
    * `sendToServer()`: 캡처된 이미지와 메타데이터를 Python 분석 서버로 전송.
* **content.js**: 웹 페이지에 주입되는 콘텐츠 스크립트.
    * `ToastNotification`: 토스트 알림 클래스. 캡처/분석 진행 상황을 사용자에게 표시.
    * `SITE_CONFIGS`: 채용 사이트별 DOM 선택자 설정 (Wanted, JobKorea, Saramin 등).
    * `hideUnnecessaryElements()`: 관련 공고, 광고 등 불필요한 요소를 숨겨 깔끔한 캡처 지원.
    * `extractMetadata()`: 회사명, 공고 제목, 급여, 근무지 등 메타데이터를 DOM에서 추출.
* **toast.css**: 토스트 알림 스타일 정의.

#### 사용 방법
1. 채용 공고 페이지 접속
2. `Alt+Shift+S` 단축키 또는 확장프로그램 아이콘 클릭
3. 자동으로 캡처 -> AI 분석 -> 완료 토스트 표시

### 2.5 Services (Auth Backend)
사용자 인증 및 세션 관리를 담당하는 Spring Boot 애플리케이션입니다. 경로: `services/auth-service/`

#### Build & Config
* **build.gradle / settings.gradle**: Gradle 빌드 스크립트 및 프로젝트 설정.
* **gradlew / gradlew.bat**: Gradle 래퍼 실행 스크립트.
* **Dockerfile**: 인증 서버 컨테이너 빌드 명세.
* **src/main/resources/application.yml (or .properties)**: 서버 포트, DB 연결, OAuth 클라이언트 설정.

#### Source Code (`src/main/java/com/jh0103/authservice/`)
* **AuthServiceApplication.java**: Spring Boot 애플리케이션 메인 실행 클래스.
* **config/SecurityConfig.java**: Spring Security 설정. URL별 접근 권한 및 OAuth2 로그인 설정.
* **controller/UserController.java**: 사용자 정보 조회 API (`/api/v1/user`) 컨트롤러.
* **domain/**: JPA 엔티티 클래스.
    * `User.java`: 사용자 테이블 매핑 (이름, 이메일, 역할 등).
    * `Role.java`: 사용자 권한 열거형(Enum).
* **dto/**: 데이터 전송 객체.
    * `OAuthAttributes.java`: 소셜 로그인(Google, Naver 등) 제공자별 속성 매핑.
    * `SessionUser.java`: 세션에 저장되는 직렬화된 사용자 정보.
* **repository/UserRepository.java**: User 테이블에 접근하는 JPA 레포지토리 인터페이스.
* **service/CustomOAuth2UserService.java**: OAuth2 로그인 성공 후 사용자 정보를 로드하고 DB에 저장/갱신(`saveOrUpdate`)하는 비즈니스 로직.

### 2.6 Infra (Database)
데이터베이스 초기화 스크립트입니다. 경로: `infra/db/init/`

* **init.sql**: PostgreSQL 컨테이너 최초 실행 시 테이블 생성 및 초기 데이터를 적재하는 SQL 스크립트.

---

## 3. 아키텍처 및 로드맵

### 3.1 현재 아키텍처 (Current Status)
* **Client**: React SPA + Chrome Extension (원클릭 스크롤 캡처 + 메타데이터 추출 방식).
* **Backend**:
    * Auth Service: Java Spring Boot (사용자 인증).
    * AI Engine: Python Flask (로컬 LLM 연동, 이미지+메타데이터 분석, JSON 파일 저장).
* **Data**: PostgreSQL (사용자 정보), 로컬 파일 시스템 (공고 데이터).

### 3.2 데이터 수집 플로우 (One-Click Capture)
1. 사용자가 채용 공고 페이지에서 `Alt+Shift+S` 단축키 또는 확장 아이콘 클릭
2. Content Script가 불필요한 요소(관련 공고, 광고 등)를 숨기고 메타데이터 추출
3. Background Script가 스크롤하며 전체 페이지 캡처 (최대 5장)
4. 토스트 알림으로 진행 상황 표시 (캡처됨 -> AI 분석중 -> 완료)
5. Python 서버가 이미지 + 메타데이터를 받아 LLM 분석 후 JSON 저장

### 3.3 로드맵 및 변경 예정 사항 (Planned Changes)

#### 3.3.1 시스템 아키텍처 통합 (BFF & DB Centralization)
* **변경 계획**:
    1.  **API Gateway 도입**: 클라이언트와 서버 간의 통신을 일원화하여 보안 및 라우팅 효율화.
    2.  **데이터베이스 통합**: Python 서버의 파일 시스템 저장을 PostgreSQL 저장으로 변경하여 데이터 무결성 확보 및 이력서 생성 서비스와의 연동 준비.
    3.  **서비스 모듈화**: 채용공고 수집(Collector), 이력서 생성(Resume), 에이전트(Agent) 기능의 마이크로서비스 또는 모듈형 모놀리스 구조 확립.

#### 3.3.2 기능 확장 (Feature Expansion)
* **Resume AI**: 사용자 경험(Experience) 데이터를 벡터 DB에 저장하고, RAG(검색 증강 생성)를 활용하여 공고 맞춤형 자소서 생성 기능 개발 예정.
* **Private Knowledge Management**: 로컬 우선(Local-First) 데이터 동기화 기술을 적용한 블록형 에디터 및 개인 자료 관리 시스템 구축 예정.
