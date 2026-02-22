import { test, expect } from '@playwright/test';
import { buildUser, installErrorCollection, installGlobalDialogAutoAccept } from './_e2eUtils';
import { createPostViaUI, loginViaUI, registerViaUI } from './_flows';

test('Settings: update username, privacy, change password, and logout/login', async ({ page }) => {
    installGlobalDialogAutoAccept(page);
    const errors = installErrorCollection(page, { label: 'settings' });

    const user = buildUser('settings');
    await registerViaUI(page, user);

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 30_000 });

    const newUsername = `${user.username}_u`;

    await page.locator('label:has-text("Username")').locator('..').locator('input').fill(newUsername);

    const saveAccountRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'PUT' && resp.url().includes('/users/me/');
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: 'Save Account' }).click();
    const saveAccountResp = await saveAccountRespPromise;
    expect(saveAccountResp.status(), `Update account API returned ${saveAccountResp.status()}`).toBeGreaterThanOrEqual(200);
    expect(saveAccountResp.status(), `Update account API returned ${saveAccountResp.status()}`).toBeLessThan(300);

    await expect(page.getByText('Account updated')).toBeVisible({ timeout: 30_000 });

    // Privacy toggle
    const privacyCheckbox = page.locator('input[type="checkbox"]').first();
    await privacyCheckbox.check();

    const privacyRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'PUT' && resp.url().includes('/users/me/');
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: 'Save Privacy' }).click();
    const privacyResp = await privacyRespPromise;
    expect(privacyResp.status(), `Update privacy API returned ${privacyResp.status()}`).toBeGreaterThanOrEqual(200);
    expect(privacyResp.status(), `Update privacy API returned ${privacyResp.status()}`).toBeLessThan(300);

    await expect(page.getByText('Privacy settings updated')).toBeVisible({ timeout: 30_000 });

    // Change password
    const newPassword = 'NewPass123!';

    await page.getByPlaceholder('Enter current password').fill(user.password);
    await page.getByPlaceholder('Enter new password', { exact: true }).fill(newPassword);
    await page.getByPlaceholder('Re-enter new password').fill(newPassword);

    const passwordRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'PUT' && resp.url().includes('/users/me/password/');
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: 'Update Password' }).click();
    const passwordResp = await passwordRespPromise;
    expect(passwordResp.status(), `Change password API returned ${passwordResp.status()}`).toBeGreaterThanOrEqual(200);
    expect(passwordResp.status(), `Change password API returned ${passwordResp.status()}`).toBeLessThan(300);

    await expect(page.getByText('Password updated')).toBeVisible({ timeout: 30_000 });

    // Logout + login with new password
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);

    await loginViaUI(page, { email: user.email, password: newPassword });

    await errors.assertNoHardErrors();
});

test('Settings: delete all posts', async ({ page }) => {
    installGlobalDialogAutoAccept(page);
    const errors = installErrorCollection(page, { label: 'settings-delete-posts' });

    const user = buildUser('delposts');
    await registerViaUI(page, user);

    const title = `DeleteMe Post ${Date.now()}`;
    await createPostViaUI(page, {
        title,
        description: 'This post should be deleted via settings',
        requirement: 'QA',
        tag: 'playwright',
    });

    await page.goto('/profile');
    await expect(page.getByRole('button', { name: 'Your Posts' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 30_000 });

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 30_000 });

    const deletePostsRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'DELETE' && resp.url().includes('/users/me/posts/');
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: 'Delete All Posts' }).click();
    const deleteResp = await deletePostsRespPromise;
    expect(deleteResp.status(), `Delete posts API returned ${deleteResp.status()}`).toBe(204);

    await expect(page.getByText('All posts deleted')).toBeVisible({ timeout: 30_000 });

    await page.goto('/profile');
    await expect(page.getByText('No posts yet. Share your first idea!')).toBeVisible({ timeout: 30_000 });

    await errors.assertNoHardErrors();
});

test('Settings: delete account', async ({ page }) => {
    installGlobalDialogAutoAccept(page);
    const errors = installErrorCollection(page, { label: 'settings-delete-account' });

    const user = buildUser('delacct');
    await registerViaUI(page, user);

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 30_000 });

    const deleteAccountRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'DELETE' && resp.url().includes('/users/me/');
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: 'Delete Account' }).click();
    const deleteAccountResp = await deleteAccountRespPromise;
    expect(deleteAccountResp.status(), `Delete account API returned ${deleteAccountResp.status()}`).toBe(204);

    await expect(page).toHaveURL(/\/auth\/register$/);

    const access = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(access).toBeNull();

    await errors.assertNoHardErrors();
});
