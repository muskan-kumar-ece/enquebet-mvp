# ENQUEbet Setup Checklist

## ✅ Completed Steps

### Backend
- [x] Django project structure created
- [x] All 10 apps configured (users, posts, collaboration, chats, notifications, etc.)
- [x] Models defined for all features
- [x] API views and serializers created
- [x] URLs configured
- [x] Settings configured (Supabase, Cloudinary, CORS, JWT)
- [x] Migrations generated

### Frontend
- [x] Next.js 14 project with TypeScript
- [x] Tailwind CSS configured with ENQUEbet colors
- [x] 3-column layout (Sidebar, Feed, Right Panel)
- [x] Feed components (PostCreationBox, FeedTabs, PostCard)
- [x] API client library created
- [x] Login/Register pages built
- [x] Environment variables configured

## ⏳ Remaining Steps

### 1. Database Setup (IMPORTANT!)

**Check your `.env` file:**
```bash
cd backend
cat .env  # or open in editor
```

Your `.env` should have:
```
DATABASE_URL=postgresql://postgres:YOUR-PASSWORD@db.xxx.supabase.co:5432/postgres
```

**If you see any migration errors**, it's likely because:
- DATABASE_URL is not set correctly
- You're using the default SQLite database

**To fix:**
1. Open `backend/.env`
2. Add your Supabase connection string (get from Supabase Dashboard → Settings → Database)
3. Run migrations again:
   ```bash
   python manage.py migrate
   ```

### 2. Create Admin User

```bash
cd backend
python manage.py createsuperuser
```

Enter:
- Email: your@email.com
- Username: admin
- Full name: Admin User
- Password: (your choice)

### 3. Start Backend Server

```bash
cd backend
# Option A: Django dev server
python manage.py runserver 127.0.0.1:8000

# Option B (recommended on Windows / for WebSockets): Daphne (ASGI)
daphne -b 127.0.0.1 -p 8000 config.asgi:application
```

Should see: `Starting development server at http://127.0.0.1:8000/`

### 4. Test Full Stack

**Frontend is already running on http://localhost:3000**

Test this flow:
1. Visit http://localhost:3000/auth/register
2. Create an account
3. Login
4. Create a post
5. Test "Build With" button

## 🚀 Next Development Tasks

### Core Features to Build
- [ ] Search page (matching screenshot)
- [ ] Notifications page with collaboration requests
- [ ] Messages/Chat interface
- [ ] Profile page with editable skills
- [ ] Post detail page with comments
- [ ] Create Post page (full form)

### API Integrations Needed
- [ ] Connect Feed to real API (currently showing sample data)
- [ ] Implement real-time notifications
- [ ] Add file upload (Cloudinary)
- [ ] Connect chat system

### Deployment
- [ ] Backend to Railway
- [ ] Frontend to Vercel
- [ ] Configure production environment variables

## 📝 Quick Commands

**Start both (Windows/PowerShell):**
```powershell
./dev.ps1
```

**Backend:**
```bash
# Run server
python manage.py runserver

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

**Frontend:**
```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🐛 Common Issues

**1. Migration Error "relation already exists"**
- Solution: Check DATABASE_URL in `.env`

**2. CORS Error in Frontend**
- Solution: Verify `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`

**3. 401 Unauthorized on API calls**
- Solution: Register/login first to get JWT token

**4. Frontend not connecting to backend**
- Solution: Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`

**5. Windows: Register/Login stuck or requests hang**
- Solution: Use `127.0.0.1` (not `localhost`) for API/WS URLs and run backend bound to IPv4 (see Step 3).
