import { expect, type Page } from '@playwright/test';
import { type TestUser, escapeRegExp } from './_e2eUtils';

export async function expectHomeLoaded(page: Page) {
    await expect(page.getByRole('button', { name: 'Public' })).toBeVisible({ timeout: 30_000 });
}

export async function registerViaUI(page: Page, user: TestUser) {
    await page.addInitScript(() => {
        localStorage.setItem('disableWS', '1');
    });
    await page.goto('/auth/register');

    await page.getByPlaceholder('John Doe').fill(user.fullName);
    await page.getByPlaceholder('johndoe').fill(user.username);
    await page.getByPlaceholder('your@email.com').fill(user.email);
    await page.getByPlaceholder('At least 8 characters').fill(user.password);
    await page.getByPlaceholder('Re-enter password').fill(user.password);

    const registerRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'POST' && resp.url().includes('/auth/register/');
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: 'Register' }).click();
    const registerResp = await registerRespPromise;
    expect(registerResp.status(), `Register API returned ${registerResp.status()}`).toBe(201);

    await expectHomeLoaded(page);
}

export async function loginViaUI(page: Page, creds: { email: string; password: string }) {
    await page.addInitScript(() => {
        localStorage.setItem('disableWS', '1');
    });
    await page.goto('/auth/login');

    await page.getByPlaceholder('your@email.com').fill(creds.email);
    await page.getByPlaceholder('Enter your password').fill(creds.password);

    const loginRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'POST' && resp.url().includes('/auth/login/');
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: 'Login' }).click();
    const loginResp = await loginRespPromise;
    expect(loginResp.status(), `Login API returned ${loginResp.status()}`).toBe(200);

    await expectHomeLoaded(page);
}

export async function createPostViaUI(page: Page, post: { title: string; description: string; requirement?: string; tag?: string }) {
    await page.addInitScript(() => {
        localStorage.setItem('disableWS', '1');
    });
    await page.goto('/create');

    await page.getByPlaceholder('Looking for a Backend Developer for SaaS Project').fill(post.title);
    await page.getByPlaceholder("Describe your idea, what you're building, and what kind of help you need...").fill(post.description);

    if (post.requirement) {
        await page.getByPlaceholder('e.g., Backend Developer with Node.js').fill(post.requirement);
    }
    if (post.tag) {
        await page.getByPlaceholder('e.g., AI, SaaS, Mobile').fill(post.tag);
    }

    const createRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'POST' && resp.url().includes('/posts/create/');
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: /Create Post/i }).click();
    const createResp = await createRespPromise;
    expect(createResp.status(), `Create Post API returned ${createResp.status()}`).toBe(201);

    await page.waitForURL('**/');
    await expectHomeLoaded(page);
    await expect(page.getByText(post.title)).toBeVisible({ timeout: 60_000 });
}

export async function openPostFromFeed(page: Page, title: string) {
    await page.addInitScript(() => {
        localStorage.setItem('disableWS', '1');
    });
    await page.goto('/');
    await expectHomeLoaded(page);

    const cardLink = page.locator('a', { hasText: title }).first();
    await expect(cardLink).toBeVisible({ timeout: 60_000 });
    await cardLink.click();

    await expect(page.getByRole('heading', { name: new RegExp(escapeRegExp(title)) })).toBeVisible({ timeout: 30_000 });
}

export async function searchForPost(page: Page, query: string) {
    await page.addInitScript(() => {
        localStorage.setItem('disableWS', '1');
    });
    await page.goto('/search');
    await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible({ timeout: 30_000 });

    const searchInput = page.getByPlaceholder('Search for posts, users, skills...');
    await searchInput.fill(query);

    await page.getByRole('button', { name: /^Search$/ }).click();
    await expect(page.getByText(/Found\s+\d+\s+result/i)).toBeVisible({ timeout: 30_000 });
}
