import { test, expect, type APIRequestContext } from '@playwright/test';
import { buildUser, createAuthedContext, getApiBaseUrl, installErrorCollection, installGlobalDialogAutoAccept, registerViaApi } from './_e2eUtils';

async function createPostViaApi(request: APIRequestContext, accessToken: string, post: { title: string; description: string }) {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '');
    const resp = await request.post(`${baseUrl}/posts/create/`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        data: {
            title: post.title,
            description: post.description,
            category: 'tech',
            view_type: 'public',
            location: '',
            requirements: ['Playwright'],
            tags: ['e2e'],
        },
    });
    const text = await resp.text();
    expect(resp.status(), `Create post API returned ${resp.status()} :: ${text}`).toBe(201);
    return JSON.parse(text);
}

test('Notifications: accept collaboration request from notifications page', async ({ browser, request }) => {
    const owner = buildUser('notif_owner');
    const collab = buildUser('notif_collab');

    const ownerAuth = await registerViaApi(request, owner);
    const collabAuth = await registerViaApi(request, collab);

    const postTitle = `Notif Post ${Date.now()}`;
    await createPostViaApi(request, ownerAuth.access, {
        title: postTitle,
        description: 'Post used to trigger collaboration notification',
    });

    const ownerContext = await createAuthedContext(browser, ownerAuth);
    const collabContext = await createAuthedContext(browser, collabAuth);

    const ownerPage = await ownerContext.newPage();
    const collabPage = await collabContext.newPage();

    installGlobalDialogAutoAccept(ownerPage);
    installGlobalDialogAutoAccept(collabPage);

    const ownerErrors = installErrorCollection(ownerPage, { label: 'notif-owner' });
    const collabErrors = installErrorCollection(collabPage, { label: 'notif-collab' });

    // Collab finds the post and clicks Build With (triggers collaboration request)
    await collabPage.goto('/');
    await expect(collabPage.getByRole('button', { name: 'Public' })).toBeVisible({ timeout: 30_000 });
    await expect(collabPage.getByText(postTitle)).toBeVisible({ timeout: 60_000 });

    const postCard = collabPage.locator('a', { hasText: postTitle }).first();
    await postCard.getByRole('button', { name: /Build With/i }).click();

    // Owner goes to notifications and accepts
    await ownerPage.goto('/notifications');
    await expect(ownerPage.getByRole('heading', { name: 'Notifications' })).toBeVisible({ timeout: 30_000 });

    const acceptButton = ownerPage.getByRole('button', { name: /^Accept$/ }).first();
    await expect(acceptButton).toBeVisible({ timeout: 60_000 });
    await acceptButton.click();

    await ownerPage.waitForURL(/\/messages\?convo=/, { timeout: 30_000 });
    await expect(ownerPage.getByPlaceholder('Type a message...')).toBeVisible({ timeout: 30_000 });

    await ownerErrors.assertNoHardErrors();
    await collabErrors.assertNoHardErrors();

    await ownerContext.close();
    await collabContext.close();
});
