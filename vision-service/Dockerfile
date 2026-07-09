# Stage 1: Build dependency wheels
FROM python:3.10-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Final minimal execution container
FROM python:3.10-slim AS runner
WORKDIR /app

# Install runtime OS dependencies needed by OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy user installed packages from builder stage
COPY --from=builder /root/.local /root/.local
COPY . .

# Set environment PATH to access installed user CLI commands
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
