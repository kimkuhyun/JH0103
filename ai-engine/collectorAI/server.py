import os
import json
import base64
import io
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime
from PIL import Image  # 이미지 처리를 위한 Pillow 라이브러리

app = Flask(__name__)
CORS(app)

SAVE_DIR = "/app/data" # 도커 내부 경로
if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)

def resize_image_for_ai(base64_str):
    """AI에게 보내기 전에 이미지를 최적화(리사이징)하는 함수"""
    try:
        # Base64 디코딩
        image_data = base64.b64decode(base64_str)
        img = Image.open(io.BytesIO(image_data))
        
        # 1. RGB 변환 (PNG 투명도 문제 해결)
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # 2. 리사이징 (긴 변 기준 1000px)
        MAX_SIZE = 1000
        if max(img.size) > MAX_SIZE:
            img.thumbnail((MAX_SIZE, MAX_SIZE), Image.Resampling.LANCZOS)
            
        # 3. JPEG 압축 (품질 70)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=70)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        print(f"⚠️ 이미지 처리 실패 (원본 사용): {e}")
        return base64_str

@app.route('/analyze', methods=['POST'])
def analyze():
    print("📥 [Server] 데이터 수신! 분석 준비 중...")
    data = request.json
    raw_images = data.get('images', [])
    
    # ⭐ 여기서 파이썬이 이미지를 싹 다이어트 시킵니다
    optimized_images = [resize_image_for_ai(img) for img in raw_images]
    print(f"✨ 이미지 {len(raw_images)}장 최적화 완료")

    OLLAMA_URL = "http://host.docker.internal:11434/api/generate"

    try:
        response = requests.post(OLLAMA_URL, json={
            "model": "qwen2.5vl:3b",
            "prompt": data.get('prompt', ''),
            "images": optimized_images, # 최적화된 이미지 전송
            "format": "json",
            "stream": False,
            "options": {
                "num_ctx": 8192, 
                "temperature": 0
            }
        }, timeout=None)

        if response.status_code != 200:
            return jsonify({"status": "error", "message": "Ollama Error"}), 500
            
        result = response.json()
        clean_json = result['response'].replace("```json", "").replace("```", "")
        job_data = json.loads(clean_json)
        
        # 파일 저장
        company = job_data.get('job_summary', {}).get('company', 'Unknown')
        title = job_data.get('job_summary', {}).get('title', 'Job')
        safe_name = "".join([c if c.isalnum() or c in (' ', '_', '-') else '_' for c in f"{company}_{title}"])
        filename = f"{safe_name}_{datetime.now().strftime('%Y%m%d')}.json"
        
        filepath = os.path.join(SAVE_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(job_data, f, ensure_ascii=False, indent=2)
            
        print(f"✅ 저장 완료: {filename}")
        return jsonify({"status": "success", "file": filename, "data": job_data})

    except Exception as e:
        print(f"❌ 오류: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)