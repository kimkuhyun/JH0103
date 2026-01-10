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
    """Puppeteer로 URL을 PDF로 변환"""
    try:
        print(f"[Puppeteer] 브라우저 시작: {url}")
        browser = await launch({
            'headless': True,
            'args': ['--no-sandbox', '--disable-setuid-sandbox']
        })
        
        page = await browser.newPage()
        await page.setViewport({'width': 1280, 'height': 1024})
        
        # 페이지 로드
        await page.goto(url, {'waitUntil': 'networkidle2', 'timeout': 30000})
        
        # 추가 대기 (동적 콘텐츠)
        await asyncio.sleep(2)
        
        # PDF 생성 (인쇄 모드)
        await page.pdf({
            'path': output_path,
            'format': 'A4',
            'printBackground': True,
            'margin': {
                'top': '10mm',
                'right': '10mm',
                'bottom': '10mm',
                'left': '10mm'
            }
        })
        
        await browser.close()
        
        file_size = os.path.getsize(output_path)
        print(f"[Puppeteer] PDF 생성 완료: {file_size // 1024}KB")
        
        return True
        
    except Exception as e:
        print(f"[Puppeteer] PDF 생성 실패: {e}")
        return False

def pdf_to_images(pdf_path):
    """PDF 파일을 이미지 리스트로 변환"""
    try:
        pdf_document = fitz.open(pdf_path)
        
        images = []
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            
            # 고해상도 렌더링
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            # 리사이징
            if img.width > IMAGE_CONFIG["MAX_WIDTH"]:
                ratio = IMAGE_CONFIG["MAX_WIDTH"] / img.width
                new_height = int(img.height * ratio)
                img = img.resize((IMAGE_CONFIG["MAX_WIDTH"], new_height), Image.Resampling.LANCZOS)
            
            buffer = io.BytesIO()
            img.save(buffer, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            images.append(img_base64)
        
        pdf_document.close()
        print(f"[서버] PDF → {len(images)}페이지 변환")
        return images
        
    except Exception as e:
        print(f"[서버] PDF 변환 실패: {e}")
        return None

def merge_images_vertically(base64_images, save_path=None):
    """여러 이미지를 세로로 병합"""
    if not base64_images:
        return None
    
    if len(base64_images) == 1:
        img = base64_images[0]
        if save_path:
            save_image(img, save_path)
        return img
    
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
        merged_image.save(buffer, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
        merged_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        if save_path:
            merged_image.save(save_path, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
            print(f"[서버] 병합 이미지 저장: {save_path}")
        
        print(f"[서버] {len(base64_images)}장 병합: {target_width}x{total_height}px")
        return merged_base64
        
    except Exception as e:
        print(f"[서버] 병합 실패: {e}")
        return base64_images[0] if base64_images else None

def save_image(base64_str, filepath):
    """Base64 이미지를 파일로 저장"""
    try:
        img_data = base64.b64decode(base64_str)
        img = Image.open(io.BytesIO(img_data))
        img.save(filepath, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
    except Exception as e:
        print(f"[서버] 이미지 저장 실패: {e}")

def analyze_with_vision_model(image_base64, prompt):
    """비전 모델로 분석"""
    try:
        print(f"[서버] Ollama 요청")
        
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
            print(f"[서버] 분석 실패: {response.status_code}")
            return None
        
        result = response.json()
        clean_json = result['response'].replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
        
    except Exception as e:
        print(f"[서버] 분석 오류: {e}")
        return None

def infer_industry(data):
    """산업 분류"""
    company_info = data.get("company_info", {})
    job_summary = data.get("job_summary", {})
    
    company = (company_info.get("name") or job_summary.get("company") or "").lower()
    title = (job_summary.get("title") or "").lower()
    combined = company + " " + title
    
    keywords_map = {
        "IT/소프트웨어": ["소프트웨어", "it", "개발", "테크", "시스템", "데이터"],
        "금융": ["은행", "금융", "증권", "보험"],
        "제조": ["제조", "공장", "생산"],
        "유통": ["유통", "물류"],
        "의료": ["병원", "의료", "제약"],
        "교육": ["학교", "교육"],
        "건설": ["건설", "건축"],
        "미디어": ["디자인", "광고", "미디어"],
    }
    
    for industry, keywords in keywords_map.items():
        if any(kw in combined for kw in keywords):
            return industry
    
    return "서비스"

def process_job(job_id, url, metadata):
    """URL에서 PDF 생성 후 분석"""
    try:
        print(f"[워커 {job_id[:8]}] 시작: {url}")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        company_name = metadata.get('company', 'unknown').replace('/', '_')[:30]
        
        pdf_filename = f"{company_name}_{timestamp}.pdf"
        pdf_path = os.path.join(PDF_DIR, pdf_filename)
        
        # Puppeteer로 PDF 생성
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(generate_pdf_from_url(url, pdf_path))
        loop.close()
        
        if not success:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "PDF 생성 실패"}
            return
        
        # PDF → 이미지 변환
        images = pdf_to_images(pdf_path)
        if not images:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "PDF 변환 실패"}
            return
        
        # 이미지 병합
        image_filename = f"{company_name}_{timestamp}.jpg"
        image_path = os.path.join(IMAGE_DIR, image_filename)
        merged_image = merge_images_vertically(images, save_path=image_path)
        
        if not merged_image:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "병합 실패"}
            return
        
        # AI 분석
        today = datetime.now().strftime("%Y-%m-%d")
        prompt = get_analysis_prompt(url, today, metadata)
        
        print(f"[워커 {job_id[:8]}] AI 분석")
        job_data = analyze_with_vision_model(merged_image, prompt)
        
        if not job_data:
            with job_lock:
                job_results[job_id] = {
                    "status": "error", 
                    "message": "분석 실패",
                    "pdf_saved": pdf_filename,
                    "image_saved": image_filename
                }
            return
        
        # 후처리
        if not job_data.get("meta", {}).get("industry_domain"):
            if "meta" not in job_data:
                job_data["meta"] = {}
            job_data["meta"]["industry_domain"] = infer_industry(job_data)
        
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
                "pdf": pdf_filename,
                "image": image_filename,
                "data": job_data
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
            print(f"[워커] 치명적 오류: {e}")

worker_thread = threading.Thread(target=worker, daemon=True)
worker_thread.start()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/analyze', methods=['POST'])
def analyze():
    """작업 등록 (URL 기반)"""
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
    """작업 상태"""
    with job_lock:
        result = job_results.get(job_id)
    
    if not result:
        return jsonify({"status": "error", "message": "작업 없음"}), 404
    
    return jsonify(result)

if __name__ == '__main__':
    print("[서버] CareerOS Collector AI")
    print(f"[서버] 데이터: {SAVE_DIR}")
    print(f"[서버] 이미지: {IMAGE_DIR}")
    print(f"[서버] PDF: {PDF_DIR}")
    print("[서버] Puppeteer 모드")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
