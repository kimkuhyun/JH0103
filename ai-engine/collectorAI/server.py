import os
import json
import base64
import io
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime
from PIL import Image
import time

app = Flask(__name__)
CORS(app)

SAVE_DIR = "/app/data"
if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)

OLLAMA_URL = "http://host.docker.internal:11434/api/generate"

def resize_image(base64_str, max_size=800):
    """이미지 최적화 및 리사이징"""
    try:
        img_data = base64.b64decode(base64_str)
        img = Image.open(io.BytesIO(img_data))
        
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        img.thumbnail((max_size, max_size))
        
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        print(f"이미지 리사이징 실패: {e}")
        return base64_str

def extract_metadata_text(metadata):
    """메타데이터에서 텍스트 정보 추출"""
    if not metadata:
        return ""
    
    parts = []
    if metadata.get('company'):
        parts.append(f"회사: {metadata['company']}")
    if metadata.get('title'):
        parts.append(f"공고제목: {metadata['title']}")
    if metadata.get('salary'):
        parts.append(f"급여: {metadata['salary']}")
    if metadata.get('location'):
        parts.append(f"근무지: {metadata['location']}")
    if metadata.get('deadline'):
        parts.append(f"마감: {metadata['deadline']}")
    
    return "\n".join(parts)

def analyze_single_image(image, image_index, total_images, base_prompt):
    """단일 이미지 분석 (순차 처리)"""
    
    position_hint = ""
    if image_index == 0:
        position_hint = "이 이미지는 공고의 상단부입니다. 회사명, 공고제목, 고용형태, 경력요건 등 기본정보에 집중하세요."
    elif image_index == total_images - 1:
        position_hint = "이 이미지는 공고의 하단부입니다. 복리후생, 전형절차, 접수방법, 마감일 등에 집중하세요."
    else:
        position_hint = f"이 이미지는 공고의 중간부({image_index+1}/{total_images})입니다. 주요업무, 자격요건, 우대사항, 근무조건 등에 집중하세요."
    
    extraction_prompt = f"""
[Task] 채용공고 이미지에서 정보 추출 ({image_index+1}/{total_images}번째 이미지)

{position_hint}

[Rules]
- 이 이미지에서 보이는 정보만 추출
- 없는 정보는 null로 표시
- 우편번호(5자리 숫자)는 주소에서 제외
- 채용보상금/입사축하금은 급여가 아님

[Output JSON]
{{
  "company": "회사명 또는 null",
  "title": "공고제목 또는 null",
  "employment_type": "고용형태 또는 null",
  "experience": "경력요건 또는 null",
  "probation": "수습기간 또는 null",
  "deadline_date": "YYYY-MM-DD 또는 null",
  "deadline_text": "마감일 원문 또는 null",
  "salary": "급여정보 또는 null",
  "address": "근무지 주소 (우편번호 제외) 또는 null",
  "location_notes": "교통편 등 또는 null",
  "work_hours": "근무시간 또는 null",
  "work_days": "근무요일 또는 null",
  "responsibilities": ["주요업무 목록"],
  "essential_qualifications": ["필수자격 목록"],
  "preferred_qualifications": ["우대사항 목록"],
  "skills": ["필요기술/도구 목록"],
  "benefits": ["복리후생 목록"],
  "hiring_process": ["전형절차 목록"]
}}
"""
    
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": "qwen2.5vl:3b",
            "prompt": extraction_prompt,
            "images": [image],
            "format": "json",
            "stream": False,
            "options": {
                "num_ctx": 4096,
                "temperature": 0
            }
        }, timeout=120)
        
        if response.status_code != 200:
            print(f"[Server] 이미지 {image_index+1} 분석 실패: {response.status_code}")
            return None
        
        result = response.json()
        clean_json = result['response'].replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
        
    except Exception as e:
        print(f"[Server] 이미지 {image_index+1} 분석 오류: {e}")
        return None

def merge_results(partial_results, url, metadata):
    """부분 결과들을 병합하여 최종 JSON 생성"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    # 최종 결과 초기화
    merged = {
        "meta": {
            "url": url,
            "captured_at": today,
            "industry_domain": None
        },
        "timeline": {
            "deadline_date": None,
            "deadline_text": None
        },
        "job_summary": {
            "company": None,
            "title": None,
            "employment_type": None,
            "probation_period": None,
            "experience_required": None
        },
        "analysis": {
            "key_responsibilities": [],
            "essential_qualifications": [],
            "preferred_qualifications": [],
            "core_competencies": [],
            "tools_and_knowledge": [],
            "hiring_process": [],
            "working_conditions": {
                "salary": None,
                "location": {
                    "address": None,
                    "notes": None
                },
                "schedule": {
                    "work_hours": None,
                    "work_days": None,
                    "notes": None
                }
            },
            "benefits": []
        }
    }
    
    # 각 부분 결과에서 정보 병합
    for pr in partial_results:
        if not pr:
            continue
        
        # 단일 값 필드 (첫 번째 유효값 사용)
        if not merged["job_summary"]["company"] and pr.get("company"):
            merged["job_summary"]["company"] = pr["company"]
        if not merged["job_summary"]["title"] and pr.get("title"):
            merged["job_summary"]["title"] = pr["title"]
        if not merged["job_summary"]["employment_type"] and pr.get("employment_type"):
            merged["job_summary"]["employment_type"] = pr["employment_type"]
        if not merged["job_summary"]["experience_required"] and pr.get("experience"):
            merged["job_summary"]["experience_required"] = pr["experience"]
        if not merged["job_summary"]["probation_period"] and pr.get("probation"):
            merged["job_summary"]["probation_period"] = pr["probation"]
        
        if not merged["timeline"]["deadline_date"] and pr.get("deadline_date"):
            merged["timeline"]["deadline_date"] = pr["deadline_date"]
        if not merged["timeline"]["deadline_text"] and pr.get("deadline_text"):
            merged["timeline"]["deadline_text"] = pr["deadline_text"]
        
        if not merged["analysis"]["working_conditions"]["salary"] and pr.get("salary"):
            merged["analysis"]["working_conditions"]["salary"] = pr["salary"]
        if not merged["analysis"]["working_conditions"]["location"]["address"] and pr.get("address"):
            merged["analysis"]["working_conditions"]["location"]["address"] = pr["address"]
        if not merged["analysis"]["working_conditions"]["location"]["notes"] and pr.get("location_notes"):
            merged["analysis"]["working_conditions"]["location"]["notes"] = pr["location_notes"]
        if not merged["analysis"]["working_conditions"]["schedule"]["work_hours"] and pr.get("work_hours"):
            merged["analysis"]["working_conditions"]["schedule"]["work_hours"] = pr["work_hours"]
        if not merged["analysis"]["working_conditions"]["schedule"]["work_days"] and pr.get("work_days"):
            merged["analysis"]["working_conditions"]["schedule"]["work_days"] = pr["work_days"]
        
        # 리스트 필드 (중복 제거하며 합침)
        for item in pr.get("responsibilities", []):
            if item and item not in merged["analysis"]["key_responsibilities"]:
                merged["analysis"]["key_responsibilities"].append(item)
        for item in pr.get("essential_qualifications", []):
            if item and item not in merged["analysis"]["essential_qualifications"]:
                merged["analysis"]["essential_qualifications"].append(item)
        for item in pr.get("preferred_qualifications", []):
            if item and item not in merged["analysis"]["preferred_qualifications"]:
                merged["analysis"]["preferred_qualifications"].append(item)
        for item in pr.get("skills", []):
            if item and item not in merged["analysis"]["tools_and_knowledge"]:
                merged["analysis"]["tools_and_knowledge"].append(item)
        for item in pr.get("benefits", []):
            if item and item not in merged["analysis"]["benefits"]:
                merged["analysis"]["benefits"].append(item)
        for item in pr.get("hiring_process", []):
            if item and item not in merged["analysis"]["hiring_process"]:
                merged["analysis"]["hiring_process"].append(item)
    
    # 메타데이터로 누락 정보 보완
    if metadata:
        if not merged["job_summary"]["company"] and metadata.get("company"):
            merged["job_summary"]["company"] = metadata["company"]
        if not merged["job_summary"]["title"] and metadata.get("title"):
            merged["job_summary"]["title"] = metadata["title"]
    
    # 산업 분류 추론 (회사명/공고제목 기반)
    merged["meta"]["industry_domain"] = infer_industry(merged)
    
    # 급여 기본값
    if not merged["analysis"]["working_conditions"]["salary"]:
        merged["analysis"]["working_conditions"]["salary"] = "회사 내규에 따름"
    
    return merged

def infer_industry(data):
    """회사명/공고제목으로 산업 분류 추론"""
    company = (data.get("job_summary", {}).get("company") or "").lower()
    title = (data.get("job_summary", {}).get("title") or "").lower()
    combined = company + " " + title
    
    # 키워드 기반 분류
    if any(kw in combined for kw in ["소프트웨어", "it", "개발", "테크", "시스템", "데이터"]):
        return "IT/소프트웨어"
    elif any(kw in combined for kw in ["은행", "금융", "증권", "보험", "투자"]):
        return "금융"
    elif any(kw in combined for kw in ["제조", "공장", "생산", "철물", "가구", "부품"]):
        return "제조"
    elif any(kw in combined for kw in ["유통", "물류", "배송", "쇼핑", "마트"]):
        return "유통/물류"
    elif any(kw in combined for kw in ["병원", "의료", "제약", "바이오", "헬스"]):
        return "의료/제약"
    elif any(kw in combined for kw in ["학교", "교육", "학원", "강사"]):
        return "교육"
    elif any(kw in combined for kw in ["건설", "건축", "시공", "토목"]):
        return "건설"
    elif any(kw in combined for kw in ["디자인", "광고", "마케팅", "미디어"]):
        return "미디어/광고"
    else:
        return "서비스"

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/analyze', methods=['POST'])
def analyze():
    print("[Server] 데이터 수신! 분석 준비 중...")
    data = request.json
    
    raw_images = data.get('images', [])
    metadata = data.get('metadata', {})
    url = data.get('url', '')
    
    print(f"[Server] 이미지 {len(raw_images)}장 수신")
    
    if metadata:
        meta_text = extract_metadata_text(metadata)
        print(f"[Server] 메타데이터:\n{meta_text}")
    
    # 이미지 최적화
    optimized_images = [resize_image(img) for img in raw_images]
    print(f"[Server] 이미지 최적화 완료")
    
    # 순차 처리: 각 이미지를 개별 분석
    partial_results = []
    for i, img in enumerate(optimized_images):
        print(f"[Server] 이미지 {i+1}/{len(optimized_images)} 분석 중...")
        result = analyze_single_image(img, i, len(optimized_images), data.get('prompt', ''))
        partial_results.append(result)
        
        # GPU 메모리 안정화를 위한 짧은 대기
        if i < len(optimized_images) - 1:
            time.sleep(1)
    
    print(f"[Server] 전체 분석 완료, 결과 병합 중...")
    
    # 결과 병합
    try:
        job_data = merge_results(partial_results, url, metadata)
    except Exception as e:
        print(f"[Server] 병합 오류: {e}")
        return jsonify({"status": "error", "message": "결과 병합 실패"}), 500
    
    # 파일 저장
    company = job_data.get('job_summary', {}).get('company', 'Unknown')
    title = job_data.get('job_summary', {}).get('title', 'Job')
    safe_name = "".join([c if c.isalnum() or c in (' ', '_', '-') else '_' for c in f"{company}_{title}"])
    filename = f"{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    filepath = os.path.join(SAVE_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(job_data, f, ensure_ascii=False, indent=2)
    
    print(f"[Server] 저장 완료: {filename}")
    return jsonify({"status": "success", "file": filename, "data": job_data})

if __name__ == '__main__':
    print("[Server] CareerOS Collector AI 서버 시작")
    print(f"[Server] 데이터 저장 경로: {SAVE_DIR}")
    print("[Server] 순차 처리 모드 활성화 (GPU 메모리 안정화)")
    app.run(host='0.0.0.0', port=5000, debug=False)
