# AgroGuide Technical Architecture & Developer Map

This file details the system structure, data flow diagrams, and architectural layout of the production-ready AgroGuide AI platform.

---

## 1. Directory Structural Map

```text
voice-assistant/
├── .github/
│   └── workflows/
│       └── ci-cd.yml             # Github Actions Automated Workflow Configuration
├── backend/
│   ├── cache/
│   │   └── redisClient.js        # Redis connector with local memory backup fallback
│   ├── config/
│   │   └── db.js                 # MongoDB connection logic
│   ├── controllers/
│   │   ├── authController.js     # User registration and secure cookies management
│   │   └── visionController.js   # Main RAG grounded OpenCV/YOLO diagnostic executor
│   ├── logging/
│   │   └── logger.js             # Structured JSON logger to app.log & error.log
│   ├── middleware/
│   │   ├── csrf.js               # CSRF double-submit token validator middleware
│   │   └── loggingMiddleware.js  # Request ID injection and latency observer
│   ├── monitoring/
│   │   └── performance.js        # prom-client metrics setup for Prometheus
│   ├── schedulers/
│   │   └── backup.js             # MongoDB backup schedule & Redis snapshots triggers
│   ├── server.js                 # Core express API wrapper routing entrypoint
│   ├── package.json              # Backend dependencies, Jest, and script maps
│   └── Dockerfile                # Production multi-stage node builder config
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── LoadingBubble.test.jsx # RTL/Vitest front-end test suite
│   │   └── tests/
│   │       └── setup.js          # jsdom environment configuration
│   ├── package.json              # React application packages
│   └── Dockerfile                # Multi-stage builder compiling React/Nginx
├── vision-service/
│   ├── tests/
│   │   └── test_main.py          # Pytest image diagnostic validation mocks
│   ├── main.py                   # Python FastAPI image classifier with /metrics
│   ├── requirements.txt          # Python packages (pytest, prometheus-client)
│   └── Dockerfile                # Optimized slim python multi-stage execution container
├── nginx/
│   └── nginx.conf                # Nginx proxy mapping routes and alias folders
├── prometheus/
│   └── prometheus.yml            # Prometheus host targets scrapes config
├── grafana/
│   ├── provisioning/
│   │   ├── dashboards/
│   │   └── datasources/
│   └── dashboards/
│       └── agroguide-dashboard.json # Grafana visual monitoring parameters JSON
└── docker-compose.yml            # Production containers composition orchestrator
```

---

## 2. Production System Architecture

```mermaid
graph TD
    User([Farmer Browser Client]) -->|Port 80/443| Nginx[Nginx Gateway Reverse Proxy]
    
    Nginx -->|Static Assets / uploads| Static[Static Files /uploads alias]
    Nginx -->|/api/*| Backend[Express Backend API Server]
    Nginx -->|/api/vision-raw/*| FastAPI[Python FastAPI Vision Classifier]
    
    subgraph "Internal Private Network"
        Backend -->|Fetch / Store data| MongoDB[(MongoDB Production Cluster)]
        Backend -->|Caches / Jobs queues| Redis[(Redis Caching & Queue Pool)]
        Backend -->|Trigger diagnostic checks| FastAPI
        
        %% Workers
        BullMQWorker[BullMQ Dedicated Worker] -->|Listen jobs| Redis
        BullMQWorker -->|Dispatch SMS Alerts| Notifications[Notification Database]
        
        CronWorker[Cron Scheduler] -->|Trigger schedules| Redis
        CronWorker -->|Daily backup dumps| Backup[Data Backups backups/]
    end
    
    subgraph "External Integration Layer"
        Backend -->|Multimodal Diagnostic prompts| Gemini[Gemini Pro API]
        Backend -->|Live conditions checking| Weather[OpenWeather API]
    end
    
    subgraph "Monitoring System"
        Prometheus[Prometheus Metrics Scraper] -->|Polls /metrics| Backend
        Prometheus -->|Polls /metrics| FastAPI
        Grafana[Grafana Dashboards Visualization] -->|Reads| Prometheus
    end
```

---

## 3. Deployment Flow & CI/CD Pipeline

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as GitHub Code Repository
    participant Action as GitHub Actions CI Pipeline
    participant Docker as Docker Hub / Registry
    participant Cloud as Cloud Hosts (Vercel / Railway / Render)

    Dev->>Git: git push changes
    Git->>Action: Trigger Workflow
    Note over Action: Run Linting (ESLint, flake8)<br/>Run Unit Tests (Jest, Vitest, Pytest)<br/>Verify Code Coverage Reports
    alt Build fails
        Action-->>Git: Report Failures (Block Merge)
    else Build succeeds
        Action->>Docker: Compile & Build multi-stage Docker Images
        Action->>Cloud: Dispatch CD Deploy hooks
        Note over Cloud: Pull updated images & restart containers
    end
```
