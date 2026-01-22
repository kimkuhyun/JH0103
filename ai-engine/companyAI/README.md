# MCP 회사 분석 서버 가이드

## 📚 목차
1. [사전 준비](#1-사전-준비)
2. [Ollama 모델 설치](#2-ollama-모델-설치)
3. [Docker 서비스 실행](#3-docker-서비스-실행)
4. [MCP 서버 테스트](#4-mcp-서버-테스트)
5. [Claude Desktop 연결](#5-claude-desktop-연결)
6. [HTTP API 사용](#6-http-api-사용)

---

## 1. 사전 준비

### 필수 프로그램 확인
```bash
# Node.js 20 이상
node --version

# Docker Desktop 실행 중
docker --version

# Ollama 로컬 실행 중
ollama --version
```

### 의존성 설치
```bash
cd C:\Users\kimksdsf\Desktop\JH0103\ai-engine\companyAI
npm install
```

---

## 2. Ollama 모델 설치

### 로컬 Ollama에 Qwen 모델 다운로드
```bash
# 현재 사용 가능한 모델 (Qwen3 대체)
ollama pull qwen2.5:7b

# 확인
ollama list
```

### Ollama 서버 확인
```bash
# Ollama가 실행 중인지 확인
curl http://localhost:11434/api/tags

# 응답 예시:
# {"models":[{"name":"qwen2.5:7b",...}]}
```

---

## 3. Docker 서비스 실행

### 전체 서비스 시작
```bash
# JH0103 루트 디렉토리에서
cd C:\Users\kimksdsf\Desktop\JH0103

# Docker Compose 실행
docker-compose up -d

# 실행 확인
docker-compose ps
```

### 서비스 확인
```
NAME                    PORT
jh0103-db               3306
ui-service              5173
backend-core            8080
career-collector        5000
mcp-searxng             9000   ← SearxNG 검색
mcp-browserless         3000   ← 크롤링
company-search-server   4000   ← MCP 서버
```

### SearxNG 접속 테스트
브라우저에서: http://localhost:9000

---

## 4. MCP 서버 테스트

### HTTP API로 테스트

**요청 예시**
```bash
curl -X POST http://localhost:4000/search \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "카카오",
    "jobtitle": "백엔드 개발자",
    "jobDescription": "Spring Boot 기반 API 개발"
  }'
```

**응답 예시**
```json
{
  "success": true,
  "data": {
    "company_name": "카카오",
    "industry": "IT/인터넷",
    "business_summary": "...",
    "key_products": ["카카오톡", "카카오페이"],
    "recent_news_summary": "...",
    "job_fit_analysis": "..."
  }
}
```

---

## 5. Claude Desktop 연결

### Claude Desktop 설정 파일 수정

**Windows 경로:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**파일 내용:**
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
3. 설정 > 개발자 > MCP 서버 확인

### Claude에서 사용하기
```
Claude에게 입력:
"카카오라는 회사에 대해 search_company 도구를 사용해서 조사해줘"
```

---

## 6. HTTP API 사용

### Spring Boot에서 호출

**Java 예시**
```java
@Service
public class CompanyResearchService {
    
    private final RestTemplate restTemplate;
    private final String MCP_URL = "http://localhost:4000";
    
    public CompanyReport searchCompany(String companyName, String jobTitle) {
        Map<String, String> request = Map.of(
            "companyName", companyName,
            "jobtitle", jobTitle,
            "jobDescription", ""
        );
        
        ResponseEntity<Map> response = restTemplate.postForEntity(
            MCP_URL + "/search",
            request,
            Map.class
        );
        
        Map<String, Object> data = (Map) response.getBody().get("data");
        
        // CompanyReport 객체로 변환
        return CompanyReport.builder()
            .companyName((String) data.get("company_name"))
            .industry((String) data.get("industry"))
            .businessSummary((String) data.get("business_summary"))
            .build();
    }
}
```

---

## 🔧 문제 해결

### Ollama 연결 실패
```bash
# Docker 컨테이너에서 host 접근 확인
docker exec -it company-search-server sh
curl http://host.docker.internal:11434/api/tags
```

### SearxNG 검색 안 됨
```bash
# SearxNG 로그 확인
docker logs mcp-searxng

# 재시작
docker-compose restart searxng
```

### Browserless 크롤링 실패
```bash
# Browserless 로그 확인
docker logs mcp-browserless

# 메모리 부족시 docker-compose.yml에서 shm_size 증가
```

---

## 📊 MCP 도구 목록

| 도구명 | 설명 | 입력 |
|-------|------|------|
| search_company | 회사명으로 검색 | `{ query: "회사명" }` |
| fetch_webpage | URL 크롤링 | `{ url: "https://..." }` |

---

## 🚀 다음 단계

1. **Vision 모델 추가** - Qwen3-VL로 이미지 분석
2. **캐싱** - Redis로 중복 검색 방지
3. **DB 저장** - MySQL에 분석 결과 저장
4. **프론트엔드 연동** - React UI에서 버튼 클릭으로 분석
