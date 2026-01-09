# JH0103 UI 설정 가이드

## 🔑 API 키 설정

### 1. 환경 변수 파일 생성

프로젝트 루트의 `UI/` 디렉토리에 `.env` 파일을 생성합니다:

```bash
cd UI
cp .env.example .env
```

### 2. Kakao Map API 키 발급

1. [Kakao Developers](https://developers.kakao.com/)에 접속
2. 애플리케이션 추가
3. 앱 설정 → 플랫폼 → Web 플랫폼 등록
4. 사이트 도메인 추가 (개발 시: `http://localhost:5173`)
5. JavaScript 키 복사

`.env` 파일에 추가:
```env
VITE_KAKAO_MAP_API_KEY=your_kakao_javascript_key_here
```

### 3. ODsay API 키 발급

1. [ODsay LAB](https://lab.odsay.com/)에 접속
2. 회원가입 및 로그인
3. Application → 애플리케이션 등록
4. API Key 복사

`.env` 파일에 추가:
```env
VITE_ODSAY_API_KEY=your_odsay_api_key_here
```

## 🏠 집 위치 설정 기능

### 기능 설명

- 대시보드 우측 상단의 "집 위치 설정" 버튼 클릭
- 집 주소 입력 및 검색
- 자동으로 모든 채용 공고까지의 대중교통 경로 계산
- 지도에 집 마커(⭐)와 경로가 표시됨

### 사용 방법

1. **집 위치 최초 설정**
   - "집 위치 설정" 버튼 클릭 (주황색으로 강조됨)
   - 도로명 주소 또는 지번 주소 입력
   - "검색" 버튼 클릭
   - 위치 확인 후 "저장하기"

2. **자동 경로 계산**
   - 집 위치 저장 후 자동으로 모든 공고의 출퇴근 경로 계산
   - 각 공고 카드에 대중교통 소요 시간, 환승 횟수, 요금 표시
   - 공고 선택 시 지도에 경로가 시각화됨

3. **집 위치 변경**
   - 언제든지 "집 위치 변경" 버튼으로 재설정 가능
   - 변경 시 모든 경로가 자동으로 재계산됨

## 🗺️ 지도 기능

### 마커 종류

- **⭐ 별 마커**: 집 위치
- **🔵 파란 마커**: 일반 채용 공고
- **🔴 빨간 마커**: 선택된 채용 공고

### 경로 표시

- 집에서 선택된 공고까지의 대중교통 경로를 청록색 선으로 표시
- 경로 중간에 소요 시간, 환승 정보 표시
- 실시간 대중교통 데이터 기반 (ODsay API)

## 📄 JSON 파일 업로드

### 지원 형식

업로드하는 JSON 파일은 다음 구조를 따라야 합니다:

```json
{
  "meta": {
    "url": "https://example.com/job-posting"
  },
  "timeline": {
    "deadline_text": "2024-12-31"
  },
  "job_summary": {
    "company": "회사명",
    "title": "직무명"
  },
  "analysis": {
    "key_responsibilities": ["업무1", "업무2"],
    "essential_qualifications": ["자격1", "자격2"],
    "preferred_qualifications": ["우대사항1"],
    "tools_and_knowledge": ["기술1", "기술2"],
    "working_conditions": {
      "salary": "연봉 정보",
      "location": {
        "address": "서울특별시 강남구 테헤란로 123"
      },
      "schedule": {
        "work_houres": "09:00 - 18:00"
      }
    }
  }
}
```

### 자동 처리

1. **주소 → 좌표 변환**: Kakao Maps Geocoding API 사용
2. **출퇴근 경로 계산**: 집 위치가 설정되어 있으면 자동 계산
3. **지도 표시**: 공고 위치가 자동으로 지도에 표시됨

## 🚀 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## ⚠️ 문제 해결

### API 키 오류

```
지도를 불러오는데 실패했습니다. API 키를 확인해주세요.
```
→ `.env` 파일의 `VITE_KAKAO_MAP_API_KEY` 확인

```
ODsay API 키가 설정되지 않았습니다.
```
→ `.env` 파일의 `VITE_ODSAY_API_KEY` 확인

### 주소 검색 실패

→ 정확한 도로명 주소 또는 지번 주소 입력 필요

### 경로 계산 실패

→ ODsay API 무료 사용량 제한 확인 (Basic: 1,000건/일)

## 📝 주요 컴포넌트

- `Dashboard.tsx`: 메인 대시보드 (리스트, 상세, 지도)
- `KakaoMapContainer.tsx`: 카카오 지도 컨테이너
- `HomeLocationSettings.tsx`: 집 위치 설정 모달
- `TransitRouteOverlay.tsx`: 경로 시각화 오버레이
- `odsayApi.ts`: ODsay API 래퍼
- `jobParser.ts`: JSON 파일 파서

## 🎨 UX/UI 특징

- **반응형 디자인**: 3단 레이아웃 (리스트 + 상세 + 지도)
- **실시간 피드백**: 로딩 상태 표시
- **시각적 계층**: 색상과 아이콘으로 정보 구분
- **부드러운 애니메이션**: 호버, 선택 시 transition
- **직관적 아이콘**: lucide-react 아이콘 세트 사용
