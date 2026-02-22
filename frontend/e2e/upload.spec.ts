import { test, expect } from '@playwright/test';
import { buildUser, installErrorCollection, installGlobalDialogAutoAccept } from './_e2eUtils';
import { registerViaUI } from './_flows';

function tinyPngBuffer(): Buffer {
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X9n2kAAAAASUVORK5CYII=';
    return Buffer.from(base64, 'base64');
}

function tinyMp4Buffer(): Buffer {
    // Not a valid playable MP4, but sufficient for exercising FormData + backend file handling.
    return Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32]);
}

test('Uploads: create post with image + video attachments', async ({ page }) => {
    installGlobalDialogAutoAccept(page);
    const errors = installErrorCollection(page, { label: 'upload' });

    const user = buildUser('upload');
    await registerViaUI(page, user);

    await page.goto('/create');

    const title = `Upload Post ${Date.now()}`;
    await page.getByPlaceholder('Looking for a Backend Developer for SaaS Project').fill(title);
    await page
        .getByPlaceholder("Describe your idea, what you're building, and what kind of help you need...")
        .fill('Post created by Playwright with multiple attachments');

    await page.setInputFiles('[data-testid="media-input"]', [
        { name: 'sample.png', mimeType: 'image/png', buffer: tinyPngBuffer() },
        { name: 'sample.mp4', mimeType: 'video/mp4', buffer: tinyMp4Buffer() },
    ]);

    await expect(page.getByText('sample.png')).toBeVisible();
    await expect(page.getByText('sample.mp4')).toBeVisible();

    const createRespPromise = page.waitForResponse((resp) => {
        try {
            return resp.request().method() === 'POST' && resp.url().includes('/posts/create/');
        } catch {
            return false;
        }
    });

    await page.getByRole('button', { name: /Create Post/i }).click();
    const resp = await createRespPromise;
    expect(resp.status(), `Create post API returned ${resp.status()}`).toBe(201);

    await page.waitForURL('**/');
    await expect(page.getByText(title)).toBeVisible({ timeout: 60_000 });

    await errors.assertNoHardErrors();
});
