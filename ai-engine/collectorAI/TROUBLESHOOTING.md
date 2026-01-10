# 트러블슈팅 가이드

## "분석 실패 (타임아웃 가능성)" 오류

### 증상
익스텐션 실행 직후 "분석 실패 (타임아웃 가능성)" 토스트 메시지 표시

### 원인 진단

#### 1. Ollama 서버 미실행
가장 흔한 원인입니다.

**확인 방법:**
```bash
# Ollama 실행 확인
curl http://localhost:11434/api/tags
```

**해결:**
```bash
# Ollama 시작
ollama serve
```

#### 2. 모델 미설치
qwen2.5vl 모델이 설치되지 않았습니다.

**확인 방법:**
```bash
# 설치된 모델 목록 확인
ollama list
```

**해결:**
```bash
# 모델 다운로드 (약 5-10분 소요)
ollama pull qwen2.5vl
```

#### 3. Docker 네트워크 문제
Docker 컨테이너에서 host.docker.internal 접근 불가

**확인 방법:**
```bash
# 컨테이너 내부에서 테스트
docker exec -it <container_id> curl http://host.docker.internal:11434/api/tags
```

**해결:**
- **Windows/Mac**: Docker Desktop 설정에서 "Enable host.docker.internal" 확인
- **Linux**: docker-compose.yml에 extra_hosts 추가
  ```yaml
  extra_hosts:
    - "host.docker.internal:host-gateway"
  ```

### 서버 상태 확인

```bash
# 서버 헬스체크
curl http://localhost:5000/health
```

정상 응답 예시:
```json
{
  "server": "ok",
  "ollama": {
    "connected": true,
    "models": ["qwen2.5vl:latest"],
    "target_model_available": true
  },
  "queue_size": 0,
  "model": "qwen2.5vl"
}
```

오류 응답 예시:
```json
{
  "server": "ok",
  "ollama": {
    "connected": false,
    "error": "Ollama 서버에 연결할 수 없습니다."
  }
}
```

## 기타 오류

### "PDF 저장 실패"
- 디스크 공간 확인
- /app/data 디렉토리 권한 확인

### "이미지 변환 실패"
- PDF 파일 손상 여부 확인
- PyMuPDF 라이브러리 재설치

### "AI 분석 실패"
서버 로그 확인:
```bash
docker logs <container_id>
```

## 성능 최적화

### Ollama 설정
```bash
# GPU 사용 (NVIDIA)
docker run --gpus all ...

# 메모리 할당 증가
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_MODELS=/path/to/models
```

### 타임아웃 조정
`config.py`:
```python
MODEL_CONFIG = {
    "TIMEOUT": 300  # 기본 5분, 필요시 증가
}
```

## 지원 요청

문제가 지속되면 다음 정보와 함께 이슈 등록:
1. 에러 메시지
2. `/health` 엔드포인트 응답
3. 서버 로그
4. 운영체제 및 Docker 버전
