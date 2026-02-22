import { defineConfig, devices } from '@playwright/test';

function numberFromEnv(name: string): number | undefined {
    const raw = process.env[name];
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
}

const stressEnabled = process.env.PW_STRESS === '1' || process.env.PW_STRESS === 'true';
const repeatEach = numberFromEnv('PW_REPEAT_EACH') ?? (stressEnabled ? 3 : 1);
// Default to 1 worker for stability against the local SQLite-backed backend.
// Opt into parallelism explicitly via PW_WORKERS (or the stress runner).
const workers = numberFromEnv('PW_WORKERS') ?? 1;
const retries = numberFromEnv('PW_RETRIES') ?? (stressEnabled ? 1 : 0);

export default defineConfig({
    testDir: './e2e',
    timeout: 120_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: workers > 1,
    repeatEach,
    retries,
    workers,
    reporter: process.env.PW_REPORTER || 'line',
    use: {
        baseURL: process.env.PW_BASE_URL || 'http://localhost:3000',
        navigationTimeout: 30_000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
