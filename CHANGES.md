# 개선 사항 (v2.0)

## 🔧 해결된 문제

### 1. 이미지 처리 방식 개선 ⭐
**문제**: 각 이미지를 따로 분석 → 병합  
**해결**: 여러 이미지를 세로로 이어붙여 단일 이미지로 분석

```python
# server.py - merge_images_vertically()
# 여러 스크린샷을 하나의 긴 이미지로 병합
merged_image = merge_images_vertically(raw_images)
```

### 2. 캡처 범위 정확도 향상
**문제**: 페이지 전체 스크롤하며 캡처 → 다른 회사 정보 혼입  
**해결**: 공고 본문의 끝 지점 감지

```javascript
// content.js - findJobBoundaries()
// "지원하기", "공유하기", "관련 공고" 등으로 끝 지점 감지
endMarkers: ['[class*="ApplyButton"]', '[class*="RelatedPosition"]']
```

**효과**:
- 짧은 공고: 단일 캡처 (다른 회사 혼입 방지)
- 긴 공고: 필요한 만큼만 캡처 (최대 10개)

### 3. 메타데이터 확장
```javascript
metadata: {
  company_description: "회사 소개",  // 신규
  employee_count: "직원 수"          // 신규
}
```

### 4. 코드 구조 개선
- `config.py`: 프롬프트 중앙화
- `background.js`: 프롬프트 제거 (10KB → 6KB)

## 📦 Docker 재빌드 필수

```bash
# 컨테이너 중지 및 삭제
docker-compose down

# 이미지 재빌드 (--no-cache 권장)
docker-compose build --no-cache

# 재시작
docker-compose up -d

# 로그 확인
docker logs -f career-collector
```

## 🧪 테스트 체크리스트

- [ ] Docker 빌드 성공 (`No module named 'config'` 오류 없음)
- [ ] 짧은 공고 캡처 → 단일 회사 정보만 포함
- [ ] 긴 공고 캡처 → 끝 지점까지만 캡처
- [ ] 메타데이터 추출 → `company_description` 포함
- [ ] 이미지 병합 → 단일 이미지로 분석

## 🎯 핵심 변경 파일

```
ai-engine/collectorAI/
├── config.py (신규)       # 프롬프트 및 설정
├── server.py              # 이미지 병합 로직
└── Dockerfile             # *.py 복사로 수정

extension/
├── content.js             # 끝 지점 감지 로직
└── background.js          # 단순화
```
