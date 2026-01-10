FROM python:3.9-slim

WORKDIR /app

# 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 모든 Python 파일 복사
COPY *.py .

# 데이터 저장소 폴더 생성
RUN mkdir -p /app/data

# 서버 실행
CMD ["python", "server.py"]
