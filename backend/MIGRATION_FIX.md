# Database Migration Fix Guide

## Problem
Your database has some tables but Django's migration tracker is out of sync.

## Solution: Fresh Start (Recommended)

### Option 1: Reset Database Completely (Easiest)

If you don't have important data yet, the cleanest solution is:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to "SQL Editor"
   
2. **Run this SQL to drop all tables:**
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```

3. **Then run migrations:**
   ```bash
   python manage.py migrate
   ```

### Option 2: Sync Existing State (If you have data)

```bash
# Mark all migrations as applied for existing tables
python manage.py migrate --fake-initial

# Then apply any remaining migrations
python manage.py migrate
```

## After Migration Success

**Create superuser:**
```bash
python manage.py createsuperuser
```

**Start backend:**
```bash
python manage.py runserver
```

Then test at http://localhost:3000/auth/register!
