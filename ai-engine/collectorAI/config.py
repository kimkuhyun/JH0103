"""
CareerOS Collector AI - 중앙 설정 및 프롬프트 관리
"""

# 이미지 처리 설정
IMAGE_CONFIG = {
    "MAX_WIDTH": 1200,  # 이미지 최대 너비
    "QUALITY": 85,      # JPEG 품질
    "FORMAT": "JPEG"    # 이미지 포맷
}

# 모델 설정
MODEL_CONFIG = {
    "MODEL_NAME": "llama3.2-vision",
    "NUM_CTX": 8192,    # 컨텍스트 윈도우 확대 (이미지 병합용)
    "TEMPERATURE": 0
}

# 채용공고 분석 프롬프트
ANALYSIS_PROMPT_TEMPLATE = """
[Role] 전문 채용공고 분석가
[Task] 이미지에서 채용공고 정보를 빠짐없이 추출하여 JSON으로 구조화

[메타데이터 참고]
{metadata_hint}

[Critical Rules - 반드시 준수]

1. **산업 분류 (industry_domain)**
   - 회사의 실제 사업 분야로 분류 (공고 직무가 아님)
   - 예: 가구 철물 회사의 영업직 → "제조/가구", IT회사 경리 → "IT"
   - 분류: IT/소프트웨어, 금융, 제조, 유통/물류, 서비스, 의료/제약, 교육, 건설, 디자인, 미디어/광고

2. **마감일 (deadline)**
   - deadline_date: 반드시 YYYY-MM-DD 형식 (예: 2026-01-21)
   - 이미지에서 "마감일", "접수기간", "~까지" 등을 찾아 정확한 날짜 추출
   - 날짜가 없으면 null

3. **급여 (salary)**
   - "채용 보상금", "입사 축하금", "추천 보상금"은 급여가 아님 - 제외
   - 연봉/월급 정보만 기재, 없으면 "회사 내규에 따름"

4. **근무지 주소 (location.address)**
   - 우편번호 제외 (06105 같은 숫자 제외)
   - 도로명 주소만 기재 (예: "서울 강남구 연주로129길 13")
   - 지하철역 정보는 notes에 기재

5. **회사 소개 (company_info)**
   - 회사 소개/비전/미션 섹션에서 추출
   - 설립일, 직원 수, 업종, 사업 내용 등 포함
   - 없으면 null

6. **복리후생 (benefits)** - 반드시 포함
   - 이미지에서 "복리후생", "혜택", "지원" 섹션 찾아서 모두 추출
   - 예: 유연근무제, 재택근무, 식대, 복지카드, 건강검진, 자녀학자금, 경조휴가 등

7. **전형절차 (hiring_process)**
   - 서류전형 → 면접 → 최종합격 등 단계별로 배열

8. **주요업무 (key_responsibilities)**
   - 구체적으로 작성 (예: "영업지원 업무 전반", "수/발주 업무", "세금계산서 관리")

9. **자격요건과 우대사항 구분**
   - essential_qualifications: 필수 조건만
   - preferred_qualifications: 우대 사항만 (SAP 경험, 관련 자격증 등)

10. **수습기간**
   - probation_period 필드에 기재 (예: "3개월")

[Output JSON Schema]
{{
  "meta": {{
    "url": "{url}",
    "captured_at": "{date}",
    "industry_domain": "회사의 실제 산업 분야"
  }},
  "company_info": {{
    "name": "회사명 (주식회사, ㈜ 등 포함)",
    "description": "회사 소개 내용 또는 null",
    "established": "설립일 또는 null",
    "employee_count": "직원 수 또는 null",
    "business_type": "업종 또는 null"
  }},
  "timeline": {{
    "deadline_date": "YYYY-MM-DD 또는 null",
    "deadline_text": "마감일 원본 텍스트"
  }},
  "job_summary": {{
    "company": "회사명 (주식회사, ㈜ 등 포함)",
    "title": "공고 제목",
    "employment_type": "정규직/계약직/인턴/아르바이트/프리랜서",
    "probation_period": "수습기간 (없으면 null)",
    "experience_required": "경력 요구사항 (예: 2년 이상, 신입)"
  }},
  "analysis": {{
    "key_responsibilities": ["구체적인 업무 내용 1", "업무 2", "업무 3"],
    "essential_qualifications": ["필수 자격요건"],
    "preferred_qualifications": ["우대 사항"],
    "core_competencies": ["필요 역량 (Soft Skills)"],
    "tools_and_knowledge": ["필요 기술/도구 (Hard Skills)"],
    "hiring_process": ["서류전형", "1차면접", "2차면접", "최종합격"],
    "working_conditions": {{
      "salary": "급여 정보 (보상금 제외)",
      "location": {{
        "address": "도로명 주소 (우편번호 제외)",
        "notes": "교통편, 추가 위치 정보"
      }},
      "schedule": {{
        "work_hours": "근무 시간",
        "work_days": "근무 요일",
        "notes": "유연근무제, 교대근무 여부 등"
      }}
    }},
    "benefits": ["복리후생 항목 1", "항목 2", "항목 3"]
  }}
}}

[Important] 이미지에 있는 모든 정보를 빠짐없이 추출하세요. 특히 회사 소개, 복리후생, 전형절차, 마감일을 놓치지 마세요.
"""

def get_metadata_hint(metadata):
    """메타데이터를 프롬프트용 텍스트로 변환"""
    if not metadata:
        return "메타데이터 없음"
    
    hints = []
    if metadata.get('company'):
        hints.append(f"회사명: {metadata['company']}")
    if metadata.get('title'):
        hints.append(f"공고제목: {metadata['title']}")
    if metadata.get('salary'):
        hints.append(f"급여정보: {metadata['salary']}")
    if metadata.get('location'):
        hints.append(f"근무지: {metadata['location']}")
    if metadata.get('deadline'):
        hints.append(f"마감일: {metadata['deadline']}")
    if metadata.get('company_description'):
        hints.append(f"회사소개: {metadata['company_description']}")
    if metadata.get('employee_count'):
        hints.append(f"직원수: {metadata['employee_count']}")
    
    return "\n".join(hints) if hints else "메타데이터 없음"

def get_analysis_prompt(url, date, metadata):
    """분석용 프롬프트 생성"""
    metadata_hint = get_metadata_hint(metadata)
    return ANALYSIS_PROMPT_TEMPLATE.format(
        url=url,
        date=date,
        metadata_hint=metadata_hint
    )
