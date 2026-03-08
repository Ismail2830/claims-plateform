# ─── Build stage ──────────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer-cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and pre-trained model artefacts
COPY main.py predict.py ./
COPY risk_scoring_model.pkl label_encoder.pkl ./

# Render assigns the port via the $PORT env variable
ENV PORT=8000

EXPOSE 8000

# Start with 1 worker — fine for a lightweight ML microservice on a free tier
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1
