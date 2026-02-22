import { test, expect } from '@playwright/test';
import { buildUser, installErrorCollection, installGlobalDialogAutoAccept, registerViaApi } from './_e2eUtils';
import { createPostViaUI, registerViaUI } from './_flows';

test('Search: finds newly created post, shows users, and filters UI works', async ({ page, request }) => {
    installGlobalDialogAutoAccept(page);
    const errors = installErrorCollection(page, { label: 'search' });

    const user = buildUser('search');
    await registerViaUI(page, user);

    const otherUser = buildUser('search_other');
    const otherAuth = await registerViaApi(request, otherUser);

    const title = `Searchable Post ${Date.now()}`;
    await createPostViaUI(page, {
        title,
        description: 'This post should be searchable',
        requirement: 'QA',
        tag: 'playwright',
    });

    await page.goto('/search');
    await expect(page.getByRole('heading', { name: 'Search', exact: true })).toBeVisible({ timeout: 30_000 });

    const input = page.getByPlaceholder('Search for posts, users, skills...');
    await input.fill('Searchable');

    // Enter triggers search
    await input.press('Enter');
    await expect(page.getByText(/Found\s+\d+\s+result/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 60_000 });

    // Search should also return users
    await input.fill(otherAuth.user.username);
    await input.press('Enter');
    await expect(page.getByText(/Found\s+\d+\s+result/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`@${otherAuth.user.username}`)).toBeVisible({ timeout: 30_000 });

    await page.getByText(`@${otherAuth.user.username}`).click();
    await expect(page).toHaveURL(new RegExp(`/profile/${otherAuth.user.id}$`));
    await expect(page.getByRole('button', { name: 'Follow', exact: true })).toBeVisible({ timeout: 30_000 });

    // Back to search to validate filters UI.
    await page.goto('/search');
    await expect(page.getByRole('heading', { name: 'Search', exact: true })).toBeVisible({ timeout: 30_000 });
    await input.fill('Searchable');
    await input.press('Enter');
    await expect(page.getByText(/Found\s+\d+\s+result/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 60_000 });

    // Filters toggle
    await page.getByRole('button', { name: 'Filters' }).click();
    await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible({ timeout: 30_000 });

    await page.locator('label:has-text("Location")').locator('..').locator('input').fill('Hyderabad');

    // Search via button
    await page.getByRole('button', { name: /^Search$/ }).click();
    await expect(page.getByText(/Found\s+\d+\s+result/i)).toBeVisible({ timeout: 30_000 });

    await errors.assertNoHardErrors();
});
