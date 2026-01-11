# ai-engine/collectorAI/config.py

"""
CareerOS Collector AI - 설정 및 프롬프트
"""

# 이미지 처리 설정
IMAGE_CONFIG = {
    "MAX_WIDTH": 1000,      # AI 처리를 위한 이미지 최대 너비 리사이징
    "QUALITY": 80,          # JPEG 품질
    "FORMAT": "JPEG"
}

# 모델 설정
MODEL_CONFIG = {
    "MODEL_NAME": "qwen2.5vl", # 또는 사용 중인 모델명
    "NUM_CTX": 6000,        # 컨텍스트 윈도우 (이미지+텍스트 고려)
    "NUM_BATCH": 256,
    "TEMPERATURE": 0,       # 정확도 우선
    "TIMEOUT": 120          # 타임아웃 넉넉하게 설정
}

# 채용공고 분석 프롬프트
ANALYSIS_PROMPT_TEMPLATE = """
당신은 채용공고 전문 분석가입니다. 제공된 [이미지]와 [추출된 텍스트]를 바탕으로 채용공고의 핵심 정보를 JSON으로 추출하세요.

[분석 지침]
1. **가장 중요:** 아래 제공되는 [추출된 텍스트] 내용을 최우선으로 신뢰하세요. 이미지는 구조를 파악하는 용도로 참고하세요.
2. 회사명, 공고제목, 마감일, 근무지, 상세요강(자격요건, 우대사항)을 정확히 찾으세요.
3. 연봉 정보가 명확하지 않으면 "면접 후 결정" 등으로 표기하세요.
4. '채용 시 마감'인 경우 마감일을 null로 설정하세요.

[JSON 스키마]
{{
  "meta": {{
    "url": "{url}",
    "captured_at": "{date}",
    "industry_domain": "IT/소프트웨어|금융|제조|유통|의료|교육|건설|미디어|서비스 중 선택"
  }},
  "company_info": {{
    "name": "회사명",
    "description": "회사 소개 (텍스트에 있으면 추출)",
    "employee_count": "직원 수 (있으면 추출)",
    "business_type": "업종"
  }},
  "timeline": {{
    "deadline_date": "YYYY-MM-DD 또는 null",
    "deadline_text": "마감일 원문 (예: 2024년 5월 30일, 채용시까지)"
  }},
  "job_summary": {{
    "title": "공고 제목",
    "employment_type": "정규직|계약직|인턴|파트타임",
    "experience_required": "경력 요건 (예: 신입, 경력 3년 이상)"
  }},
  "analysis": {{
    "key_responsibilities": ["주요업무1", "주요업무2"],
    "essential_qualifications": ["자격요건1", "자격요건2"],
    "preferred_qualifications": ["우대사항1", "우대사항2"],
    "tech_stack": ["기술스택1", "기술스택2"],
    "hiring_process": ["전형절차1", "전형절차2"],
    "working_conditions": {{
      "salary": "급여 정보",
      "location": "근무지 주소"
    }},
    "benefits": ["복리후생1", "복리후생2"]
  }}
}}

[추출된 텍스트 데이터]
{raw_text_hint}
"""

def get_analysis_prompt(url, date, metadata):
    """분석용 프롬프트 생성"""
    # 텍스트 데이터가 너무 길면 잘라서 넣음 (토큰 제한 방지)
    raw_text = metadata.get('raw_text', '텍스트 데이터 없음')
    if len(raw_text) > 6000:
        raw_text = raw_text[:6000] + "...(생략)"
        
    return ANALYSIS_PROMPT_TEMPLATE.format(
        url=url,
        date=date,
        raw_text_hint=raw_text
    )