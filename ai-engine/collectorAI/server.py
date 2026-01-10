import os
import json
import base64
import io
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime
from PIL import Image
from config import (
    IMAGE_CONFIG, 
    MODEL_CONFIG, 
    get_analysis_prompt
)

app = Flask(__name__)
CORS(app)

SAVE_DIR = "/app/data"
if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)

OLLAMA_URL = "http://host.docker.internal:11434/api/generate"

def merge_images_vertically(base64_images):
    """
    여러 이미지를 세로로 이어붙여 하나의 긴 이미지로 병합
    이것이 핵심 개선 사항입니다!
    """
    if not base64_images:
        return None
    
    if len(base64_images) == 1:
        # 단일 이미지는 최적화만
        return resize_image(base64_images[0])
    
    try:
        images = []
        max_width = 0
        
        # 모든 이미지 로드 및 최대 너비 찾기
        for b64_str in base64_images:
            img_data = base64.b64decode(b64_str)
            img = Image.open(io.BytesIO(img_data))
            
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            images.append(img)
            max_width = max(max_width, img.width)
        
        # 너비를 설정된 최대값으로 제한
        target_width = min(max_width, IMAGE_CONFIG["MAX_WIDTH"])
        
        # 모든 이미지를 동일 너비로 리사이즈
        resized_images = []
        total_height = 0
        
        for img in images:
            # 비율 유지하며 너비 맞추기
            ratio = target_width / img.width
            new_height = int(img.height * ratio)
            
            resized = img.resize((target_width, new_height), Image.Resampling.LANCZOS)
            resized_images.append(resized)
            total_height += new_height
        
        # 새 캔버스 생성 (세로로 이어붙이기)
        merged_image = Image.new('RGB', (target_width, total_height), (255, 255, 255))
        
        # 이미지들을 세로로 배치
        current_y = 0
        for img in resized_images:
            merged_image.paste(img, (0, current_y))
            current_y += img.height
        
        # Base64로 인코딩
        buffer = io.BytesIO()
        merged_image.save(
            buffer, 
            format=IMAGE_CONFIG["FORMAT"], 
            quality=IMAGE_CONFIG["QUALITY"]
        )
        
        merged_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        print(f"[Server] 이미지 병합 완료: {len(base64_images)}개 → 1개 (크기: {target_width}x{total_height})")
        
        return merged_base64
        
    except Exception as e:
        print(f"[Server] 이미지 병합 실패: {e}")
        # 실패시 첫 번째 이미지만 반환
        return resize_image(base64_images[0])

def resize_image(base64_str):
    """이미지 최적화"""
    try:
        img_data = base64.b64decode(base64_str)
        img = Image.open(io.BytesIO(img_data))
        
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # 너비 기준 리사이징
        if img.width > IMAGE_CONFIG["MAX_WIDTH"]:
            ratio = IMAGE_CONFIG["MAX_WIDTH"] / img.width
            new_height = int(img.height * ratio)
            img = img.resize((IMAGE_CONFIG["MAX_WIDTH"], new_height), Image.Resampling.LANCZOS)
        
        buffer = io.BytesIO()
        img.save(buffer, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        print(f"[Server] 이미지 리사이징 실패: {e}")
        return base64_str

def analyze_with_vision_model(image_base64, prompt):
    """병합된 이미지로 단일 분석"""
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL_CONFIG["MODEL_NAME"],
            "prompt": prompt,
            "images": [image_base64],
            "format": "json",
            "stream": False,
            "options": {
                "num_ctx": MODEL_CONFIG["NUM_CTX"],
                "temperature": MODEL_CONFIG["TEMPERATURE"]
            }
        }, timeout=180)
        
        if response.status_code != 200:
            print(f"[Server] 분석 실패: {response.status_code}")
            return None
        
        result = response.json()
        clean_json = result['response'].replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
        
    except Exception as e:
        print(f"[Server] 분석 오류: {e}")
        return None

def infer_industry(data):
    """회사명/공고제목으로 산업 분류"""
    company_info = data.get("company_info", {})
    job_summary = data.get("job_summary", {})
    
    company = (company_info.get("name") or job_summary.get("company") or "").lower()
    title = (job_summary.get("title") or "").lower()
    combined = company + " " + title
    
    keywords_map = {
        "IT/소프트웨어": ["소프트웨어", "it", "개발", "테크", "시스템", "데이터", "앱", "웹"],
        "금융": ["은행", "금융", "증권", "보험", "투자", "자산운용"],
        "제조": ["제조", "공장", "생산", "철물", "가구", "부품", "기계"],
        "유통/물류": ["유통", "물류", "배송", "쇼핑", "마트", "운송"],
        "의료/제약": ["병원", "의료", "제약", "바이오", "헬스", "임상"],
        "교육": ["학교", "교육", "학원", "강사", "연수"],
        "건설": ["건설", "건축", "시공", "토목", "인테리어"],
        "미디어/광고": ["디자인", "광고", "마케팅", "미디어", "콘텐츠", "방송"],
    }
    
    for industry, keywords in keywords_map.items():
        if any(kw in combined for kw in keywords):
            return industry
    
    return "서비스"

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/analyze', methods=['POST'])
def analyze():
    print("[Server] 요청 수신 - 분석 시작")
    data = request.json
    
    raw_images = data.get('images', [])
    metadata = data.get('metadata', {})
    url = data.get('url', '')
    
    print(f"[Server] 이미지 수신: {len(raw_images)}개")
    
    if not raw_images:
        return jsonify({"status": "error", "message": "이미지가 없습니다"}), 400
    
    # 핵심: 이미지 병합
    print(f"[Server] 이미지 병합 시작...")
    merged_image = merge_images_vertically(raw_images)
    
    if not merged_image:
        return jsonify({"status": "error", "message": "이미지 병합 실패"}), 500
    
    # 프롬프트 생성
    today = datetime.now().strftime("%Y-%m-%d")
    prompt = get_analysis_prompt(url, today, metadata)
    
    # 단일 분석
    print(f"[Server] AI 분석 중...")
    job_data = analyze_with_vision_model(merged_image, prompt)
    
    if not job_data:
        return jsonify({"status": "error", "message": "AI 분석 실패"}), 500
    
    # 산업 분류 추론
    if not job_data.get("meta", {}).get("industry_domain"):
        if "meta" not in job_data:
            job_data["meta"] = {}
        job_data["meta"]["industry_domain"] = infer_industry(job_data)
    
    # 급여 기본값
    if "analysis" in job_data and "working_conditions" in job_data["analysis"]:
        if not job_data["analysis"]["working_conditions"].get("salary"):
            job_data["analysis"]["working_conditions"]["salary"] = "회사 내규에 따름"
    
    # 파일 저장
    company = job_data.get('company_info', {}).get('name') or \
              job_data.get('job_summary', {}).get('company', 'Unknown')
    title = job_data.get('job_summary', {}).get('title', 'Job')
    safe_name = "".join([c if c.isalnum() or c in (' ', '_', '-') else '_' 
                         for c in f"{company}_{title}"])
    filename = f"{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    filepath = os.path.join(SAVE_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(job_data, f, ensure_ascii=False, indent=2)
    
    print(f"[Server] 분석 완료 및 저장: {filename}")
    return jsonify({"status": "success", "file": filename, "data": job_data})

if __name__ == '__main__':
    print("[Server] CareerOS Collector AI 서버 시작")
    print(f"[Server] 데이터 저장 경로: {SAVE_DIR}")
    print("[Server] 이미지 병합 모드 활성화 (단일 이미지 분석)")
    app.run(host='0.0.0.0', port=5000, debug=False)
