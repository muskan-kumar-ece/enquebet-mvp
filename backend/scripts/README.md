# Workspace and messaging benchmark scripts

`rigorous_benchmark.py` compares the current API response with an unannotated/unprefetched query path using the same serializers and synthetic fixture. It checks serialized payload equality before reporting query counts and latency. Timings are database-backed in-process timings; they are not HTTP or worker latency. The fixture runs in a transaction and is rolled back. The script refuses a remote database by default.

For a local isolated SQLite profile on PowerShell:

```powershell
$env:DEBUG = 'True'
$env:SECRET_KEY = 'local-benchmark-only'
$env:DATABASE_URL = 'sqlite:///C:/workflow/enquebet-mvp/backend/profile.sqlite3'
$env:USE_LOCAL_MEMORY_SERVICES = '1'
python manage.py migrate --noinput
python scripts/rigorous_benchmark.py --iterations 100
```

Use PostgreSQL for representative database query timings. Only point the script at a disposable benchmark database, then pass `--allow-remote-db`; the script creates fixture rows inside a rollback transaction. It does not print database hostnames or secrets. SQLite timings are useful for harness and serialization checks, not production latency claims.

`http_benchmark.py` measures the optimized endpoints over HTTP against a running Daphne service. It requires a user ID, and optionally a workspace ID, in the configured database; it creates a JWT in memory and does not print it. It reports one discarded warm-up and at least 20 measured samples (100 by default). This is a single-version measurement and must not be described as a before/after comparison.

```powershell
$env:BENCHMARK_USER_ID = '<active-user-id>'
$env:BENCHMARK_WORKSPACE_ID = '<workspace-id>'
python scripts/http_benchmark.py --server-url http://127.0.0.1:8000 --samples 100
```

Message delivery timing is not inferred by either read-endpoint benchmark. The notification tests verify post-commit Celery dispatch, the worker task, synchronous fallback, and scheduled recovery. A true worker latency benchmark requires a disposable database, an operational broker, and a running worker; report enqueue/request latency separately from delivery completion latency.
