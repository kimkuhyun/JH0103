"""
CareerOS Collector AI - Configuration
"""

# Image Processing
IMAGE_CONFIG = {
    "MAX_WIDTH": 800,      # Reduced for faster processing
    "QUALITY": 75,         # Reduced for smaller file size
    "FORMAT": "JPEG",
    "MAX_CAPTURES": 5      # Hard limit
}

# Model Configuration
MODEL_CONFIG = {
    "MODEL_NAME": "qwen2.5vl:3b",
    "NUM_CTX": 8192,
    "TEMPERATURE": 0,
    "TIMEOUT": 120         # 2 minutes max
}

# Analysis Prompt
ANALYSIS_PROMPT_TEMPLATE = """
[Role] Job posting analyzer
[Task] Extract ALL information from this job posting image into structured JSON

[Reference Metadata]
{metadata_hint}

[Rules]
1. Industry classification based on company's actual business
2. Extract deadline in YYYY-MM-DD format
3. Exclude recruitment bonuses from salary
4. Company description, employee count if available
5. Extract ALL benefits listed
6. Distinguish required vs preferred qualifications

[Output JSON Schema]
{{
  "meta": {{
    "url": "{url}",
    "captured_at": "{date}",
    "industry_domain": "IT/Software|Finance|Manufacturing|Retail|Healthcare|Education|Construction|Media|Service"
  }},
  "company_info": {{
    "name": "Company name with legal form",
    "description": "Company description or null",
    "established": "Establishment date or null",
    "employee_count": "Number of employees or null",
    "business_type": "Business type or null"
  }},
  "timeline": {{
    "deadline_date": "YYYY-MM-DD or null",
    "deadline_text": "Original deadline text"
  }},
  "job_summary": {{
    "company": "Company name",
    "title": "Job title",
    "employment_type": "Full-time|Contract|Intern|Part-time|Freelance",
    "probation_period": "Probation period or null",
    "experience_required": "Experience requirement"
  }},
  "analysis": {{
    "key_responsibilities": ["Specific task 1", "Task 2"],
    "essential_qualifications": ["Required qualification 1"],
    "preferred_qualifications": ["Preferred item 1"],
    "core_competencies": ["Soft skill 1"],
    "tools_and_knowledge": ["Hard skill 1"],
    "hiring_process": ["Document review", "Interview", "Final"],
    "working_conditions": {{
      "salary": "Salary info",
      "location": {{
        "address": "Street address without postal code",
        "notes": "Transportation info"
      }},
      "schedule": {{
        "work_hours": "Working hours",
        "work_days": "Working days",
        "notes": "Flexible work etc"
      }}
    }},
    "benefits": ["Benefit 1", "Benefit 2"]
  }}
}}

Extract everything visible in the image. Do not miss company info, benefits, hiring process, or deadline.
"""

def get_metadata_hint(metadata):
    if not metadata:
        return "No metadata"
    
    hints = []
    for key in ['company', 'title', 'salary', 'location', 'deadline', 'company_description', 'employee_count']:
        if metadata.get(key):
            hints.append(f"{key}: {metadata[key]}")
    
    return "\n".join(hints) if hints else "No metadata"

def get_analysis_prompt(url, date, metadata):
    metadata_hint = get_metadata_hint(metadata)
    return ANALYSIS_PROMPT_TEMPLATE.format(
        url=url,
        date=date,
        metadata_hint=metadata_hint
    )
