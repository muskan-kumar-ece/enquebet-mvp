# ENQUEbet V1 — Production & Staging Environment Configuration Guide

This guide details the complete staging and production environment configuration for ENQUEbet V1 across **Render** (Backend & WebSockets), **Vercel** (Frontend), **Neon** (PostgreSQL Database), and **Redis** (Real-Time Django Channels Layer).

---

## 1. Architecture Overview

```
                      +-----------------------------+
                      |       Vercel (Frontend)     |
                      |  Next.js 16 (App Router)    |
                      +--------------+--------------+
                                     |
               HTTPS (REST API)      |      WSS (WebSockets)
                      |              |              |
                      v              v              v
+-------------------------------------------------------------------+
|                           Render.com                              |
|   Web Service: Daphne (ASGI) on Python 3.11                       |
|   - Django 5.0 REST API (/api/v1/)                                |
|   - Channels 4.0 WebSockets (/ws/chat/, /ws/notifications/)       |
|   - Healthcheck endpoint (/healthz)                               |
+-------------------+-------------------------------+---------------+
                    |                               |
                    v                               v
+-------------------------------+   +-------------------------------+
|       Neon PostgreSQL         |   |       Managed Redis           |
|  - Serverless Pooled Host     |   |  - TLS Enabled (rediss://)    |
|  - sslmode=require            |   |  - Channels Channel Layer     |
|  - conn_max_age=0             |   |  - Chat & Notification Events |
+-------------------------------+   +-------------------------------+
                    |
                    v
+-------------------------------+
|      Cloudinary Storage       |
|  - Persistent Avatars/Media   |
|  - MediaCloudinaryStorage     |
+-------------------------------+
```

---

## 2. Render Backend Web Service Configuration

### Service Setup
- **Service Type:** Web Service
- **Environment:** Python 3
- **Root Directory:** `backend` (or leave empty if executing from repository root)
- **Runtime:** `python-3.11.9` (matches `backend/runtime.txt`)
- **Health Check Path:** `/healthz` (returns `{"status": "ok"}`)

### Build & Start Commands

#### Option A: Root Directory set to `backend` in Render Settings (Recommended)
- **Build Command:**
  ```bash
  pip install --upgrade pip && pip install -r requirements.txt && python manage.py collectstatic --noinput
  ```
- **Pre-Deploy / Release Command:**
  ```bash
  python manage.py migrate --noinput
  ```
- **Start Command:**
  ```bash
  daphne -b 0.0.0.0 -p $PORT config.asgi:application
  ```

#### Option B: Root Directory left at repository root
- **Build Command:**
  ```bash
  pip install --upgrade pip && pip install -r backend/requirements.txt && python backend/manage.py collectstatic --noinput
  ```
- **Pre-Deploy / Release Command:**
  ```bash
  python backend/manage.py migrate --noinput
  ```
- **Start Command:**
  ```bash
  cd backend && daphne -b 0.0.0.0 -p $PORT config.asgi:application
  ```

### Celery Worker and Outbox Recovery Scheduler

Notification delivery uses Celery and the notification outbox. Deploy these as separate Render Background Worker services, using the same backend root directory and environment variables as the web service:

- **Delivery worker start command:** `celery -A config worker -l info`
- **Outbox scheduler start command:** `celery -A config beat -l info`

Run exactly one Beat scheduler for this application. It schedules the pending-outbox recovery task once per minute. Keep the worker and scheduler running alongside the Daphne web service; the `worker` and `beat` entries in `backend/Procfile` identify the commands for platforms that consume Procfiles, but Render services with explicit start commands must be configured separately.

### Required Render Environment Variables

| Variable Name | Required | Example / Format | Description |
|---|---|---|---|
| `RENDER` | Auto | `true` | Injected automatically by Render. Used by settings to set `DEBUG=False`. |
| `RENDER_EXTERNAL_HOSTNAME` | Auto | `your-backend.onrender.com` | Injected automatically by Render. Automatically appended to `ALLOWED_HOSTS`. |
| `DEBUG` | **Yes** | `False` | Must be `False` in staging and production. |
| `SECRET_KEY` | **Yes** | *50+ character random string* | Cryptographic secret for signing tokens and sessions. |
| `ALLOWED_HOSTS` | **Yes** | `your-backend.onrender.com,api.yourdomain.com` | Comma-separated list of hostnames without scheme. |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@ep-xyz-pooler.region.neon.tech/neondb?sslmode=require` | Pooled Neon PostgreSQL connection URL. |
| `REDIS_URL` | **Yes** | `rediss://default:pass@redis-host:6379` | TLS Redis connection string (`rediss://`). |
| `UPSTASH_REDIS_URL` | Optional | `rediss://...` | Backward-compatibility alias for `REDIS_URL`. |
| `CORS_ALLOWED_ORIGINS` | **Yes** | `https://your-frontend.vercel.app` | Comma-separated trusted frontend origins (with `https://`, no trailing slash). |
| `CSRF_TRUSTED_ORIGINS` | **Yes** | `https://your-frontend.vercel.app` | Comma-separated trusted frontend origins for CSRF protection. |
| `CLOUDINARY_CLOUD_NAME` | Recommended | `your-cloud-name` | Cloudinary account cloud name for persistent media uploads. |
| `CLOUDINARY_API_KEY` | Recommended | `your-api-key` | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Recommended | `your-api-secret` | Cloudinary API secret. |
| `SECURE_SSL_REDIRECT` | Optional | `True` | Redirects plain HTTP traffic to HTTPS behind Render proxy (default: `True`). |
| `SESSION_COOKIE_SECURE` | Optional | `True` | Enforces `Secure` flag on session cookies (default: `True`). |
| `CSRF_COOKIE_SECURE` | Optional | `True` | Enforces `Secure` flag on CSRF cookies (default: `True`). |
| `SECURE_HSTS_SECONDS` | Optional | `0` (staging) or `31536000` (prod) | HTTP Strict Transport Security. Keep `0` for staging; set to `31536000` on final custom domain. |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | Optional | `False` | Opt-in to HSTS on all subdomains. |
| `SECURE_HSTS_PRELOAD` | Optional | `False` | Opt-in to HSTS browser preloading list. |
| `DJANGO_LOG_LEVEL` | Optional | `INFO` | Console logging verbosity (`INFO`, `WARNING`, `ERROR`). |

---

## 3. Vercel Frontend Configuration

### Service Setup
- **Framework Preset:** Next.js
- **Root Directory:** `frontend`
- **Node.js Version:** 20.x or 22.x
- **Build Command:** `next build` (or `npm run build`)
- **Output Directory:** `.next` (default)

### Required Vercel Environment Variables

| Variable Name | Environment | Example / Format | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Production & Preview | `https://your-backend.onrender.com/api/v1` | Public HTTPS endpoint for Django REST API calls. |
| `NEXT_PUBLIC_WS_URL` | Production & Preview | `wss://your-backend.onrender.com` | Public Secure WebSocket endpoint (`wss://`) for Daphne/Channels. |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | Optional | `15000` | Fetch timeout in milliseconds (default: 15 seconds). |

> [!IMPORTANT]
> **Client-Side Environment Variables Notice:**
> 1. All variables prefixed with `NEXT_PUBLIC_` are baked into the client bundle at **build time**.
> 2. Whenever `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_WS_URL` is updated in Vercel, you **must trigger a redeploy** for the changes to take effect.
> 3. **NEVER** add database credentials, private API secrets, or Redis URLs to Vercel environment variables.

---

## 4. Neon PostgreSQL Database Configuration

### Connection String Configuration
Neon provides both **direct** and **pooled** connection strings:
- **Direct Connection:** `postgresql://user:pass@ep-xyz.region.neon.tech/neondb?sslmode=require`
- **Pooled Connection (Recommended):** `postgresql://user:pass@ep-xyz-pooler.region.neon.tech/neondb?sslmode=require`

### Serverless Architecture Considerations
ENQUEbet's `backend/config/settings.py` is specifically optimized for Neon:
1. `conn_max_age=0`: Closes database connections cleanly at the end of each request, preventing connection pool exhaustion when multiple ASGI Daphne workers or serverless tasks scale.
2. `CONN_HEALTH_CHECKS=True`: Validates database connectivity before executing queries, preventing stale connection errors when Neon autosuspends inactive compute branches.
3. `sslmode=require`: Mandatory for all Neon connections to ensure encrypted communication in transit.

---

## 5. Redis & Django Channels Layer Configuration

### Protocol & Encryption
- Cloud-hosted Redis endpoints (e.g. Upstash, Redis Cloud) require TLS encryption.
- The connection string **must use the `rediss://` scheme** (with double 's'):
  ```
  rediss://default:YOUR_PASSWORD@your-endpoint.region.upstash.io:6379
  ```
- Plain `redis://` should only be used for unencrypted local development (e.g. `redis://127.0.0.1:6379`).

### Channels Integration
- Channels Redis backend: `channels_redis.core.RedisChannelLayer`
- Configured with queue tuning:
  - `capacity: 1500` (max messages per channel buffer)
  - `expiry: 60` (message expiration in seconds)
- When `DEBUG=False`, Daphne will fail fast with an `ImproperlyConfigured` exception if `REDIS_URL` is missing, preventing silent real-time failures across distributed Daphne worker processes.

### Safe Redis Verification Procedure
To verify Redis connectivity without printing or exposing secrets:
```bash
python -c "import os, dotenv, redis; dotenv.load_dotenv(); url = os.getenv('REDIS_URL') or os.getenv('UPSTASH_REDIS_URL'); r = redis.Redis.from_url(url, socket_connect_timeout=5); print('PONG:', r.ping())"
```
Output:
```
PONG: True
```

---

## 6. Cloudinary Media Storage Configuration

For user avatars, project cover images, and deliverable attachments:
1. Create a Cloudinary cloud account.
2. Provide `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in Render.
3. Django's `STORAGES['default']` automatically routes all media uploads to `MediaCloudinaryStorage` with HTTPS delivery.
4. If Cloudinary credentials are not supplied, the backend falls back to local file storage for development.

---

## 7. Zero-Downtime Deployment Sequence

When deploying ENQUEbet V1 for the first time:

1. **Deploy Database (Neon):**
   - Create Neon project and obtain the `-pooler` connection string with `?sslmode=require`.
2. **Deploy Redis:**
   - Create Redis instance (Upstash or Redis Cloud) and obtain `rediss://` connection URL.
3. **Deploy Backend (Render):**
   - Create Web Service pointing to `backend/`.
   - Set all required environment variables in Render Dashboard.
   - Trigger build; Render executes `collectstatic` and `migrate` automatically via pre-deploy command.
   - Note the assigned backend URL (e.g. `https://enquebet-api.onrender.com`).
4. **Deploy Frontend (Vercel):**
   - Import repository and set root directory to `frontend`.
   - Set `NEXT_PUBLIC_API_URL=https://enquebet-api.onrender.com/api/v1`.
   - Set `NEXT_PUBLIC_WS_URL=wss://enquebet-api.onrender.com`.
   - Deploy frontend and note assigned URL (e.g. `https://enquebet.vercel.app`).
5. **Update Backend CORS/CSRF (Render):**
   - In Render, update `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` to include `https://enquebet.vercel.app`.
   - Trigger zero-downtime redeploy on Render.
