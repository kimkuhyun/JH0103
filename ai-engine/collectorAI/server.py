import os
import json
import base64
import io
import threading
import queue
import uuid
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime
from PIL import Image
import fitz
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from config import IMAGE_CONFIG, MODEL_CONFIG, get_analysis_prompt

app = Flask(__name__)
CORS(app)

SAVE_DIR = "/app/data"
IMAGE_DIR = "/app/data/images"
PDF_DIR = "/app/data/pdfs"
for d in [SAVE_DIR, IMAGE_DIR, PDF_DIR]:
    os.makedirs(d, exist_ok=True)

OLLAMA_URL = "http://host.docker.internal:11434/api/generate"

job_queue = queue.Queue()
job_results = {}
job_lock = threading.Lock()

def save_pdf_from_extension(pdf_base64, output_path):
    """익스텐션에서 보낸 Base64 데이터를 PDF 파일로 저장"""
    try:
        pdf_bytes = base64.b64decode(pdf_base64)
        with open(output_path, 'wb') as f:
            f.write(pdf_bytes)
        return True
    except Exception as e:
        print(f"[서버] PDF 저장 오류: {e}")
        return False

def pdf_to_images(pdf_path):
    """PDF → 이미지"""
    try:
        doc = fitz.open(pdf_path)
        images = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            if img.width > IMAGE_CONFIG["MAX_WIDTH"]:
                ratio = IMAGE_CONFIG["MAX_WIDTH"] / img.width
                new_h = int(img.height * ratio)
                img = img.resize((IMAGE_CONFIG["MAX_WIDTH"], new_h), Image.Resampling.LANCZOS)
            
            buf = io.BytesIO()
            img.save(buf, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
            images.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
        
        doc.close()
        print(f"[서버] PDF → {len(images)}페이지")
        return images
        
    except Exception as e:
        print(f"[서버] 변환 오류: {e}")
        return None

def merge_images_vertically(images, save_path=None):
    """이미지 병합"""
    if not images:
        return None
    
    if len(images) == 1:
        if save_path:
            img_data = base64.b64decode(images[0])
            with open(save_path, 'wb') as f:
                f.write(img_data)
        return images[0]
    
    try:
        pil_images = []
        max_w = 0
        
        for b64 in images:
            data = base64.b64decode(b64)
            img = Image.open(io.BytesIO(data))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            pil_images.append(img)
            max_w = max(max_w, img.width)
        
        target_w = min(max_w, IMAGE_CONFIG["MAX_WIDTH"])
        
        resized = []
        total_h = 0
        
        for img in pil_images:
            ratio = target_w / img.width
            new_h = int(img.height * ratio)
            r = img.resize((target_w, new_h), Image.Resampling.LANCZOS)
            resized.append(r)
            total_h += new_h
        
        merged = Image.new('RGB', (target_w, total_h), (255, 255, 255))
        
        y = 0
        for img in resized:
            merged.paste(img, (0, y))
            y += img.height
        
        buf = io.BytesIO()
        merged.save(buf, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
        merged_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        
        if save_path:
            merged.save(save_path, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
        
        print(f"[서버] 병합: {target_w}x{total_h}px")
        return merged_b64
        
    except Exception as e:
        print(f"[서버] 병합 오류: {e}")
        return images[0] if images else None

def analyze_with_vision_model(image_base64, prompt):
    """Ollama OCR"""
    try:
        print(f"[Ollama] 요청")
        
        resp = requests.post(OLLAMA_URL, json={
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
        
        if resp.status_code != 200:
            print(f"[Ollama] 실패: {resp.status_code}")
            return None
        
        result = resp.json()
        clean = result['response'].replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
        
    except Exception as e:
        print(f"[Ollama] 오류: {e}")
        return None

def infer_industry(data):
    """산업 분류"""
    ci = data.get("company_info", {})
    js = data.get("job_summary", {})
    
    text = (ci.get("name", "") + " " + js.get("company", "") + " " + js.get("title", "")).lower()
    
    kw = {
        "IT/소프트웨어": ["소프트웨어", "it", "개발", "시스템", "데이터"],
        "금융": ["은행", "금융", "증권", "보험"],
        "제조": ["제조", "공장"],
        "유통": ["유통", "물류"],
        "의료": ["병원", "의료"],
        "교육": ["학교", "교육"],
        "건설": ["건설"],
        "미디어": ["디자인", "광고"],
    }
    
    for ind, kws in kw.items():
        if any(k in text for k in kws):
            return ind
    
    return "서비스"

def extract_text_from_pdf(pdf_path):
    """PDF에서 순수 텍스트를 추출하여 AI의 OCR 부담을 줄임"""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except Exception as e:
        print(f"[서버] 텍스트 추출 오류: {e}")
        return ""
def process_job(job_id, pdf_data, url, metadata):
    try:
        print(f"[워커 {job_id[:8]}] 시작")
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        company = metadata.get('company', 'unknown').replace('/', '_')[:30]
        
        pdf_file = f"{company}_{ts}.pdf"
        pdf_path = os.path.join(PDF_DIR, pdf_file)
        
        if not save_pdf_from_extension(pdf_data, pdf_path):
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "PDF 저장 실패"}
            return

        # 1. [추가] PDF에서 순수 텍스트 먼저 추출 (AI 정확도 향상의 핵심)
        raw_text = extract_text_from_pdf(pdf_path)

        # 2. 이미지 변환 (비전 모델의 레이아웃 파악용)
        images = pdf_to_images(pdf_path)
        if not images:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "변환 실패"}
            return
        
        img_file = f"{company}_{ts}.jpg"
        img_path = os.path.join(IMAGE_DIR, img_file)
        merged = merge_images_vertically(images, save_path=img_path)
        
        if not merged:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "병합 실패"}
            return
        
        # 3. [수정] 프롬프트 강화: 추출된 텍스트를 프롬프트에 포함
        today = datetime.now().strftime("%Y-%m-%d")
        base_prompt = get_analysis_prompt(url, today, metadata)
        
        # 라마 3.2 비전 모델이 텍스트 소스를 참고하도록 유도
        enhanced_prompt = f"""
        {base_prompt}
        
        [가장 중요: 아래의 추출된 텍스트를 최우선으로 참고하여 분석하세요]
        텍스트 소스:
        {raw_text[:4000]} 
        
        [주의] 이미지 하단의 '추천 공고'나 '관련 공고' 정보는 무시하고, 상단의 본문 채용 정보만 분석하세요.
        """
        
        print(f"[워커 {job_id[:8]}]  비전 분석 실행 (텍스트 포함)")
        data = analyze_with_vision_model(merged, enhanced_prompt)
        
        if not data:
            with job_lock:
                job_results[job_id] = {
                    "status": "error",
                    "message": "분석 실패 (타임아웃 가능성)",
                    "pdf": pdf_file,
                    "image": img_file
                }
            return
        
        # 저장
        comp = data.get('company_info', {}).get('name') or data.get('job_summary', {}).get('company', 'Unknown')
        title = data.get('job_summary', {}).get('title', 'Job')
        safe = "".join([c if c.isalnum() or c in (' ', '_', '-') else '_' for c in f"{comp}_{title}"])
        json_file = f"{safe}_{ts}.json"
        
        json_path = os.path.join(SAVE_DIR, json_file)
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        with job_lock:
            job_results[job_id] = {
                "status": "success",
                "file": json_file,
                "pdf": pdf_file,
                "image": img_file,
                "data": data
            }
        
        print(f"[워커 {job_id[:8]}] 완료")
        
    except Exception as e:
        print(f"[워커 {job_id[:8]}] 오류: {e}")
        import traceback
        traceback.print_exc()
        with job_lock:
            job_results[job_id] = {"status": "error", "message": str(e)}

# 서버 코드 하단 worker 부분 수정
def worker():
    """백그라운드 워커"""
    while True:
        try:
            # 큐에서 pdf_data까지 4개를 꺼내도록 수정
            job_id, pdf_data, url, metadata = job_queue.get() 
            process_job(job_id, pdf_data, url, metadata)
            job_queue.task_done()
        except Exception as e:
            print(f"[워커] 오류: {e}")

worker_thread = threading.Thread(target=worker, daemon=True)
worker_thread.start()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    url = data.get('url', '')
    pdf_data = data.get('pdf')  # 익스텐션이 보낸 base64 PDF 데이터
    metadata = data.get('metadata', {})
    
    if not pdf_data:
        return jsonify({"error": "PDF 데이터가 없습니다."}), 400
    
    job_id = str(uuid.uuid4())
    
    with job_lock:
        job_results[job_id] = {"status": "queued"}
    
    # 큐에 pdf_data를 함께 넣어줍니다.
    job_queue.put((job_id, pdf_data, url, metadata))
    print(f"[서버] 등록: {job_id[:8]}")
    
    return jsonify({"status": "queued", "job_id": job_id})

@app.route('/status/<job_id>', methods=['GET'])
def status(job_id):
    with job_lock:
        result = job_results.get(job_id)
    
    if not result:
        return jsonify({"error": "없음"}), 404
    
    return jsonify(result)

if __name__ == '__main__':
    print("[서버] CareerOS Collector AI")
    print(f"[서버] 데이터: {SAVE_DIR}")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
