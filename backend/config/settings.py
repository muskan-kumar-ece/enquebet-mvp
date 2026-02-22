"""
Django settings for ENQUEbet backend.
"""

from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url
import socket
from urllib.parse import urlparse
from datetime import timedelta

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-this-in-production')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()]

# Application definition
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'cloudinary',
    'cloudinary_storage',
    'channels',
    
    # Local apps
    'apps.users',
    'apps.posts',
    'apps.collaboration',
    'apps.chats',
    'apps.notifications.apps.NotificationsConfig',
    'apps.search',
    'apps.uploads',
    'apps.contributions',
    'apps.research',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Channel Layers — use Redis in production, in-memory for dev
_redis_url = os.getenv('UPSTASH_REDIS_URL') or os.getenv('REDIS_URL', '')
if _redis_url and not DEBUG:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [_redis_url],
            },
        }
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        }
    }

def _use_sqlite_database() -> dict:
    return {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# Database (Supabase PostgreSQL) with safe local fallback
database_url = os.getenv('DATABASE_URL')
force_sqlite = os.getenv('USE_SQLITE', '').strip().lower() in ('1', 'true', 'yes', 'y')

if force_sqlite:
    DATABASES = _use_sqlite_database()
elif database_url:
    # If the configured DB host isn't reachable (common in offline/dev setups), fall back to SQLite.
    try:
        parsed = urlparse(database_url)
        hostname = parsed.hostname
        if hostname:
            socket.gethostbyname(hostname)
        DATABASES = {
            'default': dj_database_url.parse(database_url, conn_max_age=600)
        }
    except Exception:
        # Keep dev/test usable without external connectivity.
        DATABASES = _use_sqlite_database()
else:
    DATABASES = _use_sqlite_database()

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Cloudinary configuration — supports both individual env vars and CLOUDINARY_URL.
_cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
_api_key = os.environ.get('CLOUDINARY_API_KEY', '')
_api_secret = os.environ.get('CLOUDINARY_API_SECRET', '')
_cloudinary_url = os.environ.get('CLOUDINARY_URL', '')

import cloudinary

if _cloud_name and _api_key and _api_secret:
    # Preferred: explicit env vars
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': _cloud_name,
        'API_KEY': _api_key,
        'API_SECRET': _api_secret,
    }
    cloudinary.config(
        cloud_name=_cloud_name,
        api_key=_api_key,
        api_secret=_api_secret,
        secure=True,
    )
    _default_file_backend = 'cloudinary_storage.storage.MediaCloudinaryStorage'
elif _cloudinary_url:
    # Fallback: parse CLOUDINARY_URL (cloudinary://key:secret@cloud_name)
    cloudinary.config(cloudinary_url=_cloudinary_url)
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': cloudinary.config().cloud_name or '',
        'API_KEY': cloudinary.config().api_key or '',
        'API_SECRET': cloudinary.config().api_secret or '',
    }
    _default_file_backend = 'cloudinary_storage.storage.MediaCloudinaryStorage'
else:
    # No Cloudinary configured — use local file storage (dev/test).
    _default_file_backend = 'django.core.files.storage.FileSystemStorage'

# Django 5.x unified STORAGES dict (replaces deprecated STATICFILES_STORAGE / DEFAULT_FILE_STORAGE)
STORAGES = {
    'default': {
        'BACKEND': _default_file_backend,
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    },
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# CORS Settings
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000'
).split(',')
CORS_ALLOWED_ORIGINS = [o.strip() for o in CORS_ALLOWED_ORIGINS if o.strip()]
CORS_ALLOW_CREDENTIALS = True

# CSRF — required since Django 4.0 for cross-origin POST requests
CSRF_TRUSTED_ORIGINS = os.getenv(
    'CSRF_TRUSTED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000'
).split(',')
CSRF_TRUSTED_ORIGINS = [o.strip() for o in CSRF_TRUSTED_ORIGINS if o.strip()]

# Redis (Upstash)
REDIS_URL = os.getenv('UPSTASH_REDIS_URL', 'redis://localhost:6379')
