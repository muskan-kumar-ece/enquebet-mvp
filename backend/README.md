# Backend README

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your credentials:
- **DATABASE_URL**: Your Supabase PostgreSQL connection string
- **CLOUDINARY_URL**: Cloudinary API credentials
- **UPSTASH_REDIS_URL**: Redis connection string (optional)
- **SECRET_KEY**: Django secret key (generate with `django-admin` or online tool)

### 3. Run Migrations
```bash
python manage.py makemigrations 
python manage.py migrate
```

### 4. Create Superuser
```bash
python manage.py createsuperuser
```

### 5. Run Development Server
```bash
# Option A (simple): Django dev server
python manage.py runserver 127.0.0.1:8000

# Option B (recommended on Windows for stability / WebSockets): Daphne (ASGI)
daphne -b 127.0.0.1 -p 8000 config.asgi:application
```

On Windows/PowerShell you can also use the helper script:
```powershell
cd backend
./dev.ps1
```

If port 8000 is already in use:
```powershell
./dev.ps1 -Port 8001
```

Backend will be available at `http://127.0.0.1:8000`

> Note (Windows): Using `localhost` can resolve to IPv6 (`::1`) in some browsers.
> If the backend is only bound to IPv4 (`127.0.0.1`), frontend requests may hang.
> Prefer `127.0.0.1` in `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`.

## API Endpoints

### Authentication
- POST `/api/v1/auth/register/` - Register new user
- POST `/api/v1/auth/login/` - Login and get JWT
- POST `/api/v1/auth/refresh/` - Refresh JWT token
- GET `/api/v1/auth/profile/` - Get current user profile
- GET `/api/v1/auth/users/<username>/` - Get user by username

### Posts (Feed System)
- GET `/api/v1/posts/feed/?filter=public&location=Hyderabad` - Get feed with filters
- POST `/api/v1/posts/create/` - Create new post
- GET `/api/v1/posts/<post_id>/` - Get post details
- POST `/api/v1/posts/<post_id>/like/` - Like/unlike post
- GET/POST `/api/v1/posts/<post_id>/comments/` - Get/create comments
- POST `/api/v1/posts/<post_id>/save/` - Save/unsave post

### Collaboration (Build With)
- POST `/api/v1/collaboration/request/` - Send collaboration request
- POST `/api/v1/collaboration/request/<id>/accept/` - Accept (auto-creates group chat)
- POST `/api/v1/collaboration/request/<id>/decline/` - Decline request
- GET `/api/v1/collaboration/my-requests/` - Get my requests

### Messages
- GET `/api/v1/messages/conversations/` - Get all conversations
- GET/POST `/api/v1/messages/conversations/<id>/messages/` - Get/send messages

### Notifications
- GET `/api/v1/notifications/` - Get all notifications
- GET `/api/v1/notifications/unread-count/` - Get unread count
- POST `/api/v1/notifications/<id>/mark-read/` - Mark as read

## Deployment (Railway)

1. Create Railway project
2. Add PostgreSQL database
3. Add environment variables
4. Deploy from GitHub or CLI

Railway will automatically detect Django project and use `gunicorn`
