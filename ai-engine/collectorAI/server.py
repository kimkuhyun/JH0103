import os
import json
import base64
import io
import threading
import queue
import uuid
import asyncio
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime
from PIL import Image
import fitz  # PyMuPDF
from pyppeteer import launch
from config import IMAGE_CONFIG, MODEL_CONFIG, get_analysis_prompt

app = Flask(__name__)
CORS(app)

SAVE_DIR = "/app/data"
IMAGE_DIR = "/app/data/images"
PDF_DIR = "/app/data/pdfs"
for directory in [SAVE_DIR, IMAGE_DIR, PDF_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)

OLLAMA_URL = "http://host.docker.internal:11434/api/generate"

job_queue = queue.Queue()
job_results = {}
job_lock = threading.Lock()

async def generate_pdf_from_url(url, output_path):
    """Puppeteer로 PDF 생성"""
    try:
        print(f"[Puppeteer] 시작: {url}")
        browser = await launch({
            'headless': True,
            'executablePath': '/usr/bin/chromium',
            'args': [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        })
        
        page = await browser.newPage()
        await page.setViewport({'width': 1280, 'height': 1024})
        
        print(f"[Puppeteer] 페이지 로드")
        await page.goto(url, {'waitUntil': 'networkidle0', 'timeout': 60000})
        await asyncio.sleep(3)
        
        print(f"[Puppeteer] PDF 생성")
        await page.pdf({
            'path': output_path,
            'format': 'A4',
            'printBackground': True,
            'margin': {'top': '5mm', 'right': '5mm', 'bottom': '5mm', 'left': '5mm'}
        })
        
        await browser.close()
        
        size_kb = os.path.getsize(output_path) // 1024
        print(f"[Puppeteer] 완료: {size_kb}KB")
        return True
        
    except Exception as e:
        print(f"[Puppeteer] 실패: {e}")
        return False

def pdf_to_images(pdf_path):
    """PDF → 이미지 변환"""
    try:
        pdf_doc = fitz.open(pdf_path)
        images = []
        
        for page_num in range(len(pdf_doc)):
            page = pdf_doc[page_num]
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            if img.width > IMAGE_CONFIG["MAX_WIDTH"]:
                ratio = IMAGE_CONFIG["MAX_WIDTH"] / img.width
                new_height = int(img.height * ratio)
                img = img.resize((IMAGE_CONFIG["MAX_WIDTH"], new_height), Image.Resampling.LANCZOS)
            
            buffer = io.BytesIO()
            img.save(buffer, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
            images.append(base64.b64encode(buffer.getvalue()).decode('utf-8'))
        
        pdf_doc.close()
        print(f"[서버] PDF → {len(images)}페이지")
        return images
        
    except Exception as e:
        print(f"[서버] PDF 변환 실패: {e}")
        return None

def merge_images_vertically(base64_images, save_path=None):
    """이미지 병합"""
    if not base64_images:
        return None
    
    if len(base64_images) == 1:
        if save_path:
            save_image(base64_images[0], save_path)
        return base64_images[0]
    
    try:
        images = []
        max_width = 0
        
        for b64 in base64_images:
            img_data = base64.b64decode(b64)
            img = Image.open(io.BytesIO(img_data))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            images.append(img)
            max_width = max(max_width, img.width)
        
        target_width = min(max_width, IMAGE_CONFIG["MAX_WIDTH"])
        
        resized = []
        total_height = 0
        
        for img in images:
            ratio = target_width / img.width
            new_height = int(img.height * ratio)
            r = img.resize((target_width, new_height), Image.Resampling.LANCZOS)
            resized.append(r)
            total_height += new_height
        
        merged = Image.new('RGB', (target_width, total_height), (255, 255, 255))
        
        y = 0
        for img in resized:
            merged.paste(img, (0, y))
            y += img.height
        
        buffer = io.BytesIO()
        merged.save(buffer, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
        merged_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        if save_path:
            merged.save(save_path, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
        
        print(f"[서버] 병합: {target_width}x{total_height}px")
        return merged_b64
        
    except Exception as e:
        print(f"[서버] 병합 실패: {e}")
        return base64_images[0] if base64_images else None

def save_image(base64_str, filepath):
    """이미지 저장"""
    try:
        img_data = base64.b64decode(base64_str)
        img = Image.open(io.BytesIO(img_data))
        img.save(filepath, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
    except Exception as e:
        print(f"[서버] 저장 실패: {e}")

def analyze_with_vision_model(image_base64, prompt):
    """Ollama 분석"""
    try:
        print(f"[Ollama] 요청")
        
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
            print(f"[Ollama] 실패: {response.status_code}")
            return None
        
        result = response.json()
        clean = result['response'].replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
        
    except Exception as e:
        print(f"[Ollama] 오류: {e}")
        return None

def infer_industry(data):
    """산업 분류"""
    company_info = data.get("company_info", {})
    job_summary = data.get("job_summary", {})
    
    company = (company_info.get("name") or job_summary.get("company") or "").lower()
    title = (job_summary.get("title") or "").lower()
    text = company + " " + title
    
    keywords = {
        "IT/소프트웨어": ["소프트웨어", "it", "개발", "테크", "시스템", "데이터"],
        "금융": ["은행", "금융", "증권", "보험"],
        "제조": ["제조", "공장", "생산"],
        "유통": ["유통", "물류"],
        "의료": ["병원", "의료", "제약"],
        "교육": ["학교", "교육"],
        "건설": ["건설", "건축"],
        "미디어": ["디자인", "광고", "미디어"],
    }
    
    for industry, kws in keywords.items():
        if any(kw in text for kw in kws):
            return industry
    
    return "서비스"

def process_job(job_id, url, metadata):
    """작업 처리"""
    try:
        print(f"[워커 {job_id[:8]}] 시작")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        company = metadata.get('company', 'unknown').replace('/', '_')[:30]
        
        pdf_file = f"{company}_{timestamp}.pdf"
        pdf_path = os.path.join(PDF_DIR, pdf_file)
        
        # PDF 생성
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(generate_pdf_from_url(url, pdf_path))
        loop.close()
        
        if not success:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "PDF 생성 실패"}
            return
        
        # PDF → 이미지
        images = pdf_to_images(pdf_path)
        if not images:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "변환 실패"}
            return
        
        # 병합
        img_file = f"{company}_{timestamp}.jpg"
        img_path = os.path.join(IMAGE_DIR, img_file)
        merged = merge_images_vertically(images, save_path=img_path)
        
        if not merged:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "병합 실패"}
            return
        
        # 분석
        today = datetime.now().strftime("%Y-%m-%d")
        prompt = get_analysis_prompt(url, today, metadata)
        
        print(f"[워커 {job_id[:8]}] 분석")
        data = analyze_with_vision_model(merged, prompt)
        
        if not data:
            with job_lock:
                job_results[job_id] = {
                    "status": "error",
                    "message": "분석 실패",
                    "pdf": pdf_file,
                    "image": img_file
                }
            return
        
        # 후처리
        if not data.get("meta", {}).get("industry_domain"):
            if "meta" not in data:
                data["meta"] = {}
            data["meta"]["industry_domain"] = infer_industry(data)
        
        if "analysis" in data and "working_conditions" in data["analysis"]:
            if not data["analysis"]["working_conditions"].get("salary"):
                data["analysis"]["working_conditions"]["salary"] = "회사 내규에 따름"
        
        # 저장
        comp = data.get('company_info', {}).get('name') or \
               data.get('job_summary', {}).get('company', 'Unknown')
        title = data.get('job_summary', {}).get('title', 'Job')
        safe = "".join([c if c.isalnum() or c in (' ', '_', '-') else '_' 
                        for c in f"{comp}_{title}"])
        json_file = f"{safe}_{timestamp}.json"
        
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
        with job_lock:
            job_results[job_id] = {"status": "error", "message": str(e)}

def worker():
    """백그라운드 워커"""
    while True:
        try:
            job_id, url, metadata = job_queue.get()
            process_job(job_id, url, metadata)
            job_queue.task_done()
        except Exception as e:
            print(f"[워커] 오류: {e}")

worker_thread = threading.Thread(target=worker, daemon=True)
worker_thread.start()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/analyze', methods=['POST'])
def analyze():
    """작업 등록"""
    data = request.json
    
    url = data.get('url', '')
    metadata = data.get('metadata', {})
    
    if not url:
        return jsonify({"status": "error", "message": "URL 필요"}), 400
    
    job_id = str(uuid.uuid4())
    
    with job_lock:
        job_results[job_id] = {"status": "queued"}
    
    job_queue.put((job_id, url, metadata))
    
    print(f"[서버] 작업 {job_id[:8]} 등록: {url}")
    
    return jsonify({"status": "queued", "job_id": job_id})

@app.route('/status/<job_id>', methods=['GET'])
def get_status(job_id):
    """상태 확인"""
    with job_lock:
        result = job_results.get(job_id)
    
    if not result:
        return jsonify({"status": "error", "message": "없음"}), 404
    
    return jsonify(result)

if __name__ == '__main__':
    print("[서버] CareerOS Collector AI")
    print(f"[서버] 데이터: {SAVE_DIR}")
    print(f"[서버] PDF: {PDF_DIR}")
    print(f"[서버] 이미지: {IMAGE_DIR}")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
