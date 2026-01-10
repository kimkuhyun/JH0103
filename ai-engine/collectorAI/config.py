"""
CareerOS Collector AI - 설정 및 프롬프트
"""

# 이미지 처리 설정
IMAGE_CONFIG = {
    "MAX_WIDTH": 800,
    "QUALITY": 75,
    "FORMAT": "JPEG",
    "MAX_CAPTURES": 5
}

# 모델 설정
MODEL_CONFIG = {
    "MODEL_NAME": "qwen2.5vl:3b",
    "NUM_CTX": 8192,
    "TEMPERATURE": 0,
    "TIMEOUT": 120
}

# 채용공고 분석 프롬프트
ANALYSIS_PROMPT_TEMPLATE = """
당신은 채용공고 전문 분석가입니다. 이미지에서 채용공고의 모든 정보를 빠짐없이 추출하여 JSON으로 구조화하세요.

[참고 메타데이터]
{metadata_hint}

[필수 규칙]
1. 이미지에 보이는 모든 텍스트를 정확히 읽어서 추출하세요
2. 회사명, 공고제목, 급여, 근무지, 마감일, 자격요건, 복리후생 등 모든 정보 추출
3. 추출할 수 없는 정보는 null로 표시
4. 채용보상금/입사축하금은 급여가 아님 (제외)
5. 우편번호(5자리 숫자)는 주소에서 제외
6. 회사 소개 섹션이 있으면 반드시 추출

[JSON 스키마]
{{
  "meta": {{
    "url": "{url}",
    "captured_at": "{date}",
    "industry_domain": "IT/소프트웨어|금융|제조|유통|의료|교육|건설|미디어|서비스 중 선택"
  }},
  "company_info": {{
    "name": "회사명 (주식회사, ㈜ 포함)",
    "description": "회사 소개 내용 또는 null",
    "established": "설립일 또는 null",
    "employee_count": "직원 수 또는 null",
    "business_type": "업종 또는 null"
  }},
  "timeline": {{
    "deadline_date": "YYYY-MM-DD 형식 또는 null",
    "deadline_text": "마감일 원문"
  }},
  "job_summary": {{
    "company": "회사명",
    "title": "공고 제목",
    "employment_type": "정규직|계약직|인턴|파트타임|프리랜서",
    "probation_period": "수습기간 또는 null",
    "experience_required": "경력 요구사항 (예: 신입, 경력 2년 이상)"
  }},
  "analysis": {{
    "key_responsibilities": ["주요업무 1", "주요업무 2"],
    "essential_qualifications": ["필수 자격요건 1", "필수 자격요건 2"],
    "preferred_qualifications": ["우대사항 1", "우대사항 2"],
    "core_competencies": ["핵심역량 1", "핵심역량 2"],
    "tools_and_knowledge": ["필요 기술/도구 1", "필요 기술/도구 2"],
    "hiring_process": ["서류전형", "면접", "최종합격"],
    "working_conditions": {{
      "salary": "급여 정보 (보상금 제외)",
      "location": {{
        "address": "도로명 주소 (우편번호 제외)",
        "notes": "교통편 등 추가 정보"
      }},
      "schedule": {{
        "work_hours": "근무 시간",
        "work_days": "근무 요일",
        "notes": "유연근무제 등"
      }}
    }},
    "benefits": ["복리후생 1", "복리후생 2"]
  }}
}}

중요: 이미지의 모든 텍스트를 정확히 읽고 해당하는 필드에 배치하세요. 특히 회사 소개, 복리후생, 자격요건, 마감일을 놓치지 마세요.
"""

def get_metadata_hint(metadata):
    """메타데이터를 프롬프트용 텍스트로 변환"""
    if not metadata:
        return "메타데이터 없음"
    
    hints = []
    for key in ['company', 'title', 'salary', 'location', 'deadline', 'company_description', 'employee_count']:
        if metadata.get(key):
            hints.append(f"{key}: {metadata[key]}")
    
    return "\n".join(hints) if hints else "메타데이터 없음"

def get_analysis_prompt(url, date, metadata):
    """분석용 프롬프트 생성"""
    metadata_hint = get_metadata_hint(metadata)
    return ANALYSIS_PROMPT_TEMPLATE.format(
        url=url,
        date=date,
        metadata_hint=metadata_hint
    )
