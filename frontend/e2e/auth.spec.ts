import { test, expect } from '@playwright/test';
import { buildUser, installErrorCollection, installGlobalDialogAutoAccept } from './_e2eUtils';
import { loginViaUI, registerViaUI, expectHomeLoaded } from './_flows';

test('Auth: protected routes redirect to login', async ({ page }) => {
    installGlobalDialogAutoAccept(page);
    const errors = installErrorCollection(page, { label: 'auth-redirect' });

    // Home is protected via useRequireAuth; unauthenticated users are redirected.
    await page.goto('/');
    await page.waitForTimeout(250);
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

    await errors.assertNoHardErrors();
});

test('Auth: register then login works', async ({ page }) => {
    installGlobalDialogAutoAccept(page);
    const errors = installErrorCollection(page, { label: 'auth-flow' });

    const user = buildUser('auth');
    await registerViaUI(page, user);

    // Simulate a fresh session by clearing storage and verifying we get redirected.
    await page.evaluate(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    });

    await page.goto('/');
    await page.waitForTimeout(250);
    await expect(page).toHaveURL(/\/auth\/login/);

    await loginViaUI(page, { email: user.email, password: user.password });
    await expectHomeLoaded(page);

    await errors.assertNoHardErrors();
});
