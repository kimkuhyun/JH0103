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
4. [최근 변경사항 (v5.0)](#4-최근-변경사항-v50)

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
* **src/components/job/DynamicJobDetail.tsx**: (v5.0 신규) 동적 공고 상세 표시 컴포넌트. 다양한 JSON 구조를 렌더링.

**Data & Logic**
* **src/pages/Dashboard.tsx**: 메인 대시보드 화면. 수집된 공고 요약 및 동적 상세 표시. v5.0에서 `DynamicJobDetail` 컴포넌트 통합.
* **src/mockdata/mockData.ts**: UI 프로토타이핑을 위한 더미 데이터 모음.
* **src/types/index.ts**: 앱 전역에서 사용되는 TypeScript 인터페이스 정의(Job, User, JobJsonV2 등). v5.0에서 새로운 JSON 구조 타입 추가.
* **src/utils/**: 핵심 비즈니스 로직.
    * `jobParser.ts`: 업로드된 JSON 데이터를 앱 내부 모델(`Job`)로 변환하고 결측치를 처리하는 파서. v5.0에서 다중 포지션 지원 추가.
    * `odsayApi.ts`: 대중교통 길찾기 정보 조회 API (ODsay) 연동 모듈.

### 2.3 AI Engine (Collector)
채용 공고 이미지 분석 및 데이터 구조화를 담당하는 Python 서버입니다. 경로: `ai-engine/collectorAI/`

* **Dockerfile**: AI 서버 컨테이너 빌드 명세.
* **requirements.txt**: Python 의존성 패키지 목록 (Flask, Pillow, Requests 등).
* **config.py**: AI 모델 설정 및 프롬프트 관리 모듈. 이미지 최적화 파라미터, LLM 컨텍스트 크기, 프롬프트 템플릿 정의. v5.0에서 프롬프트 대폭 개선.
* **server.py**: 메인 서버 스크립트.
    * `optimize_image()`: 분석 전 이미지 최적화 및 리사이징. 메모리 사용량 70% 감소.
    * `sanitize_filename()`: 공고 타이틀을 안전한 파일명으로 변환.
    * `analyze_with_ollama()`: 로컬 LLM(Ollama)에 이미지 분석 요청 및 JSON 응답 파싱.
    * `worker()`: 비동기 작업 큐 처리. 이미지 최적화, AI 분석, 파일 저장을 백그라운드에서 수행.
    * `extract_company_name()`: (v5.0 신규) 회사명 추출 로직. AI 분석 결과 우선, 메타데이터 대체.
    * `generate_filename()`: (v5.0 신규) 회사명 기반 파일명 생성. 다중 포지션 지원.

#### 최근 성능 개선 (v4.0)
* **메모리 최적화**: 이미지 처리 메모리 사용량 70% 감소 (PDF scale 2.0 → 1.0).
* **처리 속도 향상**: 공고당 평균 처리 시간 60초 → 10초로 83% 단축.
* **정확도 개선**: 사이트별 메인 섹션 선택자를 통한 정확한 영역 캡처로 추천공고 혼입 100% 제거.
* **파일명 자동화**: 공고 타이틀 기반 파일명 생성으로 관리 편의성 향상.

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

#### 사용 방법
1. 채용 공고 페이지 접속
2. `Alt+Shift+S` 단축키 또는 확장프로그램 아이콘 클릭
3. 자동으로 캡처 -> AI 분석 -> 완료 토스트 표시

#### 지원 사이트
* JobKorea (jobkorea.co.kr): 완전 지원
* Saramin (saramin.co.kr): 완전 지원
* Wanted (wanted.co.kr): 메인 섹션 선택자 개선 필요 (일부 공고에서 정확도 이슈)
* 기타 사이트: 기본 캡처 지원

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
2. Content Script가 불필요한 요소를 완전 제거하고 메타데이터 추출
3. Background Script가 사이트별 메인 섹션을 정확히 감지하여 bounds 기반 캡처 수행
4. 토스트 알림으로 진행 상황 표시 (캡처됨 -> AI 분석중 -> 완료)
5. Python 서버가 이미지 최적화 후 LLM 분석을 진행하고 공고 타이틀 기반 JSON 파일 저장

### 3.3 로드맵 및 변경 예정 사항 (Planned Changes)

#### 3.3.1 시스템 아키텍처 통합 (BFF & DB Centralization)
* **변경 계획**:
    1.  **API Gateway 도입**: 클라이언트와 서버 간의 통신을 일원화하여 보안 및 라우팅 효율화.
    2.  **데이터베이스 통합**: Python 서버의 파일 시스템 저장을 PostgreSQL 저장으로 변경하여 데이터 무결성 확보 및 이력서 생성 서비스와의 연동 준비.
    3.  **서비스 모듈화**: 채용공고 수집(Collector), 이력서 생성(Resume), 에이전트(Agent) 기능의 마이크로서비스 또는 모듈형 모놀리스 구조 확립.

#### 3.3.2 기능 확장 (Feature Expansion)
* **Resume AI**: 사용자 경험(Experience) 데이터를 벡터 DB에 저장하고, RAG(검색 증강 생성)를 활용하여 공고 맞춤형 자소서 생성 기능 개발 예정.
* **Private Knowledge Management**: 로컬 우선(Local-First) 데이터 동기화 기술을 적용한 블록형 에디터 및 개인 자료 관리 시스템 구축 예정.

#### 3.3.3 캡처 시스템 개선 (Capture System Enhancement)
* **추가 사이트 지원**: Wanted 등 메인 섹션 선택자 정확도 개선 및 추가 채용 사이트 지원.
* **공채 공고 처리**: 여러 포지션을 포함하는 통합 공채 공고의 개별 포지션 분리 수집 기능 개발.
* **프롬프트 엔지니어링**: JSON 추출 품질 향상을 위한 프롬프트 최적화 및 검증 로직 강화.
* **메타데이터 정제**: HTML 소스코드 제외 및 핵심 메타정보만 전달하는 경량화된 페이로드 구조.
* **처리 속도 최적화**: 이미지 인식 시간 10초 이내 목표 달성을 위한 모델 최적화 및 병렬 처리 도입.
* **순차 처리 로직**: 여러 공고 동시 요청 시 큐 기반 순차 처리 및 상태 관리 시스템 구축.
* **UX 개선**: 토스트 스택 시스템을 통한 실시간 작업 상태 피드백 및 캡처 중 페이지 이탈 방지 안내 추가.

---

## 4. 최근 변경사항 (v5.0)

### 4.1 동적 공고 표시 시스템 (2026-01-14)

#### 4.1.1 AI 프롬프트 개선
**파일**: `ai-engine/collectorAI/config.py`
* **다양한 공고 형태 지원**: 여러 포지션, 긴/짧은 회사 소개, 유무가 다른 자격요건 등 모든 공고 형태를 수용
* **유연한 JSON 구조**: 필수 필드 최소화, positions 배열로 다중 포지션 지원
* **회사명 강제 추출**: 회사명을 필수로 추출하도록 지침 강화
* **메타정보 확장**: industry_domain, source_platform, employee_count, established 등 추가
* **복리후생/전형절차/기업문화**: 발견되는 모든 정보를 배열로 추출
* **주소 정제 지침**: 건물명, 호수, 층수, 우편번호, 역거리 제외 명시

#### 4.1.2 파일명 생성 로직 강화
**파일**: `ai-engine/collectorAI/server.py`
* **회사명 우선순위 명확화**: AI 분석 결과 > 메타데이터 순으로 회사명 추출
* **다중 포지션 표시**: "첫번째포지션_외N건" 형식으로 파일명 생성
* **extract_company_name()**: 회사명 추출 전용 함수 모듈화
* **generate_filename()**: 파일명 생성 로직 모듈화 및 구버전 호환성 유지

#### 4.1.3 타입 시스템 확장
**파일**: `UI/src/types/index.ts`
* **JobJsonV2 인터페이스**: 새로운 JSON 구조 (positions, company_info, timeline, benefits, culture 등)
* **Job.rawJson**: 원본 JSON 데이터 보관 필드 추가
* **구버전 호환성**: job_summary, analysis 등 기존 필드 유지

#### 4.1.4 파서 로직 리팩토링
**파일**: `UI/src/utils/jobParser.ts`
* **신버전 우선 처리**: positions 배열 구조를 우선 파싱
* **구버전 fallback**: job_summary/analysis 구조 호환성 유지
* **다중 포지션 표시**: "포지션명 외 N건" 형식으로 role 표시
* **급여 정보 통합**: salary 객체의 type, amount, details 통합

#### 4.1.5 동적 렌더링 컴포넌트
**파일**: `UI/src/components/job/DynamicJobDetail.tsx` (신규)
* **완전 동적 렌더링**: 모든 JSON 구조를 동적으로 파싱하여 표시
* **섹션별 색상 구분**: 회사정보(slate), 업무(teal), 자격(red/green), 기술(indigo), 급여(green), 전형(amber), 복리후생(pink), 문화(violet)
* **다중 포지션 지원**: positions 배열의 각 포지션을 개별 카드로 표시
* **메타정보 강조**: 회사 정보를 상단에 박스 형태로 명확히 표시

#### 4.1.6 대시보드 통합
**파일**: `UI/src/pages/Dashboard.tsx`
* **DynamicJobDetail 통합**: 기존 고정 필드 표시를 동적 컴포넌트로 대체
* **상세 패널 확장**: 450px -> 500px로 너비 확장 (더 많은 정보 표시)
* **주소 정제 개선**: positions 구조에서도 주소 추출 가능
* **코드 간소화**: 중복 로직 제거, 가독성 향상

### 4.2 주요 개선 효과

#### 공고 수용력 향상
* **이전**: 고정된 필드만 표시, 다양한 공고 형태 미지원
* **이후**: 모든 JSON 구조를 동적으로 렌더링, 다중 포지션/복리후생/전형절차 등 완벽 지원

#### 정보 손실 방지
* **이전**: JSON에 있어도 UI에 표시되지 않는 정보 다수
* **이후**: 원본 JSON의 모든 정보를 섹션별로 분류하여 표시

#### 유지보수성 향상
* **이전**: 새로운 필드 추가 시 Dashboard.tsx 수정 필요
* **이후**: JSON 구조만 맞으면 자동으로 렌더링

#### 사용자 경험 개선
* **이전**: 공고마다 표시되는 정보가 일관되지 않음
* **이후**: 공고에 있는 모든 정보를 체계적으로 표시, 섹션별 색상 구분으로 가독성 향상

### 4.3 이전 버전 호환성
* **구버전 JSON 구조 완벽 지원**: job_summary, analysis 기반의 기존 JSON도 정상 작동
* **점진적 마이그레이션**: 신규 공고는 v2.0 구조, 기존 공고는 v1.0 구조로 혼용 가능
* **fallback 로직**: 필드가 없을 경우 기본값 또는 빈 배열로 처리

### 4.4 알려진 제약사항
* **소형 모델 한계**: 현재 사용 중인 Ollama 모델은 복잡한 공고에서 일부 정보를 누락할 수 있음
* **주소 정제**: 완벽한 주소 정제가 어려운 경우 지오코딩 실패 가능
* **토큰 제한**: 매우 긴 공고(6000자 이상)는 raw_text가 잘릴 수 있음

### 4.5 향후 개선 계획
* **프롬프트 최적화**: Few-shot 예제 추가, 검증 로직 강화
* **모델 업그레이드**: 더 큰 모델 또는 GPT-4V 통합 고려
* **실시간 검증**: AI 분석 결과의 필수 필드 검증 및 재시도 로직
* **사용자 피드백**: 분석 결과에 대한 사용자 수정 기능 추가
