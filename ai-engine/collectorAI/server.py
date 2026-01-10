import os
import json
import base64
import io
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime
from PIL import Image

app = Flask(__name__)
CORS(app)

SAVE_DIR = "/app/data"
if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)

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

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/analyze', methods=['POST'])
def analyze():
    print("[Server] 데이터 수신! 분석 준비 중...")
    data = request.json
    
    raw_images = data.get('images', [])
    metadata = data.get('metadata', {})
    prompt = data.get('prompt', '')
    url = data.get('url', '')
    
    print(f"[Server] 이미지 {len(raw_images)}장 수신")
    
    # 메타데이터 로깅
    if metadata:
        meta_text = extract_metadata_text(metadata)
        print(f"[Server] 메타데이터 추출됨:\n{meta_text}")
    
    # 이미지 최적화
    optimized_images = [resize_image(img) for img in raw_images]
    print(f"[Server] 이미지 {len(optimized_images)}장 최적화 완료")
    
    OLLAMA_URL = "http://host.docker.internal:11434/api/generate"
    
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": "qwen2.5vl:3b",
            "prompt": prompt,
            "images": optimized_images,
            "format": "json",
            "stream": False,
            "options": {
                "num_ctx": 8192,
                "temperature": 0
            }
        }, timeout=None)
        
        if response.status_code != 200:
            print(f"[Server] Ollama 오류: {response.status_code}")
            return jsonify({"status": "error", "message": "Ollama Error"}), 500
        
        result = response.json()
        clean_json = result['response'].replace("```json", "").replace("```", "").strip()
        
        try:
            job_data = json.loads(clean_json)
        except json.JSONDecodeError as je:
            print(f"[Server] JSON 파싱 오류: {je}")
            print(f"[Server] 원본 응답: {clean_json[:500]}")
            return jsonify({"status": "error", "message": "JSON 파싱 실패"}), 500
        
        # 메타데이터로 누락된 정보 보완
        if metadata:
            if not job_data.get('job_summary', {}).get('company') and metadata.get('company'):
                if 'job_summary' not in job_data:
                    job_data['job_summary'] = {}
                job_data['job_summary']['company'] = metadata['company']
            
            if not job_data.get('job_summary', {}).get('title') and metadata.get('title'):
                if 'job_summary' not in job_data:
                    job_data['job_summary'] = {}
                job_data['job_summary']['title'] = metadata['title']
        
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
    
    except requests.exceptions.Timeout:
        print("[Server] Ollama 타임아웃")
        return jsonify({"status": "error", "message": "분석 시간 초과"}), 504
    except Exception as e:
        print(f"[Server] 오류: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    print("[Server] CareerOS Collector AI 서버 시작")
    print(f"[Server] 데이터 저장 경로: {SAVE_DIR}")
    app.run(host='0.0.0.0', port=5000, debug=False)
