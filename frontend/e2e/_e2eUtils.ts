import { expect, type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test';

export type TestUser = {
    fullName: string;
    username: string;
    email: string;
    password: string;
};

type RegisterResponse = {
    access: string;
    refresh: string;
    user: any;
};

export const APP_ROUTES = [
    '/',
    '/auth/login',
    '/auth/register',
    '/create',
    '/search',
    '/notifications',
    '/messages',
    '/collaboration',
    '/profile',
] as const;

export function uniqueId(prefix = 't') {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const rand = Math.random().toString(16).slice(2, 8);
    return `${prefix}_${ts}_${rand}`;
}

export function buildUser(prefix = 'user'): TestUser {
    const id = uniqueId(prefix);

    // Usernames are often length-limited; make sure we keep the random suffix.
    const maxUsernameLen = 30;
    const rand = Math.random().toString(16).slice(2, 10); // 8 hex chars
    const headMax = Math.max(1, maxUsernameLen - (rand.length + 1));
    const head = `${prefix}_${id}`.slice(0, headMax).replace(/_+$/g, '');
    const username = `${head}_${rand}`;

    return {
        fullName: `${prefix} ${id}`,
        username,
        email: `${prefix}_${id}@example.com`,
        password: 'TestPass123!',
    };
}

export function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getApiBaseUrl() {
    return process.env.PW_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
}

export async function registerViaApi(request: APIRequestContext, user: TestUser): Promise<RegisterResponse> {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '');
    const resp = await request.post(`${baseUrl}/auth/register/`, {
        data: {
            email: user.email,
            username: user.username,
            full_name: user.fullName,
            password: user.password,
            password_confirm: user.password,
        },
    });

    const text = await resp.text();
    expect(resp.status(), `Register API returned ${resp.status()} :: ${text}`).toBe(201);

    let json: any;
    try {
        json = JSON.parse(text);
    } catch {
        json = {};
    }

    expect(json?.access, 'Register response missing access token').toBeTruthy();
    expect(json?.refresh, 'Register response missing refresh token').toBeTruthy();
    expect(json?.user, 'Register response missing user').toBeTruthy();

    return json as RegisterResponse;
}

export async function createAuthedContext(browser: Browser, auth: RegisterResponse): Promise<BrowserContext> {
    const context = await browser.newContext();
    await context.addInitScript((payload: any) => {
        // Prevent WebSocket connections from accumulating across many tests.
        localStorage.setItem('disableWS', '1');
        localStorage.setItem('accessToken', payload.access);
        localStorage.setItem('refreshToken', payload.refresh);
        localStorage.setItem('user', JSON.stringify(payload.user));
    }, auth);
    return context;
}

export function installGlobalDialogAutoAccept(page: Page) {
    page.on('dialog', async (dialog) => {
        try {
            await dialog.accept();
        } catch {
            // ignore
        }
    });
}

export type CollectedIssue = {
    type: 'pageerror' | 'console.error' | 'api.5xx' | 'requestfailed' | 'warning';
    message: string;
};

export function installErrorCollection(page: Page, opts?: { label?: string }) {
    const issues: CollectedIssue[] = [];
    const label = opts?.label ? `[${opts.label}] ` : '';

    page.on('pageerror', (err) => {
        issues.push({ type: 'pageerror', message: `${label}${String(err)}` });
    });

    page.on('console', (msg) => {
        const type = msg.type();
        const text = msg.text();

        // Ignore noisy dev-only messages.
        if (type === 'info' && text.includes('Download the React DevTools')) return;
        if (type === 'log' && text.includes('[HMR]')) return;

        if (type === 'error') {
            issues.push({ type: 'console.error', message: `${label}${text}` });
        }
    });

    page.on('requestfailed', (req) => {
        const url = req.url();
        const errText = req.failure()?.errorText || 'requestfailed';

        // Next.js/App Router often aborts requests during transitions.
        if (errText.includes('net::ERR_ABORTED')) {
            issues.push({ type: 'warning', message: `${label}${req.method()} ${url} :: ${errText}` });
            return;
        }

        // Treat API/network failures as real issues.
        if (url.includes('/api/')) {
            issues.push({ type: 'requestfailed', message: `${label}${req.method()} ${url} :: ${errText}` });
        }
    });

    page.on('response', (resp) => {
        const url = resp.url();
        if (url.includes('/api/') && resp.status() >= 500) {
            issues.push({ type: 'api.5xx', message: `${label}${resp.status()} ${url}` });
        }
    });

    async function assertNoHardErrors() {
        const hard = issues.filter((i) => i.type !== 'warning');
        expect(hard, hard.map((i) => `${i.type}: ${i.message}`).join('\n')).toEqual([]);
    }

    return {
        issues,
        assertNoHardErrors,
    };
}

export async function gotoAndExpect(page: Page, route: string, expected: { text?: string; role?: { name: string; role: Parameters<Page['getByRole']>[0] } }) {
    await page.goto(route);
    if (expected.role) {
        await expect(page.getByRole(expected.role.role, { name: expected.role.name })).toBeVisible({ timeout: 30_000 });
    }
    if (expected.text) {
        await expect(page.getByText(expected.text)).toBeVisible({ timeout: 30_000 });
    }
}

export type ClickableProbeResult = {
    clicked: number;
    skipped: number;
    warnings: string[];
};

function shouldSkipHref(href: string | null): { skip: boolean; reason?: string } {
    if (!href) return { skip: false };

    const lower = href.toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
        return { skip: true, reason: 'external link' };
    }
    if (lower.startsWith('mailto:') || lower.startsWith('tel:') || lower.startsWith('#')) {
        return { skip: true, reason: 'non-navigational link' };
    }

    try {
        const url = new URL(href, 'http://localhost');
        const path = url.pathname;

        if (APP_ROUTES.includes(path as any)) return { skip: false };

        // Allow common dynamic/detail pages that are part of normal UX.
        const allowedPrefixes = ['/posts/', '/profile/', '/messages', '/search', '/create', '/notifications', '/collaboration', '/auth/'];
        if (allowedPrefixes.some((p) => path.startsWith(p))) return { skip: false };

        // Sidebar contains several placeholder routes; skip them so we don't hang on 404 pages.
        return { skip: true, reason: `placeholder route: ${path}` };
    } catch {
        return { skip: true, reason: 'unparseable href' };
    }
}

export async function safeClickAllClickables(page: Page, opts?: { maxToClick?: number }): Promise<ClickableProbeResult> {
    const maxToClick = opts?.maxToClick ?? 75;
    const warnings: string[] = [];

    const selector = 'button, a, [role="button"], input[type="submit"], [type="submit"]';
    const handles = await page.locator(selector).elementHandles();

    let clicked = 0;
    let skipped = 0;

    for (let i = 0; i < handles.length; i++) {
        if (clicked >= maxToClick) {
            warnings.push(`Max click limit reached (${maxToClick}); stopping early.`);
            break;
        }

        const el = handles[i];
        try {
            const isVisible = await el.evaluate((node) => {
                const style = window.getComputedStyle(node as HTMLElement);
                if (style.display === 'none' || style.visibility === 'hidden') return false;
                const rect = (node as HTMLElement).getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });

            if (!isVisible) {
                skipped++;
                continue;
            }

            const isDisabled = await el.evaluate((node) => {
                const anyNode = node as any;
                return Boolean(anyNode.disabled);
            });
            if (isDisabled) {
                skipped++;
                continue;
            }

            // Skip file inputs (handled by explicit upload tests).
            const tagName = await el.evaluate((node) => (node as HTMLElement).tagName.toLowerCase());
            if (tagName === 'input') {
                const type = await el.evaluate((node) => (node as HTMLInputElement).type);
                if (type === 'file') {
                    skipped++;
                    continue;
                }
            }

            // Skip obvious destructive actions.
            const name = (await el.innerText().catch(() => '')) || (await el.getAttribute('aria-label').catch(() => null)) || '';
            const lower = name.toLowerCase();
            if (lower.includes('logout') || lower.includes('delete') || lower.includes('remove')) {
                skipped++;
                continue;
            }

            const href = tagName === 'a' ? await el.getAttribute('href') : null;
            const skipHref = tagName === 'a' ? shouldSkipHref(href) : { skip: false };
            if (tagName === 'a' && skipHref.skip) {
                skipped++;
                warnings.push(`Skipped link at index ${i} (${skipHref.reason || 'skip'}): ${href}`);
                continue;
            }

            const beforeUrl = page.url();
            await el.click({ trial: true, timeout: 1_500 });
            await el.click({ timeout: 2_500 });
            clicked++;

            // Allow client transitions to settle.
            await page.waitForLoadState('domcontentloaded', { timeout: 3_000 }).catch(() => undefined);
            await page.waitForTimeout(75);

            const afterUrl = page.url();
            if (afterUrl !== beforeUrl) {
                // If clicking navigated away, try to return so we keep probing from the main app state.
                await page.goBack({ waitUntil: 'domcontentloaded', timeout: 3_000 }).catch(() => undefined);
                warnings.push(`Navigation during probe: ${beforeUrl} -> ${afterUrl}`);
            }
        } catch (err: any) {
            skipped++;
            warnings.push(`Click failed at index ${i}: ${String(err?.message || err)}`);
        }
    }

    return { clicked, skipped, warnings };
}
