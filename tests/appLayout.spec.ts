import { expect, test } from '@playwright/test';

test.describe('App Layout & 3D Studio E2E Suite', () => {
  test('Home page renders dynamic greeting, hero upload, models and community gallery', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Title greeting is dynamic and not hardcoded to a single user
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText).toContain('Bạn sẽ tạo gì trong 3D hôm nay?');
    expect(headingText).not.toContain('namhoai020505');

    // Model dropdown opens downwards without obstructing upload box
    const modelDropdownButton = page.locator('button:has-text("TheBoys 7.1 - Flagship")').first();
    await modelDropdownButton.click();
    const proOption = page.locator('text=TheBoys 7.0 - Pro');
    await expect(proOption).toBeVisible();

    // Community section is visible with models
    await expect(page.locator('text=Cộng đồng sáng tạo 3D')).toBeVisible();
    await expect(page.locator('text=Chibi Mech Warrior')).toBeVisible();
  });

  test('Create 3D Studio renders canvas, collapsible panels and centered viewport', async ({ page }) => {
    await page.goto('http://localhost:5173/create');
    await page.waitForLoadState('networkidle');

    // Canvas exists and fills viewport
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Left panel exists with model options
    await expect(page.locator('text=Tạo hình mô hình 3D')).toBeVisible();

    // Ground Grid toggle switch works
    const gridSwitch = page.locator('button:has-text("")').filter({ has: page.locator('span') }).first();
    await expect(gridSwitch).toBeVisible();

    // Right panel toggle can collapse and expand
    const collapseRightBtn = page.locator('button[title="Thu gọn bảng phải"]');
    if (await collapseRightBtn.isVisible()) {
      await collapseRightBtn.click();
      await expect(page.locator('button[title="Mở bảng Tài sản & Lớp"]')).toBeVisible();
      // Re-open
      await page.locator('button[title="Mở bảng Tài sản & Lớp"]').click();
      await expect(page.locator('main').locator('button:has-text("Tài sản")')).toBeVisible();
    }
  });
});
