FROM python:3.9-slim

WORKDIR /app

# 1. Chromium 및 실행에 필요한 시스템 필수 라이브러리 설치
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# 2. Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Pyppeteer Chromium 미리 다운로드 및 실행 테스트
# 핵심: Root 권한 실행을 위해 --no-sandbox 옵션을 반드시 명시해야 합니다.
RUN python -c "from pyppeteer import launch; import asyncio; \
    asyncio.get_event_loop().run_until_complete(launch(options={'args': ['--no-sandbox', '--disable-setuid-sandbox']}))"

# 소스 복사
COPY *.py .

# 데이터 폴더 생성
RUN mkdir -p /app/data /app/data/images /app/data/pdfs

# 4. Puppeteer 환경변수 설정
# 위에서 설치한 시스템 chromium을 사용하도록 경로를 지정합니다.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["python", "server.py"]