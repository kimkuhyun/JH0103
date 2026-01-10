FROM python:3.9-slim

WORKDIR /app

# Chromium 의존성 설치
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pyppeteer Chromium 미리 다운로드
RUN python -c "from pyppeteer import launch; import asyncio; asyncio.get_event_loop().run_until_complete(launch())"

# 소스 복사
COPY *.py .

# 데이터 폴더
RUN mkdir -p /app/data /app/data/images /app/data/pdfs

# Puppeteer 환경변수
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["python", "server.py"]
