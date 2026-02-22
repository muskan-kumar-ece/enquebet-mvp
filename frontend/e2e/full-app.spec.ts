import { test, expect } from '@playwright/test';
import { buildUser, installErrorCollection, installGlobalDialogAutoAccept } from './_e2eUtils';
import { createPostViaUI, openPostFromFeed, registerViaUI } from './_flows';

test('Full app: create post → open detail → like/comment/share', async ({ page }) => {
    installGlobalDialogAutoAccept(page);
    const errors = installErrorCollection(page, { label: 'full' });

    const user = buildUser('full');
    await registerViaUI(page, user);

    const title = `Full Journey Post ${Date.now()}`;
    await createPostViaUI(page, {
        title,
        description: 'Post created for full functional test',
        requirement: 'Frontend',
        tag: 'full',
    });

    await openPostFromFeed(page, title);

    // Like
    await page.locator('button:has(svg.lucide-heart)').first().click();

    // Add comment
    const comment = `Nice idea ${Date.now()}`;
    await page.getByPlaceholder('Write a comment...').fill(comment);
    await page.getByRole('button', { name: /^Post$/ }).click();
    await expect(page.getByText(comment)).toBeVisible({ timeout: 30_000 });

    // Share (clipboard) should not crash
    await page.context().grantPermissions(['clipboard-write'], { origin: 'http://localhost:3000' });
    await page.getByRole('button', { name: 'Share' }).first().click();

    await errors.assertNoHardErrors();
});
