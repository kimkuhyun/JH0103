FROM python:3.9-slim

WORKDIR /app

# Chromium + ChromeDriver
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py .

RUN mkdir -p /app/data /app/data/images /app/data/pdfs

CMD ["python", "server.py"]
