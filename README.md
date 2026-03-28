# ENQUEbet MVP

Collaborative idea-building platform monorepo.

ENQUEbet is a web platform for posting ideas, forming teams, and collaborating on projects—combining features of LinkedIn, GitHub, and Discord to turn ideas into real projects.

## Structure

```
enquebet-mvp/
├── backend/    → Django REST Framework API (Railway deploy root)
├── frontend/   → Next.js frontend (Vercel deploy root)
├── docs/       → Project documentation
├── .gitignore
└── README.md
```

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Next.js, React 19, TypeScript, Tailwind CSS |
| Backend    | Django 5, Django REST Framework, Django Channels |
| Database   | Supabase PostgreSQL                 |
| Storage    | Cloudinary                          |
| WebSocket  | Daphne + Redis (Upstash)            |
| Auth       | JWT (SimpleJWT)                     |

## Deployment

### Railway (Backend)

- **Root directory**: `backend/`
- **Build command**: `pip install -r requirements.txt`
- **Start command**: `daphne -b 0.0.0.0 -p $PORT config.asgi:application`

Required environment variables:
```
DEBUG=False
SECRET_KEY=<your-secret-key>
DATABASE_URL=<supabase-connection-string>
ALLOWED_HOSTS=<railway-domain>
CORS_ALLOWED_ORIGINS=https://<vercel-domain>
CSRF_TRUSTED_ORIGINS=https://<vercel-domain>
CLOUDINARY_URL=<cloudinary-url>
UPSTASH_REDIS_URL=<redis-url>
```

### Vercel (Frontend)

- **Root directory**: `frontend/`
- **Framework preset**: Next.js (auto-detected)

Required environment variables:
```
NEXT_PUBLIC_API_URL=https://<railway-domain>/api/v1
NEXT_PUBLIC_WS_URL=wss://<railway-domain>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud-name>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=enquebet_uploads
```

## Local Development

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000

# Frontend
cd frontend
npm install
npm run dev
```
