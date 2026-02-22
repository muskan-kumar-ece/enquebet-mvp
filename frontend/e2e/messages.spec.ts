import { test, expect } from '@playwright/test';
import { buildUser, createAuthedContext, installErrorCollection, installGlobalDialogAutoAccept, registerViaApi, escapeRegExp } from './_e2eUtils';

test('Messages: start DM from profile and exchange a message', async ({ browser, request }) => {
    const owner = buildUser('dm_owner');
    const collab = buildUser('dm_collab');

    const ownerAuth = await registerViaApi(request, owner);
    const collabAuth = await registerViaApi(request, collab);

    const ownerContext = await createAuthedContext(browser, ownerAuth);
    const collabContext = await createAuthedContext(browser, collabAuth);

    const ownerPage = await ownerContext.newPage();
    const collabPage = await collabContext.newPage();

    installGlobalDialogAutoAccept(ownerPage);
    installGlobalDialogAutoAccept(collabPage);

    const ownerErrors = installErrorCollection(ownerPage, { label: 'dm-owner' });
    const collabErrors = installErrorCollection(collabPage, { label: 'dm-collab' });

    // Collab opens owner's profile and starts DM
    await collabPage.goto(`/profile/${ownerAuth.user.id}`);
    await expect(collabPage.getByRole('button', { name: 'Message' })).toBeVisible({ timeout: 30_000 });
    await collabPage.getByRole('button', { name: 'Message' }).click();
    await collabPage.waitForURL(/\/messages\?convo=/, { timeout: 30_000 });

    // Collab sends a message
    const msg = `Hello DM ${Date.now()}`;
    await collabPage.getByPlaceholder('Type a message...').fill(msg);
    await collabPage.getByRole('button', { name: /Send/i }).click();
    await expect(collabPage.getByText(msg, { exact: true }).first()).toBeVisible({ timeout: 30_000 });

    // Owner sees it
    await ownerPage.goto('/messages');
    await expect(ownerPage.getByRole('heading', { name: 'Messages', exact: true })).toBeVisible({ timeout: 30_000 });

    const convoButton = ownerPage.getByRole('button', {
        name: new RegExp(escapeRegExp(collabAuth.user.full_name || collabAuth.user.username || collab.username)),
    }).first();

    await expect(convoButton).toBeVisible({ timeout: 30_000 });
    await convoButton.click();

    await expect(ownerPage.getByText(msg, { exact: true }).first()).toBeVisible({ timeout: 30_000 });

    await ownerErrors.assertNoHardErrors();
    await collabErrors.assertNoHardErrors();

    await ownerContext.close();
    await collabContext.close();
});
