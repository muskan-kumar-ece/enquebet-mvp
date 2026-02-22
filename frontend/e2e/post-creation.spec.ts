import { test, expect } from '@playwright/test';

async function registerViaUI(page: any, user: { fullName: string; username: string; email: string; password: string }) {
    await page.addInitScript(() => {
        localStorage.setItem('disableWS', '1');
    });
    await page.goto('/auth/register');

    await page.getByPlaceholder('John Doe').fill(user.fullName);
    await page.getByPlaceholder('johndoe').fill(user.username);
    await page.getByPlaceholder('your@email.com').fill(user.email);
    await page.getByPlaceholder('At least 8 characters').fill(user.password);
    await page.getByPlaceholder('Re-enter password').fill(user.password);

    const registerResponsePromise = page.waitForResponse((resp: any) => {
        try {
            return resp.request().method() === 'POST' && resp.url().includes('/auth/register/');
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: 'Register' }).click();
    const registerResp = await registerResponsePromise;
    expect(registerResp.status(), `Register API returned ${registerResp.status()}`).toBe(201);

    // The feed tabs are a stable UI signal for “logged in”.
    await expect(page.getByRole('button', { name: 'Public' })).toBeVisible({ timeout: 30_000 });
}

function tinyPngBuffer(): Buffer {
    // 1x1 transparent PNG
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X9n2kAAAAASUVORK5CYII=';
    return Buffer.from(base64, 'base64');
}

test('Post creation: Enter does not submit or open file picker', async ({ page }) => {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const user = {
        fullName: `Enter Test ${ts}`,
        username: `enter_${ts}`,
        email: `enter_${ts}@example.com`,
        password: 'TestPass123!',
    };

    await registerViaUI(page, user);
    await page.goto('/create');

    const titleInput = page.getByPlaceholder('Looking for a Backend Developer for SaaS Project');
    const descriptionTextarea = page.getByPlaceholder("Describe your idea, what you're building, and what kind of help you need...");

    // Pressing Enter in title input should not submit and should not open file chooser.
    await titleInput.fill('Should not submit');
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 1000 }).catch(() => null);
    const createReqPromise = page
        .waitForRequest((req) => req.method() === 'POST' && req.url().includes('/posts/create/'), { timeout: 1000 })
        .catch(() => null);

    await titleInput.press('Enter');

    expect(await fileChooserPromise, 'Enter triggered file picker unexpectedly').toBeNull();
    expect(await createReqPromise, 'Enter triggered post submission unexpectedly').toBeNull();
    await expect(page).toHaveURL(/\/create$/);

    // Pressing Enter in textarea should add newline but not submit.
    await descriptionTextarea.fill('Line1');
    const createReqPromise2 = page
        .waitForRequest((req) => req.method() === 'POST' && req.url().includes('/posts/create/'), { timeout: 1000 })
        .catch(() => null);
    await descriptionTextarea.press('Enter');
    expect(await createReqPromise2, 'Textarea Enter triggered submission unexpectedly').toBeNull();
    await expect(page).toHaveURL(/\/create$/);
});

test('Post creation: media selection + Create Post works (multipart upload)', async ({ page }) => {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const user = {
        fullName: `Media Test ${ts}`,
        username: `media_${ts}`,
        email: `media_${ts}@example.com`,
        password: 'TestPass123!',
    };

    await registerViaUI(page, user);
    await page.goto('/create');

    const title = `Media Upload Post ${ts}`;
    await page.getByPlaceholder('Looking for a Backend Developer for SaaS Project').fill(title);
    await page
        .getByPlaceholder("Describe your idea, what you're building, and what kind of help you need...")
        .fill('This post is created by Playwright and includes uploaded media');

    // Select a test image (no OS file picker).
    await page.setInputFiles('[data-testid="media-input"]', {
        name: 'sample.png',
        mimeType: 'image/png',
        buffer: tinyPngBuffer(),
    });

    await expect(page.getByText('sample.png')).toBeVisible();

    const createRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'POST' && resp.url().includes('/posts/create/');
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: /Create Post/i }).click();
    const createResp = await createRespPromise;
    expect(createResp.status(), `Create post API returned ${createResp.status()}`).toBe(201);

    await page.waitForURL('**/');
    await expect(page.getByRole('button', { name: 'Public' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 60_000 });
});

test('Post creation: Ctrl+Enter in textarea submits (optional)', async ({ page }) => {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const user = {
        fullName: `CtrlEnter ${ts}`,
        username: `ctrlenter_${ts}`,
        email: `ctrlenter_${ts}@example.com`,
        password: 'TestPass123!',
    };

    await registerViaUI(page, user);
    await page.goto('/create');

    const title = `Ctrl+Enter Post ${ts}`;
    await page.getByPlaceholder('Looking for a Backend Developer for SaaS Project').fill(title);

    const textarea = page.getByPlaceholder("Describe your idea, what you're building, and what kind of help you need...");
    await textarea.fill('Submitting with Ctrl+Enter');

    const createRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'POST' && resp.url().includes('/posts/create/');
        } catch {
            return false;
        }
    });

    await textarea.press('Control+Enter');
    const createResp = await createRespPromise;
    expect(createResp.status(), `Create post API returned ${createResp.status()}`).toBe(201);
});
