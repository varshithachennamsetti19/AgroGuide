# AgroGuide Cloud Deployment Guide

This guide details the instructions to deploy the AgroGuide AI Voice Assistant platform components onto scalable cloud infrastructure.

---

## 1. Frontend → Vercel

The React (Vite) application is optimized to run as a static Single Page Application (SPA).

1. **Prerequisites:** Sign up for a [Vercel](https://vercel.com) account and connect your GitHub repository.
2. **Project Setup:**
   - Import your repository.
   - Select the `frontend` folder as the Root Directory.
   - Framework Preset: **Vite**.
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Environment Variables:** Set the following configurations:
   - `VITE_API_URL`: Your deployed backend production URL (e.g. `https://api.agroguide.org`).
4. **Deploy:** Click **Deploy**. Vercel will automatically manage routing configurations (SPA fallbacks) and distribute assets globally via edge CDN network caching.

---

## 2. Backend & Worker Services → Railway / Render

The backend contains the API server, BullMQ workers, and Cron scheduler. It is deployed as separate instances using the same Docker context.

1. **Deploying the API Server (Express):**
   - Repository Root: `backend` (or root with Dockerfile context `./backend`).
   - Command override: None (defaults to `CMD` in Dockerfile).
   - Port: `5000`
   - Environment Variables:
     - `NODE_ENV`: `production`
     - `RUN_API`: `true`
     - `RUN_WORKERS`: `false`
     - `RUN_SCHEDULERS`: `false`
     - `MONGO_URI`: Your MongoDB Atlas URI.
     - `REDIS_URL`: Your Redis Cloud database URL.
     - `VISION_SERVICE_URL`: Your deployed Python Vision API URL.
     - `JWT_SECRET`: A secure cryptographic hash.
     - `GEMINI_API_KEY`: Your Gemini API access credentials.

2. **Deploying the BullMQ Worker Instance:**
   - Deploy as a **Background Worker Service** (no public routing / port mapping needed).
   - Environment Variables:
     - `NODE_ENV`: `production`
     - `RUN_API`: `false`
     - `RUN_WORKERS`: `true`
     - `RUN_SCHEDULERS`: `false`
     - Keep all database and credential environment configurations matching the API server.

3. **Deploying the Cron Scheduler Instance:**
   - Deploy as a **Background Worker Service**.
   - Environment Variables:
     - `NODE_ENV`: `production`
     - `RUN_API`: `false`
     - `RUN_WORKERS`: `false`
     - `RUN_SCHEDULERS`: `true`
     - Keep all database and credential environment configurations matching the API server.

---

## 3. Database Layer → MongoDB Atlas

MongoDB is managed as a cloud document database.

1. **Setup:** Create a database cluster in [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database).
2. **Network Access:** Restrict IP whitelist access to allow connections only from your backend server IPs (or open to `0.0.0.0/0` if deploying on multi-tenant serverless backends like Railway).
3. **Connection URI:** Copy the driver string:
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/agroguide?retryWrites=true&w=majority`
4. **Environment configuration:** Update your server environments with `MONGO_URI`.

---

## 4. Cache & Queue Layer → Redis Cloud

Redis holds key-value entries, BullMQ scheduler data, and user rate limiting profiles.

1. **Setup:** Spin up a Redis database on [Redis Cloud](https://redis.io/redis-enterprise-cloud/).
2. **Environment configuration:** Retrieve the endpoint host, port, and security password. Combine them into the connection string:
   `redis://default:<password>@redis-cloud-endpoint:port`
3. Update environment configurations with `REDIS_URL`.

---

## 5. Vision Service → Railway / Render / VM (FastAPI)

The Python FastAPI vision module runs OpenCV leaf validation.

1. **Prerequisites:** Create a new web service on Railway/Render using the Docker context `./vision-service` and target `Dockerfile`.
2. **Environment configuration:**
   - Port: `8000`
3. **Scaling:** Since OpenCV and image processing can be CPU intensive, configure CPU resources to at least 1 vCPU and 2GB RAM. Enable auto-scaling criteria at 75% average CPU usage.
