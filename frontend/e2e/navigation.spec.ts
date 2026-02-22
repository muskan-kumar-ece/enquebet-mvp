import { test, expect } from '@playwright/test';
import { APP_ROUTES, buildUser, createAuthedContext, installErrorCollection, installGlobalDialogAutoAccept, registerViaApi } from './_e2eUtils';

test('Navigation: core pages load and sidebar navigates', async ({ browser, request }) => {
    const user = buildUser('nav');
    const auth = await registerViaApi(request, user);
    const context = await createAuthedContext(browser, auth);
    const page = await context.newPage();

    installGlobalDialogAutoAccept(page);
    const errors = installErrorCollection(page, { label: 'nav' });

    // Verify each core route loads.
    for (const route of APP_ROUTES) {
        await test.step(`route ${route}`, async () => {
            await page.goto(route);
            await page.waitForLoadState('domcontentloaded');

            if (route === '/') {
                await expect(page.getByRole('button', { name: 'Public' })).toBeVisible({ timeout: 30_000 });
            } else if (route === '/create') {
                await expect(page.getByRole('heading', { name: 'Create New Post' })).toBeVisible({ timeout: 30_000 });
            } else if (route === '/search') {
                await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible({ timeout: 30_000 });
            } else if (route === '/notifications') {
                await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible({ timeout: 30_000 });
            } else if (route === '/messages') {
                await expect(page.getByRole('heading', { name: 'Messages', exact: true })).toBeVisible({ timeout: 30_000 });
            } else if (route === '/collaboration') {
                await expect(page.getByRole('heading', { name: 'Build With' })).toBeVisible({ timeout: 30_000 });
            } else if (route === '/profile') {
                await expect(page.getByRole('button', { name: 'Edit Profile' })).toBeVisible({ timeout: 30_000 });
            } else if (route === '/auth/login') {
                await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 30_000 });
            } else if (route === '/auth/register') {
                await expect(page.getByRole('heading', { name: 'Join ENQUEbet' })).toBeVisible({ timeout: 30_000 });
            }
        });
    }

    // Sidebar navigation (core items only)
    await page.goto('/');
    const sidebar = page.locator('aside');

    const coreNav = [
        { label: 'Home', href: '/' },
        { label: 'Search', href: '/search' },
        { label: 'Post', href: '/create' },
        { label: 'Messages', href: '/messages' },
        { label: 'Notifications', href: '/notifications' },
        { label: 'Build With', href: '/collaboration' },
        { label: 'Profile', href: '/profile' },
    ];

    for (const item of coreNav) {
        await test.step(`sidebar → ${item.label}`, async () => {
            await sidebar.getByRole('link', { name: item.label, exact: true }).click();
            await expect(page).toHaveURL(new RegExp(`${item.href.replace('/', '\\/')}($|\\?)`));
            await page.waitForLoadState('domcontentloaded');
        });
    }

    await errors.assertNoHardErrors();
    await context.close();
});
