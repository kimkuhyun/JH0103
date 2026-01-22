# 🚀 MCP 회사 분석 서버 - 빠른 시작 가이드

## 📋 실행 전 체크리스트

- [ ] Ollama가 로컬에서 실행 중 (포트 11434)
- [ ] Docker Desktop 실행 중
- [ ] Node.js 20 이상 설치됨

---

## Step 1: Ollama 모델 다운로드

```bash
# 터미널/PowerShell에서 실행
ollama pull qwen2.5:7b

# 확인
ollama list
# 결과: qwen2.5:7b가 보여야 함
```

**예상 시간:** 5-10분 (모델 크기: ~4.7GB)

---

## Step 2: 의존성 설치

```bash
# companyAI 폴더로 이동
cd C:\Users\kimksdsf\Desktop\JH0103\ai-engine\companyAI

# npm 패키지 설치
npm install
```

---

## Step 3: Docker 서비스 시작

```bash
# JH0103 루트로 이동
cd C:\Users\kimksdsf\Desktop\JH0103

# 전체 서비스 시작
docker-compose up -d

# 로그 확인 (선택)
docker-compose logs -f company-search-server
```

### 예상 결과
```
✔ Container jh0103-db              Started
✔ Container mcp-searxng             Started  
✔ Container mcp-browserless         Started
✔ Container company-search-server   Started
```

---

## Step 4: 서비스 상태 확인

### 1️⃣ SearxNG 확인
브라우저: http://localhost:9000
- "test" 검색해보기
- 결과가 나오면 ✅

### 2️⃣ Ollama 확인
```bash
curl http://localhost:11434/api/tags
```
응답에 "qwen2.5:7b"가 보이면 ✅

### 3️⃣ MCP 서버 확인
```bash
curl http://localhost:4000/health
```
200 응답이 오면 ✅ (없으면 다음 단계로)

---

## Step 5: 첫 테스트 - HTTP API

### 간단한 테스트
```bash
curl -X POST http://localhost:4000/search \
  -H "Content-Type: application/json" \
  -d "{\"companyName\": \"네이버\", \"jobtitle\": \"개발자\"}"
```

### PowerShell에서 테스트
```powershell
$body = @{
    companyName = "네이버"
    jobtitle = "백엔드 개발자"
    jobDescription = "Spring Boot API 개발"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:4000/search -Method Post -Body $body -ContentType "application/json"
```

### 성공 응답 예시
```json
{
  "success": true,
  "data": {
    "company_name": "네이버",
    "industry": "IT/인터넷",
    "business_summary": "검색 포털 및 다양한 인터넷 서비스...",
    "key_products": ["네이버 검색", "라인", "웨일브라우저"],
    ...
  }
}
```

---

## Step 6: Claude Desktop 연결 (선택)

### 설정 파일 위치
```
Windows: %APPDATA%\Claude\claude_desktop_config.json
Mac: ~/Library/Application Support/Claude/claude_desktop_config.json
```

### 설정 내용
```json
{
  "mcpServers": {
    "company-search": {
      "command": "node",
      "args": [
        "C:\\Users\\kimksdsf\\Desktop\\JH0103\\ai-engine\\companyAI\\mcp-server.js"
      ],
      "env": {
        "SEARXNG_URL": "http://localhost:9000",
        "BROWSERLESS_URL": "http://localhost:3000",
        "OLLAMA_HOST": "http://localhost:11434",
        "OLLAMA_MODEL": "qwen2.5:7b"
      }
    }
  }
}
```

### Claude Desktop 재시작
1. Claude Desktop 완전 종료
2. 다시 실행
3. 하단에 🔧 아이콘 확인

### Claude에서 사용
```
"search_company 도구로 카카오 회사에 대해 조사해줘"
```

---

## 🔍 문제 해결

### ❌ Ollama 연결 실패
```bash
# Docker 컨테이너에서 호스트 접근 확인
docker exec -it company-search-server sh
curl http://host.docker.internal:11434/api/tags

# 안 되면 방화벽 확인 또는 Ollama 재시작
```

### ❌ SearxNG 검색 안 됨
```bash
# 로그 확인
docker logs mcp-searxng

# 재시작
docker-compose restart searxng
```

### ❌ 크롤링 타임아웃
```bash
# Browserless 메모리 부족일 수 있음
# docker-compose.yml에서 shm_size: "2gb" 확인
docker-compose restart browserless
```

### ❌ "Cannot find module" 에러
```bash
# npm 재설치
cd ai-engine/companyAI
rm -rf node_modules
npm install
```

---

## 📊 전체 아키텍처

```
사용자 요청
    ↓
MCP Server (포트 4000)
    ↓
    ├─→ SearxNG (포트 9000) - 검색
    ├─→ Browserless (포트 3000) - 크롤링
    └─→ Ollama (포트 11434) - AI 분석
```

---

## 🎯 다음 단계

1. ✅ Spring Boot와 연동
2. ✅ 프론트엔드 UI에서 호출
3. ✅ DB에 결과 저장
4. 🔜 Vision 모델 추가 (이미지 분석)
5. 🔜 Redis 캐싱

---

## 📝 주요 파일

| 파일 | 역할 |
|------|------|
| `mcp-server.js` | MCP 서버 메인 |
| `tools/searxng-tool.js` | 검색 도구 |
| `tools/browserless-tools.js` | 크롤링 도구 |
| `tools/analyzer.js` | AI 분석 도구 |
| `docker-compose.yml` | 서비스 정의 |
| `.env` | 환경 변수 |

---

## 💡 팁

- **빠른 재시작**: `docker-compose restart company-search-server`
- **로그 실시간 보기**: `docker-compose logs -f company-search-server`
- **전체 재빌드**: `docker-compose up -d --build company-search-server`
