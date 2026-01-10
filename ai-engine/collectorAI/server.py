import os
import json
import base64
import io
import threading
import queue
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime
from PIL import Image
from config import IMAGE_CONFIG, MODEL_CONFIG, get_analysis_prompt

app = Flask(__name__)
CORS(app)

SAVE_DIR = "/app/data"
IMAGE_DIR = "/app/data/images"
if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)
if not os.path.exists(IMAGE_DIR):
    os.makedirs(IMAGE_DIR)

OLLAMA_URL = "http://host.docker.internal:11434/api/generate"

job_queue = queue.Queue()
job_results = {}
job_lock = threading.Lock()

def merge_images_vertically(base64_images, save_path=None):
    """여러 이미지를 세로로 병합"""
    if not base64_images:
        return None
    
    if len(base64_images) == 1:
        img = resize_image(base64_images[0])
        if save_path:
            save_image(img, save_path)
        return img
    
    if len(base64_images) > IMAGE_CONFIG["MAX_CAPTURES"]:
        base64_images = base64_images[:IMAGE_CONFIG["MAX_CAPTURES"]]
        print(f"[서버] {IMAGE_CONFIG['MAX_CAPTURES']}장으로 제한")
    
    try:
        images = []
        max_width = 0
        
        for b64_str in base64_images:
            img_data = base64.b64decode(b64_str)
            img = Image.open(io.BytesIO(img_data))
            
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            images.append(img)
            max_width = max(max_width, img.width)
        
        target_width = min(max_width, IMAGE_CONFIG["MAX_WIDTH"])
        
        resized_images = []
        total_height = 0
        
        for img in images:
            ratio = target_width / img.width
            new_height = int(img.height * ratio)
            
            resized = img.resize((target_width, new_height), Image.Resampling.LANCZOS)
            resized_images.append(resized)
            total_height += new_height
        
        merged_image = Image.new('RGB', (target_width, total_height), (255, 255, 255))
        
        current_y = 0
        for img in resized_images:
            merged_image.paste(img, (0, current_y))
            current_y += img.height
        
        buffer = io.BytesIO()
        merged_image.save(
            buffer, 
            format=IMAGE_CONFIG["FORMAT"], 
            quality=IMAGE_CONFIG["QUALITY"]
        )
        
        merged_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # 이미지 저장
        if save_path:
            merged_image.save(save_path, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
            print(f"[서버] 이미지 저장: {save_path}")
        
        print(f"[서버] {len(base64_images)}장 병합 완료: {target_width}x{total_height}px")
        
        return merged_base64
        
    except Exception as e:
        print(f"[서버] 병합 실패: {e}")
        return resize_image(base64_images[0])

def save_image(base64_str, filepath):
    """Base64 이미지를 파일로 저장"""
    try:
        img_data = base64.b64decode(base64_str)
        img = Image.open(io.BytesIO(img_data))
        img.save(filepath, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
    except Exception as e:
        print(f"[서버] 이미지 저장 실패: {e}")

def resize_image(base64_str):
    """단일 이미지 리사이징"""
    try:
        img_data = base64.b64decode(base64_str)
        img = Image.open(io.BytesIO(img_data))
        
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        if img.width > IMAGE_CONFIG["MAX_WIDTH"]:
            ratio = IMAGE_CONFIG["MAX_WIDTH"] / img.width
            new_height = int(img.height * ratio)
            img = img.resize((IMAGE_CONFIG["MAX_WIDTH"], new_height), Image.Resampling.LANCZOS)
        
        buffer = io.BytesIO()
        img.save(buffer, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        print(f"[서버] 리사이징 실패: {e}")
        return base64_str

def analyze_with_vision_model(image_base64, prompt):
    """비전 모델로 분석"""
    try:
        print(f"[서버] Ollama 요청 시작 (타임아웃: {MODEL_CONFIG['TIMEOUT']}초)")
        
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
        }, timeout=MODEL_CONFIG["TIMEOUT"])
        
        if response.status_code != 200:
            print(f"[서버] 분석 실패: HTTP {response.status_code}")
            return None
        
        result = response.json()
        print(f"[서버] Ollama 응답 수신")
        
        clean_json = result['response'].replace("```json", "").replace("```", "").strip()
        
        parsed = json.loads(clean_json)
        print(f"[서버] JSON 파싱 성공")
        
        return parsed
        
    except requests.Timeout:
        print(f"[서버] 타임아웃 ({MODEL_CONFIG['TIMEOUT']}초 초과)")
        return None
    except Exception as e:
        print(f"[서버] 분석 오류: {e}")
        return None

def infer_industry(data):
    """산업 분류 추론"""
    company_info = data.get("company_info", {})
    job_summary = data.get("job_summary", {})
    
    company = (company_info.get("name") or job_summary.get("company") or "").lower()
    title = (job_summary.get("title") or "").lower()
    combined = company + " " + title
    
    keywords_map = {
        "IT/소프트웨어": ["소프트웨어", "it", "개발", "테크", "시스템", "데이터", "앱", "웹"],
        "금융": ["은행", "금융", "증권", "보험", "투자"],
        "제조": ["제조", "공장", "생산", "하드웨어", "가구"],
        "유통": ["유통", "물류", "배송", "쇼핑", "마트"],
        "의료": ["병원", "의료", "제약", "바이오", "헬스"],
        "교육": ["학교", "교육", "학원", "강사"],
        "건설": ["건설", "건축", "토목"],
        "미디어": ["디자인", "광고", "마케팅", "미디어", "콘텐츠"],
    }
    
    for industry, keywords in keywords_map.items():
        if any(kw in combined for kw in keywords):
            return industry
    
    return "서비스"

def process_job(job_id, raw_images, metadata, url):
    """작업 처리 워커"""
    try:
        print(f"[워커 {job_id[:8]}] 분석 시작")
        
        if not raw_images:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "이미지 없음"}
            return
        
        # 파일명 생성
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        company_name = metadata.get('company', 'unknown').replace('/', '_')[:30]
        image_filename = f"{company_name}_{timestamp}.jpg"
        image_path = os.path.join(IMAGE_DIR, image_filename)
        
        # 이미지 병합 및 저장
        print(f"[워커 {job_id[:8]}] 이미지 병합 중 ({len(raw_images)}장)")
        merged_image = merge_images_vertically(raw_images, save_path=image_path)
        
        if not merged_image:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "병합 실패"}
            return
        
        # 프롬프트 생성
        today = datetime.now().strftime("%Y-%m-%d")
        prompt = get_analysis_prompt(url, today, metadata)
        
        # AI 분석
        print(f"[워커 {job_id[:8]}] AI 분석 시작")
        job_data = analyze_with_vision_model(merged_image, prompt)
        
        if not job_data:
            with job_lock:
                job_results[job_id] = {
                    "status": "error", 
                    "message": "분석 실패",
                    "image_saved": image_filename
                }
            return
        
        # 산업 분류
        if not job_data.get("meta", {}).get("industry_domain"):
            if "meta" not in job_data:
                job_data["meta"] = {}
            job_data["meta"]["industry_domain"] = infer_industry(job_data)
        
        # 급여 기본값
        if "analysis" in job_data and "working_conditions" in job_data["analysis"]:
            if not job_data["analysis"]["working_conditions"].get("salary"):
                job_data["analysis"]["working_conditions"]["salary"] = "회사 내규에 따름"
        
        # JSON 저장
        company = job_data.get('company_info', {}).get('name') or \
                  job_data.get('job_summary', {}).get('company', 'Unknown')
        title = job_data.get('job_summary', {}).get('title', 'Job')
        safe_name = "".join([c if c.isalnum() or c in (' ', '_', '-') else '_' 
                             for c in f"{company}_{title}"])
        json_filename = f"{safe_name}_{timestamp}.json"
        
        filepath = os.path.join(SAVE_DIR, json_filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(job_data, f, ensure_ascii=False, indent=2)
        
        with job_lock:
            job_results[job_id] = {
                "status": "success",
                "file": json_filename,
                "image": image_filename,
                "data": job_data
            }
        
        print(f"[워커 {job_id[:8]}] 완료: {json_filename}")
        
    except Exception as e:
        print(f"[워커 {job_id[:8]}] 오류: {e}")
        with job_lock:
            job_results[job_id] = {"status": "error", "message": str(e)}

def worker():
    """백그라운드 워커 스레드"""
    while True:
        try:
            job_id, raw_images, metadata, url = job_queue.get()
            process_job(job_id, raw_images, metadata, url)
            job_queue.task_done()
        except Exception as e:
            print(f"[워커] 치명적 오류: {e}")

worker_thread = threading.Thread(target=worker, daemon=True)
worker_thread.start()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/analyze', methods=['POST'])
def analyze():
    """작업 큐 등록"""
    data = request.json
    
    raw_images = data.get('images', [])
    metadata = data.get('metadata', {})
    url = data.get('url', '')
    
    if not raw_images:
        return jsonify({"status": "error", "message": "이미지 없음"}), 400
    
    job_id = str(uuid.uuid4())
    
    with job_lock:
        job_results[job_id] = {"status": "queued"}
    
    job_queue.put((job_id, raw_images, metadata, url))
    
    print(f"[서버] 작업 {job_id[:8]} 대기열 등록 ({len(raw_images)}장)")
    
    return jsonify({"status": "queued", "job_id": job_id})

@app.route('/status/<job_id>', methods=['GET'])
def get_status(job_id):
    """작업 상태 확인"""
    with job_lock:
        result = job_results.get(job_id)
    
    if not result:
        return jsonify({"status": "error", "message": "작업을 찾을 수 없음"}), 404
    
    return jsonify(result)

if __name__ == '__main__':
    print("[서버] CareerOS Collector AI 시작")
    print(f"[서버] 데이터 저장: {SAVE_DIR}")
    print(f"[서버] 이미지 저장: {IMAGE_DIR}")
    print("[서버] 비동기 큐 모드 활성화")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
