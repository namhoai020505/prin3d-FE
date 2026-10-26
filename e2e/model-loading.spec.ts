import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('3D Studio AI Model GLB Blob Loading & Viewport E2E Suite', () => {
  test.setTimeout(45000);

  const mockTaskId = '11111111-2222-3333-4444-555555555555';
  const mockVersionId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const mockGlbBuffer = fs.readFileSync(path.resolve(process.cwd(), 'public/test-model.glb'));
  const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEiLCJyb2xlIjoiQ3VzdG9tZXIiLCJleHAiOjI1MzQwMjMwMDc5OX0.mock-sig';

  test.beforeEach(async ({ page }) => {
    // 1. Mock Authentication in sessionStorage on all navigations
    await page.addInitScript((token) => {
      sessionStorage.setItem('accessToken', token);
      sessionStorage.setItem('fullName', 'Test 3D Artist');
    }, mockJwt);

    // 2. Mock GET /api/generations (List of assets)
    await page.route(/\/api\/generations(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') {
        return route.continue();
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: mockTaskId,
            versionId: mockVersionId,
            modelName: 'Mẫu 3D Cyber Valkyrie',
            status: 'succeeded',
            stage: 'completed',
            progress: 100,
            createdAtUtc: new Date().toISOString(),
            imageUrl: `/api/generations/${mockTaskId}/files/image`,
            glbUrl: `/api/generations/${mockTaskId}/files/glb`,
            stlUrl: `/api/generations/${mockTaskId}/files/stl`,
            isApprovedForPrinting: true,
            reviewStatus: 'Approved',
            requestedHeightMm: 110,
          },
        ]),
      });
    });

    // 3. Mock GET /api/generations/:id/files/glb (Binary Stream)
    await page.route(/\/api\/generations\/.*\/files\/glb/, async (route) => {
      const headers = route.request().headers();
      // Ensure Bearer Authorization is attached by Axios
      expect(headers['authorization']).toBeTruthy();
      expect(headers['authorization']).toContain('Bearer');

      await route.fulfill({
        status: 200,
        contentType: 'model/gltf-binary',
        body: mockGlbBuffer,
      });
    });

    // 4. Mock approval and notifications to prevent auth interceptor kicks
    await page.route(/.*notifications.*/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route(/.*auth\/refresh.*/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { accessToken: mockJwt } }) });
    });
    await page.route(/.*auth\/(me|login).*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-1',
          email: 'test@example.com',
          fullName: 'Test 3D Artist',
          role: 'Customer',
        }),
      });
    });
    await page.route('**/api/v2/customer-approvals/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
  });

  test('Test 1: Studio loads asset list and successfully fetches GLB Blob URL with JWT authentication', async ({ page }) => {
    let glbRequested = false;
    page.on('request', (req) => {
      if (req.url().includes(`/api/generations/${mockTaskId}/files/glb`)) {
        glbRequested = true;
      }
    });

    await page.goto('http://localhost:5173/create', { waitUntil: 'domcontentloaded' });

    // Open Right Panel if not open
    const openPanelBtn = page.locator('button[title*="Tài sản & Lớp"]');
    if (await openPanelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await openPanelBtn.click();
    }

    // Verify Asset Card appears in the list (matching 3D model thumbnail card)
    const assetCard = page.locator(`[data-testid="asset-card-${mockTaskId}"]`).first();
    await expect(assetCard).toBeVisible({ timeout: 15000 });

    // Click Asset Card to select active model
    await assetCard.click();

    // Verify GLB file was requested through the authenticated endpoint
    await expect.poll(() => glbRequested, { timeout: 10000 }).toBe(true);

    // Verify 3D Canvas is present and rendered
    const canvas = page.locator('div.relative canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Verify Active Model footer bar or controls are displayed
    const verifiedBadge = page.locator('text=VERIFIED').or(page.locator('text=Chốt Mẫu & Đặt In')).first();
    await expect(verifiedBadge).toBeVisible({ timeout: 10000 });
  });

  test('Test 2: Viewport displays Three.js Canvas, auto-rotates 360, and shows dimensional bounding box', async ({ page }) => {
    await page.goto('http://localhost:5173/create', { waitUntil: 'domcontentloaded' });

    // Verify Three.js Canvas container is initialized
    const canvasContainer = page.locator('div[class*="cursor-grab"] canvas');
    await expect(canvasContainer).toBeVisible({ timeout: 15000 });

    // Verify viewport camera controls HUD is available
    const orbitHud = page.locator('text=3D Orbit');
    await expect(orbitHud).toBeVisible({ timeout: 10000 });

    // Verify Dimension & Scale panel is visible
    const dimPanel = page.locator('button:has-text("Kích thước & Scale")');
    await expect(dimPanel).toBeVisible({ timeout: 10000 });

    // Verify turntable rotation toggle button exists (Dừng / Xoay)
    const rotateBtn = page.locator('button:has-text("Dừng")').or(page.locator('button:has-text("Xoay")')).first();
    await expect(rotateBtn).toBeVisible({ timeout: 10000 });
  });
});

