FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-cat tesseract-ocr-spa \
    poppler-utils libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ src/

CMD ["celery", "-A", "src.workers.celery_app", "worker", "--loglevel=info", "--concurrency=4"]
