import { test, expect, type Page } from '@playwright/test';
import { escapeRegExp, installErrorCollection, installGlobalDialogAutoAccept, uniqueId } from './_e2eUtils';

async function registerViaUI(page: Page, user: { fullName: string; username: string; email: string; password: string }) {
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
        return resp.request().method() === 'POST' && resp.url().includes('/auth/register/');
    });

    await page.getByRole('button', { name: 'Register' }).click();
    const registerResp = await registerRespPromise;
    expect(registerResp.status(), `Register API returned ${registerResp.status()}`).toBe(201);

    // Avoid brittle URL matching; assert authenticated home UI.
    await expect(page.getByRole('button', { name: 'Public' })).toBeVisible({ timeout: 30_000 });
}

async function createPostViaUI(page: Page, post: { title: string; description: string }) {
    await page.addInitScript(() => {
        localStorage.setItem('disableWS', '1');
    });
    await page.goto('/create');
    await page.getByPlaceholder('Looking for a Backend Developer for SaaS Project').fill(post.title);
    await page.getByPlaceholder("Describe your idea, what you're building, and what kind of help you need...").fill(post.description);

    // Add a single requirement and tag (optional but closer to spec)
    await page.getByPlaceholder('e.g., Backend Developer with Node.js').fill('Frontend Dev');
    await page.getByPlaceholder('e.g., AI, SaaS, Mobile').fill('smoketest');

    const createRespPromise = page.waitForResponse((resp) => {
        return resp.request().method() === 'POST' && resp.url().includes('/posts/create/');
    });
    await page.getByRole('button', { name: /Create Post/i }).click();
    const createResp = await createRespPromise;
    expect(createResp.status(), `Create Post API returned ${createResp.status()}`).toBe(201);

    // Home page fetches feed client-side; wait until the tabs render, then poll for the new post.
    await expect(page.getByRole('button', { name: 'Public' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(post.title)).toBeVisible({ timeout: 60_000 });
}

test('UI smoke: build-with → accept → group chat messaging @smoke', async ({ browser }) => {
    const ts = uniqueId('smoke');
    const owner = {
        fullName: `Owner ${ts}`,
        username: `owner_${ts}`,
        email: `owner_${ts}@example.com`,
        password: 'TestPass123!',
    };
    const collab = {
        fullName: `Collab ${ts}`,
        username: `collab_${ts}`,
        email: `collab_${ts}@example.com`,
        password: 'TestPass123!',
    };

    const post = {
        title: `Smoke UI Post ${ts}`,
        description: 'Testing UI flow: Build With → notification accept → group chat messaging',
    };

    // Two separate contexts to simulate two users
    const ownerContext = await browser.newContext();
    const collabContext = await browser.newContext();

    const ownerPage = await ownerContext.newPage();
    const collabPage = await collabContext.newPage();

    installGlobalDialogAutoAccept(ownerPage);
    installGlobalDialogAutoAccept(collabPage);
    const ownerErrors = installErrorCollection(ownerPage, { label: 'smoke-owner' });
    const collabErrors = installErrorCollection(collabPage, { label: 'smoke-collab' });

    // Register both users
    await registerViaUI(ownerPage, owner);
    await createPostViaUI(ownerPage, post);

    await registerViaUI(collabPage, collab);

    // Collaborator finds the post on feed and clicks Build With
    await collabPage.goto('/');
    await expect(collabPage.getByRole('button', { name: 'Public' })).toBeVisible({ timeout: 30_000 });
    await expect(collabPage.getByText(post.title)).toBeVisible({ timeout: 60_000 });

    const postCard = collabPage.locator('a', { hasText: post.title }).first();
    await expect(postCard).toBeVisible();

    await postCard.getByRole('button', { name: /Build With/i }).click();

    // Owner accepts the collaboration request from notifications
    await ownerPage.goto('/notifications');
    await expect(ownerPage.getByRole('heading', { name: 'Notifications' })).toBeVisible({ timeout: 30_000 });

    // Find a collaboration_request notification and accept it
    const acceptButton = ownerPage.getByRole('button', { name: /^Accept$/ }).first();
    await expect(acceptButton).toBeVisible({ timeout: 60_000 });
    await acceptButton.click();

    // Should route to messages with convo param
    await ownerPage.waitForURL(/\/messages\?convo=/, { timeout: 30_000 });

    // Send a message in the auto-opened group chat
    const input = ownerPage.getByPlaceholder('Type a message...');
    await expect(input).toBeVisible();

    const ownerMsg = `Hello from owner ${ts}`;
    await input.fill(ownerMsg);
    await ownerPage.getByRole('button', { name: /Send/i }).click();
    await expect(ownerPage.getByText(ownerMsg, { exact: true }).first()).toBeVisible({ timeout: 30_000 });

    // Collaborator opens messages and sees the conversation + message
    await collabPage.goto('/messages');

    // The conversation name is "<post title> - Team" (backend naming)
    const convoName = `${post.title} - Team`;
    const convoButton = collabPage.getByRole('button', { name: new RegExp(convoName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first();

    await expect(convoButton).toBeVisible();
    await convoButton.click();

    await expect(collabPage.getByText(ownerMsg, { exact: true }).first()).toBeVisible({ timeout: 30_000 });

    await ownerErrors.assertNoHardErrors();
    await collabErrors.assertNoHardErrors();

    await ownerContext.close();
    await collabContext.close();
});
