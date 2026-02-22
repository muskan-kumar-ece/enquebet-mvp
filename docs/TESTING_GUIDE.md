# 🎉 ENQUEbet Platform - Ready to Test!

## ✅ What's Working

### Backend (http://localhost:8000)
- Django REST API running
- Database connected (Supabase PostgreSQL)
- All 20 tables created
- JWT authentication ready
- All API endpoints live

### Frontend (http://localhost:3000)
- Next.js UI running
- 3-column layout matching screenshots
- Dark theme with purple accents
- Login/Register pages ready

## 🚀 Test the Platform

## 🧪 Playwright E2E Tests (VS Code)

This repo includes an end-to-end smoke test in [frontend/e2e/smoke.spec.ts](frontend/e2e/smoke.spec.ts) that covers:
- register → create post → “Build With” → accept request → group chat message

### Run via the Playwright Test VS Code extension
1. Start both servers:
   - VS Code → Command Palette → **Tasks: Run Task**
   - Run: **Dev: Start app (backend + frontend)**
2. Open the **Testing** sidebar (beaker icon).
3. Under **Playwright Test**, select the config if prompted: `frontend/playwright.config.ts`.
4. Click the ▶ run button on the test (or the file).

### First-time setup (if you get a “browser executable doesn’t exist” error)
Run this once from the `frontend/` folder:
```bash
npx playwright install
```

### Run from terminal (same test)
```bash
cd frontend
npx playwright test e2e/smoke.spec.ts --project=chromium --reporter=line
```

### 1. Register a New Account

1. Open http://localhost:3000/auth/register
2. Fill in:
   - Full Name: Your Name
   - Username: yourusername
   - Email: your@email.com
   - Password: (minimum 8 characters)
3. Click "Register"

**Expected:** You'll be logged in and redirected to the feed!

### 2. Test the Feed

- See the 3 tabs: Public / College / Open Idea
- Try creating a post and confirm it appears in the feed
- Try “Build With” from another user and accept it in Notifications

### 3. Create an Admin Account

In backend terminal (Ctrl+C to stop server first):
```bash
python manage.py createsuperuser
```

Enter:
- Email: admin@enquebet.com
- Username: admin
- Full Name: Admin User
- Password: admin123

Then restart server:
```bash
python manage.py runserver
```

### 4. Access Django Admin

Visit: http://localhost:8000/admin

Login with admin credentials to see all database tables.

## 📋 API Endpoints Available

Test with Postman or curl:

**Auth:**
- POST http://localhost:8000/api/v1/auth/register/
- POST http://localhost:8000/api/v1/auth/login/
- GET http://localhost:8000/api/v1/auth/profile/ (requires JWT)

**Posts:**
- GET http://localhost:8000/api/v1/posts/feed/
- POST http://localhost:8000/api/v1/posts/create/ (requires JWT)

**Collaboration:**
- POST http://localhost:8000/api/v1/collaboration/request/ (requires JWT)

**Notifications:**
- GET http://localhost:8000/api/v1/notifications/ (requires JWT)

## 🎯 Next Development Steps

Now that the core platform works, you can:

1. **Build/Polish More Pages**
   - Search (with filters)
   - Notifications (with collaboration requests)
   - Profile (with edit functionality)
   - Messages/Chat
   - Post Detail with comments

3. **Add Real-time Features**
   - WebSocket for notifications
   - Live chat updates

4. **Deploy**
   - Backend → Railway
   - Frontend → Vercel
   - Update environment variables for production

## 🐛 Troubleshooting

**Can't register?**
- Check backend is running on port 8000
- Check `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`

**401 Unauthorized errors?**
- Make sure you're logged in
- Check JWT token in browser localStorage

**Frontend showing sample data?**
- Normal! Feed isn't connected to API yet
- That's the next development step

Enjoy building! 🚀
