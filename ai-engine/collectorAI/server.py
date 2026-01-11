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
from config import IMAGE_CONFIG, MODEL_CONFIG, get_analysis_prompt

app = Flask(__name__)
CORS(app)

SAVE_DIR = "/app/data"
IMAGE_DIR = "/app/data/images"
PDF_DIR = "/app/data/pdfs"
for d in [SAVE_DIR, IMAGE_DIR, PDF_DIR]:
    os.makedirs(d, exist_ok=True)

OLLAMA_URL = "http://host.docker.internal:11434/api/generate"
OLLAMA_TAGS_URL = "http://host.docker.internal:11434/api/tags"

job_queue = queue.Queue()
job_results = {}
job_lock = threading.Lock()

def check_ollama_connection():
    """Ollama 서버 연결 상태 확인"""
    try:
        resp = requests.get(OLLAMA_TAGS_URL, timeout=5)
        if resp.status_code == 200:
            models = resp.json().get('models', [])
            model_names = [m['name'] for m in models]
            has_target = any(MODEL_CONFIG["MODEL_NAME"] in name for name in model_names)
            return {
                "connected": True,
                "models": model_names,
                "target_model_available": has_target
            }
        return {"connected": False, "error": f"상태 코드: {resp.status_code}"}
    except requests.exceptions.ConnectionError:
        return {"connected": False, "error": "Ollama 서버에 연결할 수 없습니다."}
    except requests.exceptions.Timeout:
        return {"connected": False, "error": "연결 시간 초과"}
    except Exception as e:
        return {"connected": False, "error": str(e)}

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

def pdf_to_images(pdf_path, max_pages=None):
    """PDF → 이미지 (메모리 최적화: 스케일 1.0)"""
    try:
        doc = fitz.open(pdf_path)
        images = []
        
        if max_pages is None:
            max_pages = len(doc)
        page_count = min(len(doc), max_pages)
        
        # 스케일 설정 (메모리 최적화)
        scale = IMAGE_CONFIG.get("PDF_TO_IMAGE_SCALE", 1.0)
        print(f"[서버] PDF 변환: 전체 {len(doc)}페이지 중 {page_count}페이지 처리 (스케일: {scale})")
        
        for page_num in range(page_count):
            page = doc[page_num]
            mat = fitz.Matrix(scale, scale)
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
        print(f"[서버] PDF → {len(images)}페이지 변환 완료")
        return images
        
    except Exception as e:
        print(f"[서버] 변환 오류: {e}")
        return None

def process_images_directly(images_base64, max_images=None):
    """이미지 직접 처리 (PDF 변환 우회)"""
    try:
        if max_images:
            images_base64 = images_base64[:max_images]
        
        processed = []
        for i, b64 in enumerate(images_base64):
            img_data = base64.b64decode(b64)
            img = Image.open(io.BytesIO(img_data))
            
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            if img.width > IMAGE_CONFIG["MAX_WIDTH"]:
                ratio = IMAGE_CONFIG["MAX_WIDTH"] / img.width
                new_h = int(img.height * ratio)
                img = img.resize((IMAGE_CONFIG["MAX_WIDTH"], new_h), Image.Resampling.LANCZOS)
            
            buf = io.BytesIO()
            img.save(buf, format=IMAGE_CONFIG["FORMAT"], quality=IMAGE_CONFIG["QUALITY"])
            processed.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
        
        print(f"[서버] 직접 이미지 처리: {len(processed)}장 완료")
        return processed
        
    except Exception as e:
        print(f"[서버] 이미지 처리 오류: {e}")
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

def analyze_with_vision_model(image_base64, prompt, max_retries=2):
    """Ollama 비전 모델 분석 (재시도 로직 포함)"""
    
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                print(f"[Ollama] 재시도 {attempt}/{max_retries-1}")
                time.sleep(2)
            
            print(f"[Ollama] 요청 시작 (모델: {MODEL_CONFIG['MODEL_NAME']}, 타임아웃: {MODEL_CONFIG['TIMEOUT']}초)")
            
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
                error_msg = f"HTTP {resp.status_code}"
                try:
                    error_detail = resp.json()
                    error_msg += f": {error_detail.get('error', resp.text[:200])}"
                except:
                    error_msg += f": {resp.text[:200]}"
                
                print(f"[Ollama] 실패: {error_msg}")
                
                if attempt == max_retries - 1:
                    return None, error_msg
                continue
            
            result = resp.json()
            clean = result['response'].replace("```json", "").replace("```", "").strip()
            parsed = json.loads(clean)
            print(f"[Ollama] 성공")
            return parsed, None
            
        except requests.exceptions.ConnectionError as e:
            error_msg = "Ollama 서버 연결 실패. Ollama가 실행 중인지 확인하세요."
            print(f"[Ollama] {error_msg}")
            if attempt == max_retries - 1:
                return None, error_msg
                
        except requests.exceptions.Timeout as e:
            error_msg = f"요청 시간 초과 ({MODEL_CONFIG['TIMEOUT']}초). 모델이 너무 느리거나 이미지가 복잡합니다."
            print(f"[Ollama] {error_msg}")
            if attempt == max_retries - 1:
                return None, error_msg
                
        except json.JSONDecodeError as e:
            error_msg = f"JSON 파싱 실패. 모델 응답이 올바르지 않습니다: {str(e)}"
            print(f"[Ollama] {error_msg}")
            if attempt == max_retries - 1:
                return None, error_msg
                
        except Exception as e:
            error_msg = f"알 수 없는 오류: {type(e).__name__}: {str(e)}"
            print(f"[Ollama] {error_msg}")
            import traceback
            traceback.print_exc()
            if attempt == max_retries - 1:
                return None, error_msg
    
    return None, "최대 재시도 횟수 초과"

def extract_text_from_pdf(pdf_path):
    """PDF에서 순수 텍스트 추출"""
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
        
        # 1. PDF 저장
        if not save_pdf_from_extension(pdf_data, pdf_path):
            with job_lock:
                job_results[job_id] = {
                    "status": "error", 
                    "message": "PDF 저장 실패",
                    "error_type": "save_failed"
                }
            return

        # 2. 텍스트 추출
        raw_text = extract_text_from_pdf(pdf_path)

        # 3. 이미지 변환 (메모리 최적화 버전)
        max_pages = IMAGE_CONFIG.get("MAX_PAGES_TO_ANALYZE", 3)
        images = pdf_to_images(pdf_path, max_pages=max_pages)
        
        if not images:
            with job_lock:
                job_results[job_id] = {
                    "status": "error", 
                    "message": "PDF를 이미지로 변환 실패",
                    "error_type": "conversion_failed",
                    "pdf": pdf_file
                }
            return
        
        img_file = f"{company}_{ts}.jpg"
        img_path = os.path.join(IMAGE_DIR, img_file)
        merged = merge_images_vertically(images, save_path=img_path)
        
        if not merged:
            with job_lock:
                job_results[job_id] = {
                    "status": "error", 
                    "message": "이미지 병합 실패",
                    "error_type": "merge_failed",
                    "pdf": pdf_file
                }
            return
        
        # 4. 프롬프트 생성
        today = datetime.now().strftime("%Y-%m-%d")
        base_prompt = get_analysis_prompt(url, today, metadata)
        
        enhanced_prompt = f"""
{base_prompt}

[가장 중요: 아래의 추출된 텍스트를 최우선으로 참고하여 분석하세요]
텍스트 소스:
{raw_text[:4000]} 

[주의] 이미지 하단의 '추천 공고'나 '관련 공고' 정보는 무시하고, 상단의 본문 채용 정보만 분석하세요.
"""
        
        # 5. AI 분석
        print(f"[워커 {job_id[:8]}] Ollama 요청")
        data, error = analyze_with_vision_model(merged, enhanced_prompt)
        
        if not data:
            with job_lock:
                job_results[job_id] = {
                    "status": "error",
                    "message": error or "AI 분석 실패",
                    "error_type": "analysis_failed",
                    "pdf": pdf_file,
                    "image": img_file,
                    "details": "Ollama 연결 또는 모델 실행 문제"
                }
            return
        
        # 6. 결과 저장
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
        print(f"[워커 {job_id[:8]}] 예외 발생: {e}")
        import traceback
        traceback.print_exc()
        with job_lock:
            job_results[job_id] = {
                "status": "error", 
                "message": f"서버 내부 오류: {str(e)}",
                "error_type": "internal_error"
            }

def process_job_images(job_id, images_base64, url, metadata):
    """이미지 직접 처리 (PDF 우회)"""
    try:
        print(f"[워커-IMG {job_id[:8]}] 시작")
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        company = metadata.get('company', 'unknown').replace('/', '_')[:30]
        
        # 1. 이미지 직접 처리
        max_images = IMAGE_CONFIG.get("MAX_CAPTURES", 3)
        images = process_images_directly(images_base64, max_images=max_images)
        
        if not images:
            with job_lock:
                job_results[job_id] = {
                    "status": "error", 
                    "message": "이미지 처리 실패",
                    "error_type": "processing_failed"
                }
            return
        
        # 2. 이미지 병합 및 저장
        img_file = f"{company}_{ts}.jpg"
        img_path = os.path.join(IMAGE_DIR, img_file)
        merged = merge_images_vertically(images, save_path=img_path)
        
        if not merged:
            with job_lock:
                job_results[job_id] = {
                    "status": "error", 
                    "message": "이미지 병합 실패",
                    "error_type": "merge_failed"
                }
            return
        
        # 3. 프롬프트 생성
        today = datetime.now().strftime("%Y-%m-%d")
        base_prompt = get_analysis_prompt(url, today, metadata)
        
        raw_text = metadata.get('raw_text', '')
        enhanced_prompt = f"""
{base_prompt}

[가장 중요: 아래의 추출된 텍스트를 최우선으로 참고하여 분석하세요]
텍스트 소스:
{raw_text[:4000]} 

[주의] 이미지에 추천 공고가 보이지 않아야 하지만, 혹시 보인다면 무시하고 메인 채용 공고만 분석하세요.
"""
        
        # 4. AI 분석
        print(f"[워커-IMG {job_id[:8]}] Ollama 요청")
        data, error = analyze_with_vision_model(merged, enhanced_prompt)
        
        if not data:
            with job_lock:
                job_results[job_id] = {
                    "status": "error",
                    "message": error or "AI 분석 실패",
                    "error_type": "analysis_failed",
                    "image": img_file,
                    "details": "Ollama 연결 또는 모델 실행 문제"
                }
            return
        
        # 5. 결과 저장
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
                "image": img_file,
                "data": data
            }
        
        print(f"[워커-IMG {job_id[:8]}] 완료")
        
    except Exception as e:
        print(f"[워커-IMG {job_id[:8]}] 예외 발생: {e}")
        import traceback
        traceback.print_exc()
        with job_lock:
            job_results[job_id] = {
                "status": "error", 
                "message": f"서버 내부 오류: {str(e)}",
                "error_type": "internal_error"
            }

def worker():
    """백그라운드 워커"""
    while True:
        try:
            item = job_queue.get()
            
            if len(item) == 4:
                # PDF 모드
                job_id, pdf_data, url, metadata = item
                process_job(job_id, pdf_data, url, metadata)
            elif len(item) == 5:
                # 이미지 직접 모드
                job_id, images_base64, url, metadata, _ = item
                process_job_images(job_id, images_base64, url, metadata)
            
            job_queue.task_done()
        except Exception as e:
            print(f"[워커] 치명적 오류: {e}")
            import traceback
            traceback.print_exc()

worker_thread = threading.Thread(target=worker, daemon=True)
worker_thread.start()

@app.route('/health', methods=['GET'])
def health():
    """서버 상태 및 Ollama 연결 확인"""
    ollama_status = check_ollama_connection()
    
    return jsonify({
        "server": "ok",
        "ollama": ollama_status,
        "queue_size": job_queue.qsize(),
        "model": MODEL_CONFIG["MODEL_NAME"],
        "direct_image_mode": IMAGE_CONFIG.get("DIRECT_IMAGE_MODE", False)
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    """PDF 분석 엔드포인트 (기존 호환성 유지)"""
    data = request.json
    url = data.get('url', '')
    pdf_data = data.get('pdf')
    metadata = data.get('metadata', {})
    
    if not pdf_data:
        return jsonify({"error": "PDF 데이터가 없습니다."}), 400
    
    # Ollama 사전 체크
    ollama_check = check_ollama_connection()
    if not ollama_check.get("connected"):
        return jsonify({
            "error": "Ollama 서버 연결 실패",
            "details": ollama_check.get("error"),
            "solution": "Ollama가 실행 중인지 확인하세요: ollama serve"
        }), 503
    
    if not ollama_check.get("target_model_available"):
        return jsonify({
            "error": f"모델 '{MODEL_CONFIG['MODEL_NAME']}'을 찾을 수 없습니다",
            "available_models": ollama_check.get("models", []),
            "solution": f"모델을 다운로드하세요: ollama pull {MODEL_CONFIG['MODEL_NAME']}"
        }), 503
    
    job_id = str(uuid.uuid4())
    
    with job_lock:
        job_results[job_id] = {"status": "queued"}
    
    job_queue.put((job_id, pdf_data, url, metadata))
    print(f"[서버] 작업 등록 (PDF 모드): {job_id[:8]}")
    
    return jsonify({"status": "queued", "job_id": job_id})

@app.route('/analyze_images', methods=['POST'])
def analyze_images():
    """이미지 직접 분석 엔드포인트 (PDF 우회)"""
    data = request.json
    url = data.get('url', '')
    images = data.get('images', [])
    metadata = data.get('metadata', {})
    
    if not images:
        return jsonify({"error": "이미지 데이터가 없습니다."}), 400
    
    # Ollama 사전 체크
    ollama_check = check_ollama_connection()
    if not ollama_check.get("connected"):
        return jsonify({
            "error": "Ollama 서버 연결 실패",
            "details": ollama_check.get("error"),
            "solution": "Ollama가 실행 중인지 확인하세요: ollama serve"
        }), 503
    
    if not ollama_check.get("target_model_available"):
        return jsonify({
            "error": f"모델 '{MODEL_CONFIG['MODEL_NAME']}'을 찾을 수 없습니다",
            "available_models": ollama_check.get("models", []),
            "solution": f"모델을 다운로드하세요: ollama pull {MODEL_CONFIG['MODEL_NAME']}"
        }), 503
    
    job_id = str(uuid.uuid4())
    
    with job_lock:
        job_results[job_id] = {"status": "queued"}
    
    job_queue.put((job_id, images, url, metadata, 'image_mode'))
    print(f"[서버] 작업 등록 (이미지 직접 모드): {job_id[:8]}, {len(images)}장")
    
    return jsonify({"status": "queued", "job_id": job_id})

@app.route('/status/<job_id>', methods=['GET'])
def status(job_id):
    with job_lock:
        result = job_results.get(job_id)
    
    if not result:
        return jsonify({"error": "작업을 찾을 수 없습니다"}), 404
    
    return jsonify(result)

if __name__ == '__main__':
    print("[서버] CareerOS Collector AI 시작")
    print(f"[서버] 데이터 디렉토리: {SAVE_DIR}")
    print(f"[서버] Ollama URL: {OLLAMA_URL}")
    print(f"[서버] 모델: {MODEL_CONFIG['MODEL_NAME']}")
    print(f"[서버] 페이지 제한: {IMAGE_CONFIG.get('MAX_PAGES_TO_ANALYZE', 3)}페이지")
    print(f"[서버] PDF→이미지 스케일: {IMAGE_CONFIG.get('PDF_TO_IMAGE_SCALE', 1.0)}")
    print(f"[서버] 직접 이미지 모드: {IMAGE_CONFIG.get('DIRECT_IMAGE_MODE', False)}")
    
    # 시작 시 Ollama 체크
    ollama_status = check_ollama_connection()
    if ollama_status.get("connected"):
        print(f"[서버] Ollama 연결 성공")
        if ollama_status.get("target_model_available"):
            print(f"[서버] 모델 '{MODEL_CONFIG['MODEL_NAME']}' 사용 가능")
        else:
            print(f"[경고] 모델 '{MODEL_CONFIG['MODEL_NAME']}'을 찾을 수 없습니다")
            print(f"[경고] 사용 가능한 모델: {ollama_status.get('models', [])}")
    else:
        print(f"[경고] Ollama 연결 실패: {ollama_status.get('error')}")
        print(f"[경고] 서버는 시작되지만 분석은 작동하지 않습니다")
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
