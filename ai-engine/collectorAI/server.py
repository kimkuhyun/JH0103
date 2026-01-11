# ai-engine/collectorAI/server.py

import os
import json
import base64
import io
import threading
import queue
import uuid
import time
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime
from PIL import Image
from config import IMAGE_CONFIG, MODEL_CONFIG, get_analysis_prompt

app = Flask(__name__)
CORS(app)

# 디렉토리 설정
BASE_DIR = "/app/data"
IMAGE_DIR = os.path.join(BASE_DIR, "images")
JSON_DIR = os.path.join(BASE_DIR, "json")

for d in [BASE_DIR, IMAGE_DIR, JSON_DIR]:
    os.makedirs(d, exist_ok=True)

# Ollama 설정 (Docker 내부 통신용)
OLLAMA_URL = "http://host.docker.internal:11434/api/generate"

# 작업 큐
job_queue = queue.Queue()
job_results = {}
job_lock = threading.Lock()

def sanitize_filename(title, max_length=100):
    """파일명으로 사용할 수 있도록 문자열 정제"""
    # 특수문자 제거 (영문, 한글, 숫자, 공백, 하이픈, 언더스코어만 허용)
    safe_title = re.sub(r'[^\w\s-]', '', title, flags=re.UNICODE)
    # 연속된 공백을 하나로
    safe_title = re.sub(r'\s+', ' ', safe_title)
    # 앞뒤 공백 제거 및 길이 제한
    safe_title = safe_title.strip()[:max_length]
    return safe_title if safe_title else 'unknown_job'

def optimize_image(base64_str):
    """이미지 리사이징 및 최적화 (AI 메모리 폭발 방지)"""
    try:
        # Base64 디코딩
        img_data = base64.b64decode(base64_str)
        img = Image.open(io.BytesIO(img_data))
        
        # RGB 변환
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # 리사이징 (가로 폭 제한)
        max_w = IMAGE_CONFIG["MAX_WIDTH"]
        if img.width > max_w:
            ratio = max_w / img.width
            new_h = int(img.height * ratio)
            # 세로 길이가 너무 길면(예: 8000px 이상) 잘라낼 수도 있지만, 
            # 현재는 전체 내용을 유지하기 위해 리사이즈만 수행
            img = img.resize((max_w, new_h), Image.Resampling.LANCZOS)
            
        # 다시 Base64로 변환
        buf = io.BytesIO()
        img.save(buf, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
        return base64.b64encode(buf.getvalue()).decode('utf-8')
        
    except Exception as e:
        print(f"[서버] 이미지 처리 실패: {e}")
        return base64_str # 실패 시 원본 반환

def analyze_with_ollama(image_b64, prompt):
    """Ollama API 호출"""
    payload = {
        "model": MODEL_CONFIG["MODEL_NAME"],
        "prompt": prompt,
        "images": [image_b64],
        "format": "json",
        "stream": False,
        "options": {
            "num_ctx": MODEL_CONFIG["NUM_CTX"],
            "num_batch": MODEL_CONFIG["NUM_BATCH"],
            "temperature": MODEL_CONFIG["TEMPERATURE"]
        }
    }
    
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=MODEL_CONFIG["TIMEOUT"])
        response.raise_for_status()
        
        result = response.json()
        # JSON 문자열 파싱
        return json.loads(result['response'])
        
    except Exception as e:
        print(f"[Ollama Error] {e}")
        return None

def worker():
    """백그라운드 작업 처리 워커"""
    print("[워커] 시작됨...")
    while True:
        try:
            job_id, image_data, url, metadata = job_queue.get()
            
            print(f"[워커] 작업 시작: {job_id}")
            
            # 1. 이미지 최적화
            optimized_img = optimize_image(image_data)
            
            # 2. 프롬프트 생성
            today = datetime.now().strftime("%Y-%m-%d")
            prompt = get_analysis_prompt(url, today, metadata)
            
            # 3. AI 분석 요청
            result_json = analyze_with_ollama(optimized_img, prompt)
            
            # 4. 결과 저장 및 상태 업데이트
            if result_json:
                # 공고 타이틀로 파일명 생성
                title = result_json.get('job_summary', {}).get('title', f'result_{job_id}')
                safe_title = sanitize_filename(title)
                filename = f"{safe_title}.json"
                
                # 파일명 중복 방지
                filepath = os.path.join(JSON_DIR, filename)
                counter = 1
                while os.path.exists(filepath):
                    filename = f"{safe_title}_{counter}.json"
                    filepath = os.path.join(JSON_DIR, filename)
                    counter += 1
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(result_json, f, ensure_ascii=False, indent=2)
                    
                with job_lock:
                    job_results[job_id] = {
                        "status": "success",
                        "data": result_json
                    }
                print(f"[워커] 작업 성공: {job_id} -> {filename}")
            else:
                with job_lock:
                    job_results[job_id] = {
                        "status": "error",
                        "message": "AI 분석 실패 (응답 없음)"
                    }
                print(f"[워커] 작업 실패: {job_id}")

            job_queue.task_done()
            
        except Exception as e:
            print(f"[워커] 예외 발생: {e}")
            with job_lock:
                job_results[job_id] = {"status": "error", "message": str(e)}

# 워커 스레드 시작
threading.Thread(target=worker, daemon=True).start()

@app.route('/analyze', methods=['POST'])
def api_analyze():
    """분석 요청 API"""
    try:
        data = request.json
        # 클라이언트에서 'pdf'라는 키로 이미지를 보내고 있음 (변수명 호환성 유지)
        image_base64 = data.get('pdf') 
        url = data.get('url')
        metadata = data.get('metadata', {})
        
        if not image_base64:
            return jsonify({"error": "No image data"}), 400
            
        job_id = str(uuid.uuid4())
        
        with job_lock:
            job_results[job_id] = {"status": "processing"}
            
        # 큐에 작업 등록
        job_queue.put((job_id, image_base64, url, metadata))
        
        return jsonify({"status": "queued", "job_id": job_id})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/status/<job_id>', methods=['GET'])
def api_status(job_id):
    """상태 조회 API"""
    with job_lock:
        result = job_results.get(job_id)
        
    if not result:
        return jsonify({"error": "Job not found"}), 404
        
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)