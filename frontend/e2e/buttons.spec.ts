import { test, expect } from '@playwright/test';
import { buildUser, installErrorCollection, installGlobalDialogAutoAccept, safeClickAllClickables } from './_e2eUtils';
import { registerViaUI } from './_flows';

function tinyPngBuffer(): Buffer {
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X9n2kAAAAASUVORK5CYII=';
    return Buffer.from(base64, 'base64');
}

test('Buttons: dynamically click all clickables (safe) @smoke', async ({ page }) => {
    installGlobalDialogAutoAccept(page);

    // Prevent file chooser dialogs from hanging the run if a clickable opens one.
    page.on('filechooser', async (fc) => {
        try {
            await fc.setFiles({ name: 'autoclick.png', mimeType: 'image/png', buffer: tinyPngBuffer() });
        } catch {
            // Ignore: some filechoosers may no longer be active by the time we handle them.
        }
    });

    const errors = installErrorCollection(page, { label: 'autoclick' });

    const user = buildUser('autoclick');
    await registerViaUI(page, user);

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Public' })).toBeVisible({ timeout: 30_000 });

    const probe = await safeClickAllClickables(page, { maxToClick: 60 });

    await test.info().attach('autoclick-summary', {
        body: `clicked=${probe.clicked}\nskipped=${probe.skipped}\n\nWarnings:\n${probe.warnings.join('\n')}`,
        contentType: 'text/plain',
    });

    await test.info().attach('autoclick-issues', {
        body: errors.issues.map((i) => `${i.type}: ${i.message}`).join('\n'),
        contentType: 'text/plain',
    });

    // Treat pageerrors and backend failures as hard failures.
    // Console errors are noisy in dev; allow known non-fatal upload/env errors.
    const hard = errors.issues.filter((i) => {
        if (i.type === 'pageerror' || i.type === 'api.5xx' || i.type === 'requestfailed') return true;
        if (i.type === 'console.error') {
            const msg = i.message.toLowerCase();
            if (msg.includes('failed to load resource') && (msg.includes('404') || msg.includes('not found'))) return false;
            if (msg.includes('failed to upload image')) return false;
            if (msg.includes('upload error')) return false;
            return true;
        }
        return false;
    });

    expect(hard, hard.map((i) => `${i.type}: ${i.message}`).join('\n')).toEqual([]);
});
