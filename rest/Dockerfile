FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libvips-dev \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt
RUN pip install "fastapi[standard]"

COPY . .
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

CMD fastapi run main.py --port $PORT