"""Measure optimized endpoint latency over real HTTP to a running Daphne server.

This is a single-version HTTP measurement, not a before/after comparison.
Provide an authenticated user and (optionally) workspace explicitly; identifiers
and credentials are never printed. The script does not create benchmark data.
"""
import argparse
import math
import os
import statistics
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.db import connection
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
LOCAL_DATABASE_HOSTS = {'', 'localhost', '127.0.0.1', '::1'}


def percentile(values, fraction):
    if not values:
        raise ValueError('At least one duration is required.')
    ordered = sorted(values)
    rank = max(1, math.ceil(fraction * len(ordered)))
    return ordered[rank - 1]


def request_once(label, url, headers):
    request = urllib.request.Request(url, headers=headers)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read()
            status_code = response.status
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'{label} returned HTTP {error.code}') from error
    except Exception as error:
        raise RuntimeError(f'{label} request failed: {error}') from error

    elapsed_ms = (time.perf_counter() - started) * 1000
    if status_code != 200:
        raise RuntimeError(f'{label} returned HTTP {status_code}')
    return elapsed_ms, len(body)


def run_http_benchmark(server_url, user_id, workspace_id=None, samples=100):
    if samples < 20:
        raise ValueError('Use at least 20 warm samples; 100 or more is recommended.')

    host = (connection.settings_dict.get('HOST') or '').strip().lower()
    if host not in LOCAL_DATABASE_HOSTS:
        print('Database host: remote (host value redacted)')
    else:
        print('Database host: local')

    try:
        user = User.objects.get(pk=user_id, is_active=True)
    except User.DoesNotExist as error:
        raise ValueError('BENCHMARK_USER_ID must identify an active user in the configured database.') from error

    access_token = str(RefreshToken.for_user(user).access_token)
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json',
    }
    base = server_url.rstrip('/')
    endpoints = [
        ('Chat list', f'{base}/api/v1/chats/conversations/'),
    ]
    if workspace_id:
        endpoints.extend([
            ('Workspace detail', f'{base}/api/v1/workspaces/{workspace_id}/'),
            ('Workspace task list', f'{base}/api/v1/workspaces/{workspace_id}/tasks/'),
        ])

    print(f'Target: {base}; warm samples per endpoint: {samples}; one discarded warm-up request.')
    print('This script measures optimized HTTP paths only; it does not claim a baseline comparison.')
    print(f'{"Endpoint":<24} | {"p50 ms":>10} | {"p95 ms":>10} | {"max ms":>10} | {"bytes":>10}')
    print('-' * 77)

    for label, url in endpoints:
        request_once(label, url, headers)  # warm up connection, app, and query plans
        durations = []
        payload_sizes = []
        for _ in range(samples):
            duration, payload_size = request_once(label, url, headers)
            durations.append(duration)
            payload_sizes.append(payload_size)
        print(
            f'{label:<24} | {statistics.median(durations):>10.2f} | '
            f'{percentile(durations, 0.95):>10.2f} | {max(durations):>10.2f} | '
            f'{int(statistics.median(payload_sizes)):>10}'
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--server-url', default=os.getenv('BENCHMARK_SERVER_URL', 'http://127.0.0.1:8000'))
    parser.add_argument('--user-id', default=os.getenv('BENCHMARK_USER_ID'), required=os.getenv('BENCHMARK_USER_ID') is None)
    parser.add_argument('--workspace-id', default=os.getenv('BENCHMARK_WORKSPACE_ID'))
    parser.add_argument('--samples', type=int, default=100)
    args = parser.parse_args()
    run_http_benchmark(args.server_url, args.user_id, args.workspace_id, args.samples)


if __name__ == '__main__':
    main()
