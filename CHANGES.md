# 변경사항 v2.0

## 해결된 문제

### 1. 이미지 처리 방식 개선
- 이전: 각 이미지를 개별 분석 후 병합
- 개선: 이미지를 세로로 병합하여 단일 분석
- 결과: 컨텍스트 연속성 향상, 처리 속도 개선

### 2. 캡처 정확도 향상
- 이전: 고정 캡처 수, 경계 감지 없음
- 개선: 공고 끝 마커 감지 (지원하기 버튼, 관련 공고)
- 제한: 최대 5장, 끝 마커 없으면 컨테이너의 70%만
- 결과: 단일 회사 데이터만 추출, 혼입 방지

### 3. 비동기 처리 시스템
- 이전: 동기 처리, 브라우저 30초 타임아웃
- 개선: 작업 큐 시스템, 폴링 방식
- 서버: 백그라운드 워커 스레드
- 클라이언트: 2초마다 폴링, 최대 2분
- 결과: 다중 요청 처리, 타임아웃 회피

### 4. 디버깅 개선
- 병합된 이미지 저장 (/app/data/images)
- JSON과 동일 위치에 이미지 저장
- 상세한 한국어 로그

### 5. 성능 최적화
- 이미지 크기: 1200px → 800px
- 이미지 품질: 85 → 75
- 모델 타임아웃: 180초 → 120초
- 프롬프트: 한국어로 개선

## 아키텍처

```
익스텐션 -> POST /analyze -> 서버 큐
익스텐션 <- job_id <- 서버
익스텐션 -> GET /status/{job_id} (2초마다 폴링)
익스텐션 <- 결과 <- 서버 워커
```

## 변경된 파일

```
ai-engine/collectorAI/
├── config.py          # 한국어 프롬프트, 이미지 크기 축소
├── server.py          # 큐 시스템, 이미지 저장, 한국어 로그
└── Dockerfile         # 모든 .py 파일 복사

extension/
├── content.js         # 끝 마커 감지, 5장 제한, 한국어 로그
└── background.js      # 비동기 폴링, 한국어 메시지
```

## Docker 재빌드 필수

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker logs -f career-collector
```

## 이미지 확인 방법

분석 실패 시 저장된 이미지 확인:
```bash
docker exec -it career-collector ls -lh /app/data/images/
```

이미지 다운로드:
```bash
docker cp career-collector:/app/data/images/[파일명].jpg ./
```

## 테스트 체크리스트

- [ ] 짧은 공고: 1-2장 캡처, 단일 회사
- [ ] 긴 공고: 3-5장 캡처, 올바른 끝 지점
- [ ] 다중 요청: 큐가 순차 처리
- [ ] 타임아웃 없음: 2분 내 완료
- [ ] 이미지 저장: /app/data/images에 저장됨
- [ ] JSON 정확도: 모든 필드 올바르게 추출
