import { test, expect, type Page } from '@playwright/test';
import {
    buildUser,
    createAuthedContext,
    installErrorCollection,
    installGlobalDialogAutoAccept,
    registerViaApi,
} from './_e2eUtils';

async function getStatCount(page: Page, label: string) {
    const box = page.getByText(label, { exact: true }).locator('..');
    const valueText = await box.locator('div').first().innerText();
    return Number(String(valueText).trim());
}

test('Follow: follow and unfollow a user', async ({ browser, request }) => {
    const followerUser = buildUser('follower');
    const targetUser = buildUser('target');

    const followerAuth = await registerViaApi(request, followerUser);
    const targetAuth = await registerViaApi(request, targetUser);

    const context = await createAuthedContext(browser, followerAuth);
    const page = await context.newPage();

    installGlobalDialogAutoAccept(page);
    const errors = installErrorCollection(page, { label: 'follow' });

    await page.goto(`/profile/${targetAuth.user.id}`);
    await expect(page.getByText(`@${targetAuth.user.username}`)).toBeVisible({ timeout: 30_000 });

    const before = await getStatCount(page, 'Followers');

    const followRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'POST' && resp.url().includes(`/users/${targetAuth.user.id}/follow/`);
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: 'Follow', exact: true }).click();
    const followResp = await followRespPromise;
    expect(followResp.status(), `Follow API returned ${followResp.status()}`).toBeGreaterThanOrEqual(200);
    expect(followResp.status(), `Follow API returned ${followResp.status()}`).toBeLessThan(300);

    await expect(page.getByRole('button', { name: 'Unfollow' })).toBeVisible({ timeout: 30_000 });

    const afterFollow = await getStatCount(page, 'Followers');
    expect(afterFollow).toBe(before + 1);

    const unfollowRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'POST' && resp.url().includes(`/users/${targetAuth.user.id}/unfollow/`);
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: 'Unfollow' }).click();
    const unfollowResp = await unfollowRespPromise;
    expect(unfollowResp.status(), `Unfollow API returned ${unfollowResp.status()}`).toBeGreaterThanOrEqual(200);
    expect(unfollowResp.status(), `Unfollow API returned ${unfollowResp.status()}`).toBeLessThan(300);

    await expect(page.getByRole('button', { name: 'Follow', exact: true })).toBeVisible({ timeout: 30_000 });

    const afterUnfollow = await getStatCount(page, 'Followers');
    expect(afterUnfollow).toBe(before);

    await errors.assertNoHardErrors();
    await context.close();
});
