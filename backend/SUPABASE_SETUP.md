# Supabase Database Setup Guide

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name:** enquebet
   - **Database Password:** (save this!)
   - **Region:** Choose closest to you
4. Wait ~2 minutes for project creation

## Step 2: Get Database Connection String

1. In your Supabase dashboard, go to **Settings** → **Database**
2. Scroll to **Connection String** section
3. Select **URI** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password

## Step 3: Update .env File

1. Open `backend/.env` (create it if it doesn't exist)
2. Add the database URL:
   ```
   DATABASE_URL=postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres
   ```

## Step 4: Run Migrations

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

This will create all 20 database tables.

## Step 5: Create Admin User

```bash
python manage.py createsuperuser
```

Enter:
- Email
- Username
- Password

## Step 6: Verify

```bash
python manage.py runserver
```

Visit http://localhost:8000/admin and login with your superuser credentials.

## Expected Tables

After migration, you should have these tables in Supabase:
- users
- user_skills
- followers
- posts
- post_attachments
- post_requirements
- post_tags
- post_collaborators
- likes
- comments
- saved_posts
- collaboration_requests
- conversations
- conversation_members
- messages
- notifications
- contributions
- research

## Troubleshooting

**Connection failed?**
- Check your password is correct
- Ensure you're using the URI format (not session mode)
- Verify Supabase project is active

**Migration errors?**
- Run `python manage.py showmigrations` to see status
- If needed: `python manage.py migrate --run-syncdb`
