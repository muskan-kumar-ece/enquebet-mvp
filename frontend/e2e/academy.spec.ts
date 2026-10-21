import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/samee/.gemini/antigravity/brain/1bdab028-49b6-468e-aa96-1ff82316e5b0';

test.describe('ENQUEbet Academy End-to-End Test Suite', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('disableWS', '1');
        });
    });

    test('Desktop: Discovery Catalog, Search, Filtering and Detail Navigation', async ({ page }) => {
        // 1. Visit Academy Discovery Page
        await page.goto('http://localhost:3000/courses', { waitUntil: 'domcontentloaded' });

        // Check header and stats
        await expect(page.locator('h1')).toContainText('ENQUEbet Academy');
        await expect(page.locator('text=Project-First Academy')).toBeVisible();

        // Take catalog screenshot
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'academy_01_catalog_desktop.png'), fullPage: true });

        // 2. Test Category Filtering
        const aiCategoryBtn = page.locator('button:has-text("AI & Machine Learning")');
        if (await aiCategoryBtn.isVisible()) {
            await aiCategoryBtn.click();
            await page.waitForTimeout(500);
            await expect(page.locator('text=Applied AI & LLM Systems')).toBeVisible();
            await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'academy_02_filtered_ai.png') });
        }

        // Reset to All Disciplines
        await page.locator('button:has-text("All Disciplines")').click();
        await page.waitForTimeout(500);

        // 3. Navigate to Course Detail
        const saasCourseCard = page.locator('h2:has-text("Full-Stack SaaS Engineering")');
        await expect(saasCourseCard).toBeVisible();
        await saasCourseCard.click();

        // Verify Course Detail Elements
        await expect(page.locator('h1').first()).toContainText('Full-Stack SaaS Engineering', { timeout: 15000 });
        await expect(page.locator('text=The Capstone Deliverable')).toBeVisible();
        await expect(page.locator('text=Curriculum Syllabus')).toBeVisible();

        // Take course detail screenshot
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'academy_03_course_detail.png'), fullPage: true });

        // 4. Click Preview Lesson
        const previewLesson = page.locator('a:has-text("Monorepo Setup & System Boundaries")').first();
        await expect(previewLesson).toBeVisible();
        await previewLesson.click();

        // Verify Lesson Player
        await expect(page.locator('text=Back to Overview')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('header h1')).toContainText('Monorepo Setup & System Boundaries');
        await expect(page.locator('button:has-text("Mark Complete")')).toBeVisible();

        // Take lesson player screenshot
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'academy_04_lesson_player.png'), fullPage: true });
    });

    test('Mobile Ergonomics: Responsive Discovery and Lesson Viewing', async ({ page }) => {
        // Set mobile viewport (iPhone 14)
        await page.setViewportSize({ width: 390, height: 844 });

        // 1. Visit Catalog on Mobile
        await page.goto('http://localhost:3000/courses', { waitUntil: 'domcontentloaded' });

        await expect(page.locator('h1')).toContainText('ENQUEbet Academy');
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'academy_05_mobile_catalog.png'), fullPage: true });

        // 2. Open Course Detail on Mobile
        const firstCard = page.locator('h2:has-text("Full-Stack SaaS Engineering")');
        await expect(firstCard).toBeVisible({ timeout: 15000 });
        await firstCard.click();

        await expect(page.locator('h1').first()).toContainText('Full-Stack SaaS Engineering', { timeout: 15000 });
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'academy_06_mobile_course_detail.png'), fullPage: true });
    });

    test('Golden Bridge: Deep-Link Integration from Capstone to Project Creation', async ({ page }) => {
        // Mock authentication session for create route
        await page.addInitScript(() => {
            localStorage.setItem('accessToken', 'mock_token');
            localStorage.setItem('refreshToken', 'mock_refresh');
            localStorage.setItem('user', JSON.stringify({
                id: 'mock-user-uuid',
                email: 'mock@enquebet.com',
                username: 'mockbuilder',
                full_name: 'Mock Builder',
            }));
        });

        await page.route('**/api/v1/auth/users/me/**', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'mock-user-uuid',
                    email: 'mock@enquebet.com',
                    username: 'mockbuilder',
                    full_name: 'Mock Builder',
                    reputation_score: 50,
                }),
            });
        });

        // Visit Create page with Academy Capstone Bridge query params
        await page.goto('http://localhost:3000/create?title=Fullstack+SaaS+Platform&tags=Next.js,Django,PostgreSQL&starter_repo=https://github.com/enquebet/saas-starter&ref=academy_assignment', { waitUntil: 'domcontentloaded' });

        // Verify Golden Bridge Banner renders
        await expect(page.locator('text=Academy Capstone · Golden Bridge')).toBeVisible({ timeout: 15000 });

        // Take Golden Bridge screenshot
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'academy_07_golden_bridge.png') });
    });
});
