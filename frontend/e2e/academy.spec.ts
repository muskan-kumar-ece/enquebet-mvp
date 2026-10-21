import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/samee/.gemini/antigravity/brain/1bdab028-49b6-468e-aa96-1ff82316e5b0';

test.describe('ENQUEbet Academy End-to-End Test Suite', () => {
    test('Desktop: Discovery Catalog, Search, Filtering and Detail Navigation', async ({ page }) => {
        // 1. Visit Academy Discovery Page
        await page.goto('http://localhost:3000/courses');
        await page.waitForLoadState('networkidle');

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
        await page.waitForLoadState('networkidle');

        // Verify Course Detail Elements
        await expect(page.locator('h1').first()).toContainText('Full-Stack SaaS Engineering');
        await expect(page.locator('text=The Capstone Deliverable')).toBeVisible();
        await expect(page.locator('text=Curriculum Syllabus')).toBeVisible();

        // Take course detail screenshot
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'academy_03_course_detail.png'), fullPage: true });

        // 4. Click Preview Lesson
        const previewLesson = page.locator('a:has-text("Monorepo Setup & System Boundaries")').first();
        await expect(previewLesson).toBeVisible();
        await previewLesson.click();
        await page.waitForLoadState('networkidle');

        // Verify Lesson Player
        await expect(page.locator('text=Back to Overview')).toBeVisible();
        await expect(page.locator('header h1')).toContainText('Monorepo Setup & System Boundaries');
        await expect(page.locator('button:has-text("Mark Complete")')).toBeVisible();

        // Take lesson player screenshot
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'academy_04_lesson_player.png'), fullPage: true });
    });

    test('Mobile Ergonomics: Responsive Discovery and Lesson Viewing', async ({ page }) => {
        // Set mobile viewport (iPhone 14)
        await page.setViewportSize({ width: 390, height: 844 });

        // 1. Visit Catalog on Mobile
        await page.goto('http://localhost:3000/courses');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('h1')).toContainText('ENQUEbet Academy');
        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'academy_05_mobile_catalog.png'), fullPage: true });

        // 2. Open Course Detail on Mobile
        const firstCard = page.locator('h2:has-text("Full-Stack SaaS Engineering")');
        await firstCard.click();
        await page.waitForLoadState('networkidle');

        await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'academy_06_mobile_course_detail.png'), fullPage: true });
    });
});
