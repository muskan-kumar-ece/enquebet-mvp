# ENQUEbet V1 — Environment Configuration & Staging Readiness Audit Report

**Audit Date:** 16 October 2026  
**Auditor:** Senior Backend Architect, Staff Frontend Engineer, DevSecOps Lead  
**Scope:** Staging & Production Deployment Environment Configuration (Render, Vercel, Neon, Redis, Channels, Cloudinary)  
**Status:** Verification Complete — Zero Credential Leaks — All Systems Verified

---

## 1. Executive Summary

This report documents the staging and production environment configuration audit for ENQUEbet V1.

All non-negotiable safety rules were strictly adhered to:
- Zero real secrets or credentials were exposed or committed.
- No existing `.env` files were overwritten.
- No git resets or destructive operations were performed.
- All 4 core cloud infrastructure dependencies (**Neon PostgreSQL**, **Redis Channel Layer**, **Django Channels WebSockets**, and **Cloudinary Storage**) were safely verified and confirmed operational with live round-trip tests.
- Django system checks, deployment configuration checks, and Next.js production builds were executed with 100% pass rates.

---

## 2. Files Inspected

| Category | File Path | Status |
|---|---|---|
| **Django Configuration** | `backend/config/settings.py` | Inspected & hardened |
| **URL Routing & Health** | `backend/config/urls.py` | Inspected & updated with `/healthz` |
| **ASGI / Daphne** | `backend/config/asgi.py` | Inspected (supports HTTP & WebSockets) |
| **WebSocket Routing** | `backend/config/routing.py` | Inspected (`ws/notifications/`, `ws/chat/`) |
| **Deployment Scripts** | `backend/Procfile` | Inspected (`daphne -b 0.0.0.0 -p $PORT config.asgi:application`) |
| **Runtime Specs** | `backend/runtime.txt` | Inspected (`python-3.11.9`) |
| **Python Dependencies** | `backend/requirements.txt` | Inspected (Channels 4.0.0, channels-redis 4.1.0, Daphne 4.0.0) |
| **Frontend API Client** | `frontend/lib/api.ts` | Inspected (uses `NEXT_PUBLIC_API_URL`) |
| **Frontend WebSockets** | `frontend/lib/websocket.ts` | Inspected (uses `NEXT_PUBLIC_WS_URL`) |
| **Frontend Uploads** | `frontend/components/ui/ImageUpload.tsx` | Inspected |
| **Git Ignore Rules** | `.gitignore`, `backend/.gitignore`, `frontend/.gitignore` | Inspected & hardened |

---

## 3. Files Created or Modified

### Modified Files:
1. `backend/config/settings.py`:
   - Added automatic Render environment detection (`IS_RENDER` via `RENDER` env var).
   - Enforced `DEBUG=False` in Render/production by default while preserving local ergonomics.
   - Protected `SECRET_KEY` in production against insecure defaults during server boot.
   - Added automatic inclusion of `RENDER_EXTERNAL_HOSTNAME` in `ALLOWED_HOSTS`.
   - Updated `CHANNEL_LAYERS` to read `REDIS_URL` first (with fallback to `UPSTASH_REDIS_URL`), added connection tuning parameters (`capacity`, `expiry`), added explicit failure in production if Redis is missing, and ensured isolated in-memory channels for test suites.
   - Normalized `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` by automatically trimming whitespace and trailing slashes to prevent Django cross-origin header parsing bugs.
   - Configured safe staging defaults for HTTPS security (`SECURE_HSTS_SECONDS=0` by default until custom domain SSL is verified, avoiding accidental irreversible browser HSTS locks).
   - Added structured stdout console `LOGGING` dictionary for Render log capture.
2. `backend/config/urls.py`:
   - Added lightweight public health check endpoints (`/healthz` and `/api/health/`) returning `{"status": "ok"}` for Render zero-downtime health probes.
3. `.gitignore`:
   - Added exception `!.env.example` and `!*.env.example` so safe templates can be tracked while secret-bearing files remain strictly ignored.
4. `backend/.gitignore`:
   - Added exception `!.env.example` and `!*.env.example`.
5. `frontend/.gitignore`:
   - Added exception `!.env.example` and `!*.env.example`.

### Created Files:
1. `backend/.env.example`: Production-grade template with comprehensive variable documentation and placeholders.
2. `frontend/.env.example`: Client-safe template documenting `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`.
3. `.env.example`: Root guide directing developers to backend and frontend templates.
4. `docs/deployment/ENVIRONMENT_CONFIGURATION.md`: Comprehensive deployment guide for Render, Vercel, Neon, Redis, and Cloudinary.
5. `docs/deployment/ENVIRONMENT_CONFIGURATION_REPORT.md`: This audit and verification report.

---

## 4. Redis & Django Channels Integration

- **Endpoint Protocol:** TLS encrypted (`rediss://`).
- **Connection Variable:** Primary `REDIS_URL` with backward-compatible fallback to `UPSTASH_REDIS_URL`.
- **Installed Packages:** `channels==4.0.0`, `channels-redis==4.1.0`, `daphne==4.0.0`, `redis==5.0.1`.
- **Live Verification:**
  - Standalone TLS Redis Ping: **`PONG: True`** (Connection verified).
  - Channels Redis Async Round-Trip: **`VERIFIED_SEND_AND_RECEIVE_SUCCESS`** (Message send and retrieval verified through `RedisChannelLayer`).
- **Credential Protection:** Zero Redis hostnames, ports, passwords, or connection URLs were printed or logged.

---

## 5. Neon PostgreSQL Database Integration

- **Connection Variable:** `DATABASE_URL`.
- **Database Engine:** PostgreSQL via `psycopg` (v3.2.1) and `dj_database_url`.
- **Serverless Pooling Support:**
  - `conn_max_age=0`: Closes request connections gracefully, preventing Neon connection pool exhaustion.
  - `CONN_HEALTH_CHECKS=True`: Pings connection before query execution, preventing stale connection exceptions when Neon auto-suspends inactive compute branches.
  - `sslmode=require`: Mandatory SSL mode for all database connections.
- **Live Verification:**
  - Live Non-Destructive Query: `SELECT 1;` -> **`DATABASE_PING_STATUS: OK, result: 1`**.
  - Migration State: `makemigrations --check --dry-run` -> **`No changes detected`** (All models 100% in sync).

---

## 6. Cloudinary Media Storage Integration

- **Configuration:** Supports both explicit keys (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) and single URL (`CLOUDINARY_URL`).
- **Storage Backend:** `cloudinary_storage.storage.MediaCloudinaryStorage` registered under Django 5.x `STORAGES['default']`.
- **Live Verification:**
  - Cloudinary API ping: **`CLOUDINARY_PING_STATUS: OK, status: ok`**.

---

## 7. Frontend Environment Handling (Vercel)

- **API URL:** `process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1'`.
- **WebSocket URL:** `process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000'`.
- **Security Check:** Verified that no backend secrets or private database/Redis credentials exist in `frontend/` source code.
- **Build Verification:**
  - `next build` executed with Turbopack.
  - Build time: **9.9s**.
  - Generated: **22/22 static and dynamic routes** with 0 errors and 0 warnings.

---

## 8. Git & Secret File Hygiene Audit

| Check | Command | Result | Pass/Fail |
|---|---|---|---|
| Tracked `.env` files in Git | `git ls-files \| Select-String "\.env"` | 0 files found | **PASS** |
| Historical `.env` commits | `git log --all --full-history -- "**/.*env*"` | 0 commits found | **PASS** |
| `.gitignore` ignores `.env` | `git check-ignore -v .env` | Ignored by `.gitignore:4:*.env` | **PASS** |
| `.gitignore` ignores `.env.local` | `git check-ignore -v .env.local` | Ignored by `.gitignore:3:.env.*` | **PASS** |
| `.gitignore` ignores `backend/.env` | `git check-ignore -v backend/.env` | Ignored by `backend/.gitignore:4:*.env` | **PASS** |
| `.gitignore` allows `.env.example` | `git check-ignore -v backend/.env.example` | Matched `!*.env.example` (Trackable) | **PASS** |
| `.gitignore` allows `frontend/.env.example` | `git check-ignore -v frontend/.env.example` | Matched `!*.env.example` (Trackable) | **PASS** |

---

## 9. Verification Commands & Results

| # | Check | Command | Result |
|---|---|---|---|
| 1 | Django System Check | `python manage.py check` | **System check identified no issues (0 silenced)** |
| 2 | Django Deploy Check (Simulated Staging) | `python manage.py check --deploy` | **0 errors, safe staging warnings only** |
| 3 | Django Deploy Check (Full Production) | `python manage.py check --deploy` (with HSTS opts) | **System check identified no issues (0 silenced)** |
| 4 | Migration Consistency | `python manage.py makemigrations --check --dry-run` | **No changes detected** |
| 5 | Redis Connectivity Ping | `python -c "r.ping()"` | **Connected (PONG: True)** |
| 6 | Channels Redis Async Pub/Sub | `asyncio.run(test_layer())` | **VERIFIED_SEND_AND_RECEIVE_SUCCESS** |
| 7 | Neon PostgreSQL Query | `python -c "psycopg.connect(...)"` | **Connected (Result: 1)** |
| 8 | Cloudinary Ping | `python -c "cloudinary.api.ping()"` | **OK (status: ok)** |
| 9 | Frontend Production Build | `npm run build` | **Compiled successfully in 9.9s (22/22 routes)** |

---

## 10. Remaining Manual Steps for Project Owner

To deploy staging/production, execute these remaining manual actions in the respective cloud dashboards:

### 1. Render Dashboard (Backend Web Service)
1. Go to [dashboard.render.com](https://dashboard.render.com) -> New **Web Service** -> Select this repository.
2. Configure settings:
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - **Pre-Deploy Command:** `python manage.py migrate --noinput`
   - **Start Command:** `daphne -b 0.0.0.0 -p $PORT config.asgi:application`
   - **Health Check Path:** `/healthz`
3. Add Environment Variables in the **Environment** tab:
   - `DEBUG=False`
   - `SECRET_KEY` = *(generate a secure random 50+ character string)*
   - `DATABASE_URL` = *(Neon pooled PostgreSQL connection string with `?sslmode=require`)*
   - `REDIS_URL` = *(your existing TLS Redis connection string `rediss://...`)*
   - `ALLOWED_HOSTS` = `your-service.onrender.com`
   - `CORS_ALLOWED_ORIGINS` = `https://your-frontend.vercel.app`
   - `CSRF_TRUSTED_ORIGINS` = `https://your-frontend.vercel.app`
   - `CLOUDINARY_CLOUD_NAME` = *(your Cloudinary cloud name)*
   - `CLOUDINARY_API_KEY` = *(your Cloudinary API key)*
   - `CLOUDINARY_API_SECRET` = *(your Cloudinary API secret)*

### 2. Vercel Dashboard (Frontend)
1. Go to [vercel.com](https://vercel.com) -> Add New Project -> Import this repository.
2. Set **Root Directory** to `frontend`.
3. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://your-service.onrender.com/api/v1`
   - `NEXT_PUBLIC_WS_URL` = `wss://your-service.onrender.com`
4. Click **Deploy**.

### 3. Final Origin Cross-Check
Once Vercel assigns your frontend domain (e.g., `https://enquebet-app.vercel.app`), update `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in Render with the exact Vercel URL and trigger a redeploy on Render.
