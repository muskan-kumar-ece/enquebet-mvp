import { test, expect } from '@playwright/test';
import { buildUser, installErrorCollection, installGlobalDialogAutoAccept } from './_e2eUtils';
import { registerViaUI } from './_flows';

test('Profile: edit profile fields and save', async ({ page }) => {
    installGlobalDialogAutoAccept(page);
    const errors = installErrorCollection(page, { label: 'profile' });

    const user = buildUser('profile');
    await registerViaUI(page, user);

    await page.goto('/profile');

    await page.getByRole('button', { name: 'Edit Profile' }).click();

    await page.locator('label:has-text("Full Name")').locator('..').locator('input').fill(`${user.fullName} Updated`);
    await page.locator('label:has-text("Bio")').locator('..').locator('textarea').fill('Playwright updated bio');
    await page.locator('label:has-text("Location")').locator('..').locator('input').fill('Hyderabad');
    await page.locator('label:has-text("College")').locator('..').locator('input').fill('IIT Hyderabad');

    await page.getByRole('button', { name: /Add Skill/i }).click();
    await page.getByPlaceholder('Enter skill').last().fill('Testing');

    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Profile updated successfully!')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Edit Profile' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Playwright updated bio', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('#Testing').or(page.getByText('Testing')).first()).toBeVisible({ timeout: 30_000 });

    await errors.assertNoHardErrors();
});
