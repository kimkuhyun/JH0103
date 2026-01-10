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
if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)

OLLAMA_URL = "http://host.docker.internal:11434/api/generate"

# Job queue system
job_queue = queue.Queue()
job_results = {}
job_lock = threading.Lock()

def merge_images_vertically(base64_images):
    """Merge multiple images vertically into one"""
    if not base64_images:
        return None
    
    if len(base64_images) == 1:
        return resize_image(base64_images[0])
    
    # Hard limit
    if len(base64_images) > IMAGE_CONFIG["MAX_CAPTURES"]:
        base64_images = base64_images[:IMAGE_CONFIG["MAX_CAPTURES"]]
        print(f"[Server] Limited to {IMAGE_CONFIG['MAX_CAPTURES']} images")
    
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
        
        print(f"[Server] Merged {len(base64_images)} images into {target_width}x{total_height}px")
        
        return merged_base64
        
    except Exception as e:
        print(f"[Server] Merge failed: {e}")
        return resize_image(base64_images[0])

def resize_image(base64_str):
    """Resize single image"""
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
        print(f"[Server] Resize failed: {e}")
        return base64_str

def analyze_with_vision_model(image_base64, prompt):
    """Analyze merged image"""
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
        }, timeout=MODEL_CONFIG["TIMEOUT"])
        
        if response.status_code != 200:
            print(f"[Server] Analysis failed: {response.status_code}")
            return None
        
        result = response.json()
        clean_json = result['response'].replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
        
    except Exception as e:
        print(f"[Server] Analysis error: {e}")
        return None

def infer_industry(data):
    """Infer industry from company name/title"""
    company_info = data.get("company_info", {})
    job_summary = data.get("job_summary", {})
    
    company = (company_info.get("name") or job_summary.get("company") or "").lower()
    title = (job_summary.get("title") or "").lower()
    combined = company + " " + title
    
    keywords_map = {
        "IT/Software": ["software", "it", "develop", "tech", "system", "data", "app", "web"],
        "Finance": ["bank", "finance", "securities", "insurance", "investment"],
        "Manufacturing": ["manufacturing", "factory", "production", "hardware", "furniture"],
        "Retail": ["retail", "logistics", "delivery", "shopping", "mart"],
        "Healthcare": ["hospital", "medical", "pharmaceutical", "bio", "health"],
        "Education": ["school", "education", "academy", "instructor"],
        "Construction": ["construction", "architecture", "civil"],
        "Media": ["design", "advertising", "marketing", "media", "content"],
    }
    
    for industry, keywords in keywords_map.items():
        if any(kw in combined for kw in keywords):
            return industry
    
    return "Service"

def process_job(job_id, raw_images, metadata, url):
    """Worker function to process job"""
    try:
        print(f"[Worker {job_id}] Starting analysis")
        
        if not raw_images:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "No images"}
            return
        
        # Merge images
        merged_image = merge_images_vertically(raw_images)
        
        if not merged_image:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "Merge failed"}
            return
        
        # Generate prompt
        today = datetime.now().strftime("%Y-%m-%d")
        prompt = get_analysis_prompt(url, today, metadata)
        
        # Analyze
        job_data = analyze_with_vision_model(merged_image, prompt)
        
        if not job_data:
            with job_lock:
                job_results[job_id] = {"status": "error", "message": "Analysis failed"}
            return
        
        # Infer industry
        if not job_data.get("meta", {}).get("industry_domain"):
            if "meta" not in job_data:
                job_data["meta"] = {}
            job_data["meta"]["industry_domain"] = infer_industry(job_data)
        
        # Default salary
        if "analysis" in job_data and "working_conditions" in job_data["analysis"]:
            if not job_data["analysis"]["working_conditions"].get("salary"):
                job_data["analysis"]["working_conditions"]["salary"] = "As per company policy"
        
        # Save file
        company = job_data.get('company_info', {}).get('name') or \
                  job_data.get('job_summary', {}).get('company', 'Unknown')
        title = job_data.get('job_summary', {}).get('title', 'Job')
        safe_name = "".join([c if c.isalnum() or c in (' ', '_', '-') else '_' 
                             for c in f"{company}_{title}"])
        filename = f"{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        filepath = os.path.join(SAVE_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(job_data, f, ensure_ascii=False, indent=2)
        
        with job_lock:
            job_results[job_id] = {
                "status": "success",
                "file": filename,
                "data": job_data
            }
        
        print(f"[Worker {job_id}] Completed: {filename}")
        
    except Exception as e:
        print(f"[Worker {job_id}] Error: {e}")
        with job_lock:
            job_results[job_id] = {"status": "error", "message": str(e)}

def worker():
    """Background worker thread"""
    while True:
        try:
            job_id, raw_images, metadata, url = job_queue.get()
            process_job(job_id, raw_images, metadata, url)
            job_queue.task_done()
        except Exception as e:
            print(f"[Worker] Fatal error: {e}")

# Start worker thread
worker_thread = threading.Thread(target=worker, daemon=True)
worker_thread.start()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/analyze', methods=['POST'])
def analyze():
    """Queue job for async processing"""
    data = request.json
    
    raw_images = data.get('images', [])
    metadata = data.get('metadata', {})
    url = data.get('url', '')
    
    if not raw_images:
        return jsonify({"status": "error", "message": "No images"}), 400
    
    job_id = str(uuid.uuid4())
    
    with job_lock:
        job_results[job_id] = {"status": "queued"}
    
    job_queue.put((job_id, raw_images, metadata, url))
    
    print(f"[Server] Job {job_id} queued ({len(raw_images)} images)")
    
    return jsonify({"status": "queued", "job_id": job_id})

@app.route('/status/<job_id>', methods=['GET'])
def get_status(job_id):
    """Check job status"""
    with job_lock:
        result = job_results.get(job_id)
    
    if not result:
        return jsonify({"status": "error", "message": "Job not found"}), 404
    
    return jsonify(result)

if __name__ == '__main__':
    print("[Server] CareerOS Collector AI started")
    print(f"[Server] Data directory: {SAVE_DIR}")
    print("[Server] Async queue mode enabled")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
