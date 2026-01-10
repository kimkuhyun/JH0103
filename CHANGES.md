# 변경사항 v3.0 - Puppeteer PDF 모드

## 핵심 변경

### Puppeteer PDF 생성 방식
- Extension: URL만 전송 (스크린샷 제거)
- Server: Puppeteer로 해당 URL 접속
- 인쇄 모드로 PDF 생성
- PDF → 이미지 → OCR

### 장점
- 정확히 그 공고만 추출 (광고/추천 자동 제거)
- 인쇄 레이아웃으로 깔끔
- 다른 회사 정보 혼입 불가능
- 스크롤/캡처 불필요

## 구조

```
Extension (URL만) → Server
Server: Puppeteer → PDF → 이미지 변환 → Ollama OCR → JSON
```

## 파일 변경

```
ai-engine/collectorAI/
├── requirements.txt   # pyppeteer 추가
├── server.py          # Puppeteer 통합
└── Dockerfile         # (변경 없음)

extension/
├── background.js      # URL만 전송, 타임아웃 3분
└── content.js         # (변경 없음)
```

## Docker 재빌드 필수

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker logs -f career-collector
```

첫 실행 시 Puppeteer가 Chromium을 다운로드하므로 시간이 걸릴 수 있습니다.

## 저장 위치

- JSON: `/app/data/`
- PDF: `/app/data/pdfs/`
- 이미지: `/app/data/images/`

## 확인 방법

```bash
# PDF 확인
docker exec -it career-collector ls -lh /app/data/pdfs/

# PDF 다운로드
docker cp career-collector:/app/data/pdfs/[파일명].pdf ./
```

## 테스트

- [ ] Extension에서 URL 전송
- [ ] 서버에서 PDF 생성 (30초 이내)
- [ ] PDF가 공고만 포함 (광고/추천 제외)
- [ ] OCR 정확도 향상
- [ ] JSON 완성도 향상
