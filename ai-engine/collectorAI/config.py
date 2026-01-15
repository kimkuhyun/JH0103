# ai-engine/collectorAI/config.py

"""
CareerOS Collector AI - 설정 및 프롬프트
"""

# 이미지 처리 설정
IMAGE_CONFIG = {
    "MAX_WIDTH": 768,      # AI 처리를 위한 이미지 최대 너비 리사이징
    "QUALITY": 80,          # JPEG 품질
    "FORMAT": "JPEG"
}

# 모델 설정
MODEL_CONFIG = {
    "MODEL_NAME": "qwen2.5vl", # 또는 사용 중인 모델명
    "NUM_CTX": 10000,        # 컨텍스트 윈도우 (이미지+텍스트 고려)
    "NUM_BATCH": 256,
    "TEMPERATURE": 0,       # 정확도 우선
    "TIMEOUT": 240          # 타임아웃 넉넉하게 설정
}

# 채용공고 분석 프롬프트 (개선 버전 v2.0)
ANALYSIS_PROMPT_TEMPLATE = """
당신은 채용공고 전문 분석가입니다. 제공된 [이미지]와 [추출된 텍스트]를 바탕으로 채용공고의 모든 정보를 최대한 상세하게 JSON으로 추출하세요.

[핵심 원칙]
1. **누락보다 과잉이 낫습니다**: 확실하지 않은 정보도 "추정" 또는 "추출됨" 표시와 함께 포함하세요.
2. **유연한 구조**: 공고마다 다른 섹션과 항목을 가질 수 있습니다. 발견한 모든 정보를 적절한 카테고리에 배치하세요.
3. **텍스트 우선**: [추출된 텍스트]를 가장 신뢰하고, 이미지는 구조 파악용으로만 사용하세요.
4. **다중 포지션 처리**: 하나의 공고에 여러 포지션이 있으면 각각을 배열 항목으로 저장하세요.
5. **회사명 강제**: 회사명은 반드시 추출하세요. 텍스트 상단이나 로고 근처를 확인하세요.

[추출 지침 - 상세]

**메타 정보** (meta)
- url: 공고 URL (제공된 값 사용)
- captured_at: 캡처 날짜 (제공된 값 사용)
- industry_domain: 업종 분류 (IT/소프트웨어|금융|제조|유통|의료|교육|건설|미디어|서비스 중 선택, 불명확하면 "기타")
- source_platform: 채용 플랫폼명 (예: Saramin, JobKorea, Wanted, 회사 홈페이지)

**회사 정보** (company_info) - 필수
- name: **회사명 (필수)** - 반드시 추출하세요
- description: 회사 소개 (길이 무관하게 전체 추출, 없으면 빈 문자열)
- employee_count: 직원 수 (예: "50-100명", "500명 이상", 없으면 null)
- business_type: 사업 분야 또는 업종 설명
- established: 설립연도 (있으면 추출)
- location: 회사 본사 위치 (근무지와 다를 수 있음)

**타임라인** (timeline)
- deadline_date: 마감일 (YYYY-MM-DD 형식, "채용시 마감"이면 null)
- deadline_text: 마감일 원문 (예: "2025년 2월 28일", "채용시까지", "상시채용")
- posted_date: 공고 게시일 (있으면 YYYY-MM-DD 형식)

**포지션 정보** (positions) - 배열로 여러 포지션 지원
각 포지션은 다음 구조를 가집니다:
[
  {
    "title": "포지션명 (예: 백엔드 개발자, 프론트엔드 개발자)",
    "employment_type": "정규직|계약직|인턴|파트타임|파견|프리랜서",
    "experience_required": "경력 요건 (예: 신입, 경력 3년 이상, 경력 무관)",
    "headcount": "채용 인원 (예: 1명, 2-3명, 000명, 없으면 null)",
    
    "responsibilities": ["주요업무1", "주요업무2", "..."],
    "essential_qualifications": ["필수자격1", "필수자격2", "..."],
    "preferred_qualifications": ["우대사항1", "우대사항2", "..."],
    
    "tech_stack": ["기술스택1", "기술스택2", "..."],
    "tools": ["도구1", "도구2", "..."] (예: Jira, Slack, Figma 등),
    
    "salary": {
      "type": "연봉|시급|월급|협의",
      "amount": "금액 (예: 3500만원~5000만원, 시급 15,000원)",
      "details": "급여 상세 설명 (있으면 추출)"
    },
    
    "working_conditions": {
      "location": "근무지 주소 (도로명 주소, 건물명/호수/층수/우편번호/역거리 제외)",
      "work_hours": "근무 시간 (예: 09:00-18:00, 주 40시간)",
      "work_type": "근무 형태 (재택|사무실|하이브리드|출장)"
    }
  }
]
**만약 포지션이 1개라도 배열로 작성하세요.**

**전형 절차** (hiring_process) - 배열
["서류전형", "1차 면접", "2차 면접", "처우협의", "최종합격"] 등 순서대로

**복리후생** (benefits) - 배열
["4대 보험", "퇴직금", "연차", "자유로운 연차 사용", "점심 제공", "간식 무제한", "야근 택시비", "도서 구입비", "교육비 지원", ...] 등 발견한 모든 복리후생

**기업 문화** (culture) - 선택 사항
- keywords: ["수평적", "자율성", "성과 중심", ...] 등 키워드 배열
- description: 기업 문화 설명 (있으면 추출)

**추가 정보** (additional_info) - 선택 사항
공고에 있는 기타 모든 정보를 자유롭게 추가하세요.
예: {"remote_work": true, "relocation_support": false, "visa_sponsorship": true}

[JSON 스키마 - 유연한 구조]
{
  "meta": {
    "url": "__URL__",
    "captured_at": "__DATE__",
    "industry_domain": "업종",
    "source_platform": "플랫폼명"
  },
  "company_info": {
    "name": "**회사명 (필수)**",
    "description": "회사 소개",
    "employee_count": "직원 수",
    "business_type": "사업 분야",
    "established": "설립연도",
    "location": "본사 위치"
  },
  "timeline": {
    "deadline_date": "YYYY-MM-DD 또는 null",
    "deadline_text": "마감일 원문",
    "posted_date": "게시일"
  },
  "positions": [
    {
      "title": "포지션명",
      "employment_type": "고용 형태",
      "experience_required": "경력 요건",
      "headcount": "채용 인원",
      "responsibilities": ["주요업무"],
      "essential_qualifications": ["필수자격"],
      "preferred_qualifications": ["우대사항"],
      "tech_stack": ["기술스택"],
      "tools": ["도구"],
      "salary": {
        "type": "급여 타입",
        "amount": "금액",
        "details": "상세"
      },
      "working_conditions": {
        "location": "근무지",
        "work_hours": "근무 시간",
        "work_type": "근무 형태"
      }
    }
  ],
  "hiring_process": ["전형1", "전형2"],
  "benefits": ["복리후생1", "복리후생2"],
  "culture": {
    "keywords": ["키워드1"],
    "description": "문화 설명"
  },
  "additional_info": {}
}

[특별 지침]
1. **주소 정제**: 근무지 주소는 도로명 주소만 추출하고, 건물명, 호수, 층수, 우편번호, 지하철 역에서의 거리는 제외하세요.
   예: "서울특별시 강남구 테헤란로 152" (O), "서울특별시 강남구 테헤란로 152, 강남파이낸스센터 10층 (삼성역 5분)" (X)

2. **회사명 추출 전략**:
   - 페이지 상단, 로고 근처, "회사명" 라벨 주변을 확인
   - "주식회사", "(주)", "㈜" 등의 접두사 포함 여부 확인
   - 없으면 텍스트 전체를 다시 스캔하여 가장 그럴듯한 회사명 추정

3. **다중 포지션**: 
   - "백엔드 개발자 2명, 프론트엔드 개발자 1명 모집" → positions 배열에 2개 객체
   - 각 포지션의 요구사항이 다르면 별도 객체로 분리

4. **애매한 정보**: 확실하지 않으면 "추정: ..." 또는 "명시되지 않음" 등으로 표기

[추출된 텍스트 데이터]
__RAW_TEXT_HINT__
"""

def get_analysis_prompt(url, date, metadata):
    """분석용 프롬프트 생성"""
    # 텍스트 데이터가 너무 길면 잘라서 넣음 (토큰 제한 방지)
    raw_text = metadata.get('raw_text', '텍스트 데이터 없음')
    if len(raw_text) > 6000:
        raw_text = raw_text[:6000] + "...(생략)"
        
    prompt = ANALYSIS_PROMPT_TEMPLATE.replace("__URL__", url)
    prompt = prompt.replace("__DATE__", date)
    prompt = prompt.replace("__RAW_TEXT_HINT__", raw_text)
    
    return prompt
