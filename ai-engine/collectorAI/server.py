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

def generate_pdf_from_url(url, output_path):
    """Selenium PDF 생성 (동기, 스레드 안전)"""
    driver = None
    try:
        print(f"[Selenium] 시작: {url[:50]}...")
        
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.binary_location = '/usr/bin/chromium'
        
        service = Service('/usr/bin/chromedriver')
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        print(f"[Selenium] 페이지 로드")
        driver.get(url)
        time.sleep(3)  # 동적 콘텐츠 대기
        
        print(f"[Selenium] PDF 생성")
        pdf_settings = {
            'landscape': False,
            'displayHeaderFooter': False,
            'printBackground': True,
            'preferCSSPageSize': True,
        }
        
        pdf_data = driver.execute_cdp_cmd('Page.printToPDF', pdf_settings)
        pdf_bytes = base64.b64decode(pdf_data['data'])
        
        with open(output_path, 'wb') as f:
            f.write(pdf_bytes)
        
        driver.quit()
        
        size_kb = len(pdf_bytes) // 1024
        print(f"[Selenium] 완료: {size_kb}KB")
        return True
        
    except Exception as e:
        print(f"[Selenium] 오류: {e}")
        if driver:
            try:
                driver.quit()
            except:
                pass
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

def process_job(job_id, url, metadata):
    """작업 처리 (스레드 안전)"""
    try:
        print(f"[워커 {job_id[:8]}] 시작")
        
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        company = metadata.get('company', 'unknown').replace('/', '_')[:30]
        
        pdf_file = f"{company}_{ts}.pdf"
        pdf_path = os.path.join(PDF_DIR, pdf_file)
        
        # PDF 생성 (동기)
        if not generate_pdf_from_url(url, pdf_path):
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "PDF 실패"}
            return
        
        # 변환
        images = pdf_to_images(pdf_path)
        if not images:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "변환 실패"}
            return
        
        # 병합
        img_file = f"{company}_{ts}.jpg"
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
def health():
    return jsonify({"status": "ok"})

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    url = data.get('url', '')
    metadata = data.get('metadata', {})
    
    if not url:
        return jsonify({"error": "URL 필요"}), 400
    
    job_id = str(uuid.uuid4())
    
    with job_lock:
        job_results[job_id] = {"status": "queued"}
    
    job_queue.put((job_id, url, metadata))
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
