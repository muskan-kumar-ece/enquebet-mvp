"""
Django settings for ENQUEbet backend.
"""

from pathlib import Path
import os
import sys
from dotenv import load_dotenv
import dj_database_url
from datetime import timedelta

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

def _get_env_list(var_name: str, default: str = '') -> list[str]:
    raw = os.getenv(var_name, default)
    return [item.strip().rstrip('/') for item in raw.split(',') if item.strip()]

# Render deployment detection
IS_RENDER = os.getenv('RENDER', '').strip().lower() in ('true', '1')

# In production / Render, DEBUG must default to False unless explicitly overridden.
# In local dev, default to True for developer ergonomics.
_default_debug = 'False' if IS_RENDER else 'True'
DEBUG = os.getenv('DEBUG', _default_debug).strip().lower() in ('true', '1', 'yes')

SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if not DEBUG:
        # Don't fail build/test/migration commands, but strictly fail server boot in production
        if not any(arg in sys.argv for arg in ['test', 'collectstatic', 'check', 'makemigrations', 'migrate']):
            from django.core.exceptions import ImproperlyConfigured
            raise ImproperlyConfigured("SECRET_KEY environment variable is required in production (DEBUG=False).")
    SECRET_KEY = 'django-insecure-dev-only-local-secret-key-enquebet-mvp'

_default_hosts = 'localhost,127.0.0.1,enquebet.venopai.in,.venopai.in'
ALLOWED_HOSTS = _get_env_list('ALLOWED_HOSTS', _default_hosts)
_render_host = os.getenv('RENDER_EXTERNAL_HOSTNAME')
if _render_host and _render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_render_host)
if 'enquebet.venopai.in' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('enquebet.venopai.in')

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
    'apps.resources',
    'apps.updates',
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

# Channel Layers — use Redis in production/staging and when configured; in-memory for tests/dev fallback
USE_LOCAL_MEMORY_SERVICES = os.getenv('USE_LOCAL_MEMORY_SERVICES', '').strip().lower() in ('1', 'true', 'yes')
_redis_url = '' if USE_LOCAL_MEMORY_SERVICES else (os.getenv('REDIS_URL') or os.getenv('UPSTASH_REDIS_URL', ''))
_is_test = 'test' in sys.argv

if _is_test:
    # Test runner always uses isolated InMemoryChannelLayer
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        }
    }
elif _redis_url:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [_redis_url],
                'capacity': int(os.getenv('CHANNEL_LAYER_CAPACITY', '1500')),
                'expiry': int(os.getenv('CHANNEL_LAYER_EXPIRY', '60')),
            },
        }
    }
elif not DEBUG:
    # In production without Redis, prevent silent real-time failure on multi-worker backends
    if not any(arg in sys.argv for arg in ['test', 'collectstatic', 'check', 'makemigrations', 'migrate']):
        from django.core.exceptions import ImproperlyConfigured
        raise ImproperlyConfigured(
            "REDIS_URL or UPSTASH_REDIS_URL is required in production (DEBUG=False) for Django Channels."
        )
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        }
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        }
    }

# Cache Configuration - Upstash Redis in production; LocMem in tests/dev fallback
if _is_test:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'test-cache',
        }
    }
elif _redis_url:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': _redis_url,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'default-locmem',
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
    DATABASES = {
        'default': dj_database_url.parse(database_url, conn_max_age=0, conn_health_checks=True)
    }
    DATABASES['default']['CONN_HEALTH_CHECKS'] = True
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
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'False').strip().lower() in ('true', '1', 'yes')
_default_cors_origins = (
    'http://localhost:3000,http://127.0.0.1:3000,'
    'https://enquebet.vercel.app,https://enquebet.venopai.in,http://enquebet.venopai.in,https://venopai.in'
)
CORS_ALLOWED_ORIGINS = _get_env_list('CORS_ALLOWED_ORIGINS', _default_cors_origins)
CORS_ALLOW_CREDENTIALS = True

# Dynamic regexes for preview branches and brand domains (e.g. *.vercel.app, *.venopai.in)
_default_cors_regexes = r'^https://.*\.vercel\.app$,^https://.*\.venopai\.in$'
CORS_ALLOWED_ORIGIN_REGEXES = _get_env_list('CORS_ALLOWED_ORIGIN_REGEXES', _default_cors_regexes)

# CSRF — required since Django 4.0 for cross-origin POST requests
_default_csrf_origins = (
    'http://localhost:3000,http://127.0.0.1:3000,'
    'https://enquebet.vercel.app,https://*.vercel.app,'
    'https://enquebet.venopai.in,http://enquebet.venopai.in,https://venopai.in,https://*.venopai.in,'
    'https://enquebet-mvp-534x.onrender.com'
)
CSRF_TRUSTED_ORIGINS = _get_env_list('CSRF_TRUSTED_ORIGINS', _default_csrf_origins)

# Redis connection string (primary: REDIS_URL, fallback: UPSTASH_REDIS_URL)
REDIS_URL = _redis_url or 'redis://localhost:6379'

# Production Security Hardening
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True').strip().lower() in ('true', '1', 'yes')
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'True').strip().lower() in ('true', '1', 'yes')
    CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'True').strip().lower() in ('true', '1', 'yes')

    # HSTS configuration: Default to 0 for initial staging/preview unless explicitly configured.
    # Irreversible HSTS preload should only be activated when a custom production domain is fully verified.
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '0'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'False').strip().lower() in ('true', '1', 'yes')
    SECURE_HSTS_PRELOAD = os.getenv('SECURE_HSTS_PRELOAD', 'False').strip().lower() in ('true', '1', 'yes')
    X_FRAME_OPTIONS = os.getenv('X_FRAME_OPTIONS', 'DENY')

# Logging Configuration — structured stream output for Render & stdout
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose' if not DEBUG else 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Celery Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL') or _redis_url or 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND') or _redis_url or 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60
CELERY_TASK_ALWAYS_EAGER = _is_test
CELERY_TASK_EAGER_PROPAGATES = _is_test
CELERY_BEAT_SCHEDULE = {
    'process-pending-notification-outbox': {
        'task': 'notifications.process_pending_outbox_batch',
        'schedule': 60.0,
        'kwargs': {'limit': 100},
    },
}

