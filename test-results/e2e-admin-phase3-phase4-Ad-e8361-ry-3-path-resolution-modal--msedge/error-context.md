# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\admin-phase3-phase4.spec.ts >> Admin Portal Phase 3 & 4 E2E Suite (6/6 Tests) >> Test 2: Warranty Defect Reports (table, lightbox gallery, 3-path resolution modal)
- Location: e2e\admin-phase3-phase4.spec.ts:166:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('h2:has-text("Thẩm Định Khiếu Nại")')
Expected: 0
Received: 1
Timeout:  10000ms

Call log:
  - Expect "toHaveCount" with timeout 10000ms
  - waiting for locator('h2:has-text("Thẩm Định Khiếu Nại")')
    24 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - img "THE BOYS" [ref=e7]
        - generic [ref=e8]:
          - generic [ref=e9]: THE BOYS — Admin
          - generic [ref=e10]: Trung Tâm Quản Trị
      - navigation "Admin navigation" [ref=e11]:
        - generic [ref=e12]: Phân Hệ Quản Trị
        - link "Tổng quan & Chỉ số" [ref=e13] [cursor=pointer]:
          - /url: /admin/dashboard
          - img [ref=e15]
          - generic [ref=e17]: Tổng quan & Chỉ số
        - link "Thẩm định mẫu in" [ref=e18] [cursor=pointer]:
          - /url: /admin/reviews
          - img [ref=e20]
          - generic [ref=e22]: Thẩm định mẫu in
        - link "Quản lý đơn hàng" [ref=e23] [cursor=pointer]:
          - /url: /admin/orders
          - img [ref=e25]
          - generic [ref=e27]: Quản lý đơn hàng
        - link "Điều phối xưởng" [ref=e28] [cursor=pointer]:
          - /url: /admin/fulfillment
          - img [ref=e30]
          - generic [ref=e32]: Điều phối xưởng
        - link "Giao dịch & Hoàn tiền" [ref=e33] [cursor=pointer]:
          - /url: /admin/finance
          - img [ref=e35]
          - generic [ref=e37]: Giao dịch & Hoàn tiền
        - link "Bảo hành & Khiếu nại" [ref=e38] [cursor=pointer]:
          - /url: /admin/warranty
          - img [ref=e40]
          - generic [ref=e42]: Bảo hành & Khiếu nại
        - link "Quản trị hệ thống" [ref=e43] [cursor=pointer]:
          - /url: /admin/system
          - img [ref=e45]
          - generic [ref=e47]: Quản trị hệ thống
      - generic [ref=e48]:
        - link "Về trang khách hàng" [ref=e49] [cursor=pointer]:
          - /url: /
          - img [ref=e50]
          - generic [ref=e52]: Về trang khách hàng
        - generic [ref=e53]:
          - img [ref=e55]
          - generic [ref=e57]:
            - generic [ref=e58]: THE BOYS Hub
            - generic [ref=e59]: System Administrator
    - generic [ref=e60]:
      - banner [ref=e61]:
        - button "Thu gọn sidebar" [ref=e62] [cursor=pointer]:
          - img [ref=e63]
        - generic [ref=e65]:
          - strong [ref=e66]: Bảo hành & Khiếu nại Sản phẩm
          - generic [ref=e67]: Tiếp nhận báo cáo lỗi in, thẩm định bằng chứng và xử lý đền bù
        - generic [ref=e68]:
          - button "2" [ref=e70] [cursor=pointer]:
            - img [ref=e71]
            - generic [ref=e76]: "2"
          - button "Chuyển sang light mode" [ref=e77] [cursor=pointer]:
            - img [ref=e78]
            - generic [ref=e80]: Light
          - link "Q Quản trị viên Administrator" [ref=e81] [cursor=pointer]:
            - /url: /profile
            - generic [ref=e82]: Q
            - generic [ref=e83]:
              - generic [ref=e84]: Quản trị viên
              - generic [ref=e85]: Administrator
          - button "Đăng xuất" [ref=e86] [cursor=pointer]:
            - img [ref=e87]
            - generic [ref=e89]: Đăng xuất
      - main [ref=e90]:
        - generic [ref=e91]:
          - generic [ref=e92]:
            - generic [ref=e93]:
              - generic [ref=e94]:
                - img [ref=e96]
                - heading "Bảo Hành & Khiếu Nại Sản Phẩm Lỗi" [level=1] [ref=e98]
              - paragraph [ref=e99]: Tiếp nhận hồ sơ khiếu nại, tra cứu bằng chứng ảnh lỗi và thẩm định giải quyết đền bù
            - button "Làm mới" [ref=e101] [cursor=pointer]:
              - img [ref=e102]
              - generic [ref=e104]: Làm mới
          - generic [ref=e105]:
            - generic [ref=e106]:
              - generic [ref=e107]: Tìm kiếm theo mã đơn, khách hàng hoặc lý do
              - img [ref=e108]
              - textbox "Tìm kiếm theo mã đơn, khách hàng hoặc lý do" [ref=e110]:
                - /placeholder: Tìm kiếm theo mã đơn hàng, tên khách hàng hoặc lý do khiếu nại...
            - generic [ref=e111]:
              - generic [ref=e112]: "Trạng thái:"
              - combobox "Trạng thái:" [ref=e113] [cursor=pointer]:
                - option "Tất cả khiếu nại" [selected]
                - option "Chờ thẩm định (Open / PendingReview)"
                - option "Đã duyệt in lại (ReprintApproved)"
                - option "Đã duyệt hoàn tiền (RefundApproved)"
                - option "Đã bác bỏ (Rejected)"
          - table [ref=e116]:
            - rowgroup [ref=e117]:
              - row "Mã đơn hàng Khách hàng Ngày gửi khiếu nại Lý do khiếu nại Ảnh bằng chứng Trạng thái Thao tác" [ref=e118]:
                - columnheader "Mã đơn hàng" [ref=e119]
                - columnheader "Khách hàng" [ref=e120]
                - columnheader "Ngày gửi khiếu nại" [ref=e121]
                - columnheader "Lý do khiếu nại" [ref=e122]
                - columnheader "Ảnh bằng chứng" [ref=e123]
                - columnheader "Trạng thái" [ref=e124]
                - columnheader "Thao tác" [ref=e125]
            - rowgroup [ref=e126]:
              - 'row "TB-20261025-2a49ab139b674337a291b6ead0200bc2 f02049f0-adad-43f4-8d84-d8aa4a9bad2a Demo Administrator 15:22 25/10/2026 Test Khi?u n?i t? Challenger Ghi chú: Challenger empirical verification: reprint approved for defective layer Duyệt in lại Xem Thẩm Định" [ref=e127]':
                - cell "TB-20261025-2a49ab139b674337a291b6ead0200bc2 f02049f0-adad-43f4-8d84-d8aa4a9bad2a" [ref=e128]:
                  - generic [ref=e129]:
                    - generic [ref=e130]: TB-20261025-2a49ab139b674337a291b6ead0200bc2
                    - generic [ref=e131]: f02049f0-adad-43f4-8d84-d8aa4a9bad2a
                - cell "Demo Administrator" [ref=e132]:
                  - generic [ref=e133]:
                    - img [ref=e135]
                    - generic [ref=e137]: Demo Administrator
                - cell "15:22 25/10/2026" [ref=e138]
                - 'cell "Test Khi?u n?i t? Challenger Ghi chú: Challenger empirical verification: reprint approved for defective layer" [ref=e139]':
                  - generic [ref=e140]:
                    - paragraph [ref=e141]: Test Khi?u n?i t? Challenger
                    - paragraph [ref=e142]: "Ghi chú: Challenger empirical verification: reprint approved for defective layer"
                - cell [ref=e143]:
                  - button "Click để phóng to ảnh" [ref=e145] [cursor=pointer]
                - cell "Duyệt in lại" [ref=e147]:
                  - generic [ref=e149]: Duyệt in lại
                - cell "Xem Thẩm Định" [ref=e150]:
                  - button "Xem Thẩm Định" [ref=e151] [cursor=pointer]:
                    - img [ref=e152]
                    - generic [ref=e154]: Xem Thẩm Định
              - row "TB-20261025-TEST02 a558c872-ecf1-4319-a726-74990fddaabc Demo Administrator 15:17 25/10/2026 Report 3 with 5 photos +2 Chờ thẩm định Thẩm Định Khiếu Nại" [ref=e155]:
                - cell "TB-20261025-TEST02 a558c872-ecf1-4319-a726-74990fddaabc" [ref=e156]:
                  - generic [ref=e157]:
                    - generic [ref=e158]: TB-20261025-TEST02
                    - generic [ref=e159]: a558c872-ecf1-4319-a726-74990fddaabc
                - cell "Demo Administrator" [ref=e160]:
                  - generic [ref=e161]:
                    - img [ref=e163]
                    - generic [ref=e165]: Demo Administrator
                - cell "15:17 25/10/2026" [ref=e166]
                - cell "Report 3 with 5 photos" [ref=e167]:
                  - paragraph [ref=e169]: Report 3 with 5 photos
                - cell "+2" [ref=e170]:
                  - generic [ref=e171]:
                    - button "Click để phóng to ảnh" [ref=e172] [cursor=pointer]
                    - button "Click để phóng to ảnh" [ref=e174] [cursor=pointer]
                    - button "Click để phóng to ảnh" [ref=e176] [cursor=pointer]
                    - button "+2" [ref=e178] [cursor=pointer]
                - cell "Chờ thẩm định" [ref=e179]:
                  - generic [ref=e181]: Chờ thẩm định
                - cell "Thẩm Định Khiếu Nại" [ref=e182]:
                  - button "Thẩm Định Khiếu Nại" [ref=e183] [cursor=pointer]:
                    - img [ref=e184]
                    - generic [ref=e186]: Thẩm Định Khiếu Nại
              - 'row "TB-20261025-2a49ab139b674337a291b6ead0200bc2 75cda44b-2fec-4d96-8b86-67cff06314f0 Demo Administrator 15:15 25/10/2026 San pham bi nut gay Ghi chú: Dong y hoan tien theo bao hanh Duyệt hoàn tiền Xem Thẩm Định" [ref=e187]':
                - cell "TB-20261025-2a49ab139b674337a291b6ead0200bc2 75cda44b-2fec-4d96-8b86-67cff06314f0" [ref=e188]:
                  - generic [ref=e189]:
                    - generic [ref=e190]: TB-20261025-2a49ab139b674337a291b6ead0200bc2
                    - generic [ref=e191]: 75cda44b-2fec-4d96-8b86-67cff06314f0
                - cell "Demo Administrator" [ref=e192]:
                  - generic [ref=e193]:
                    - img [ref=e195]
                    - generic [ref=e197]: Demo Administrator
                - cell "15:15 25/10/2026" [ref=e198]
                - 'cell "San pham bi nut gay Ghi chú: Dong y hoan tien theo bao hanh" [ref=e199]':
                  - generic [ref=e200]:
                    - paragraph [ref=e201]: San pham bi nut gay
                    - paragraph [ref=e202]: "Ghi chú: Dong y hoan tien theo bao hanh"
                - cell [ref=e203]:
                  - generic [ref=e204]:
                    - button "Click để phóng to ảnh" [ref=e205] [cursor=pointer]
                    - button "Click để phóng to ảnh" [ref=e207] [cursor=pointer]
                    - button "Click để phóng to ảnh" [ref=e209] [cursor=pointer]
                - cell "Duyệt hoàn tiền" [ref=e211]:
                  - generic [ref=e213]: Duyệt hoàn tiền
                - cell "Xem Thẩm Định" [ref=e214]:
                  - button "Xem Thẩm Định" [ref=e215] [cursor=pointer]:
                    - img [ref=e216]
                    - generic [ref=e218]: Xem Thẩm Định
              - 'row "TB-20261025-TEST01 c12cb4a5-ffae-400e-83e7-21449cc2ac4d Nguyen Van A 15:12 25/10/2026 Report 2 without evidence Ghi chú: Tu choi khieu nai vi san pham khong co loi ky thuat Không có ảnh Đã bác bỏ Xem Thẩm Định" [ref=e219]':
                - cell "TB-20261025-TEST01 c12cb4a5-ffae-400e-83e7-21449cc2ac4d" [ref=e220]:
                  - generic [ref=e221]:
                    - generic [ref=e222]: TB-20261025-TEST01
                    - generic [ref=e223]: c12cb4a5-ffae-400e-83e7-21449cc2ac4d
                - cell "Nguyen Van A" [ref=e224]:
                  - generic [ref=e225]:
                    - img [ref=e227]
                    - generic [ref=e229]: Nguyen Van A
                - cell "15:12 25/10/2026" [ref=e230]
                - 'cell "Report 2 without evidence Ghi chú: Tu choi khieu nai vi san pham khong co loi ky thuat" [ref=e231]':
                  - generic [ref=e232]:
                    - paragraph [ref=e233]: Report 2 without evidence
                    - paragraph [ref=e234]: "Ghi chú: Tu choi khieu nai vi san pham khong co loi ky thuat"
                - cell "Không có ảnh" [ref=e235]:
                  - generic [ref=e236]:
                    - img [ref=e237]
                    - text: Không có ảnh
                - cell "Đã bác bỏ" [ref=e239]:
                  - generic [ref=e241]: Đã bác bỏ
                - cell "Xem Thẩm Định" [ref=e242]:
                  - button "Xem Thẩm Định" [ref=e243] [cursor=pointer]:
                    - img [ref=e244]
                    - generic [ref=e246]: Xem Thẩm Định
          - generic [ref=e248]:
            - generic [ref=e249]:
              - generic [ref=e250]:
                - img [ref=e252]
                - heading "Thẩm Định Khiếu Nại — TB-20261025-TEST02" [level=2] [ref=e254]
              - button [ref=e255] [cursor=pointer]:
                - img [ref=e256]
            - generic [ref=e258]:
              - generic [ref=e259]:
                - img [ref=e260]
                - generic [ref=e262]: Lỗi khi thẩm định khiếu nại.
              - generic [ref=e263]:
                - generic [ref=e264]:
                  - generic [ref=e265]: "Khách hàng:"
                  - generic [ref=e266]: Demo Administrator
                - generic [ref=e267]:
                  - generic [ref=e268]: "Lý do khiếu nại:"
                  - generic [ref=e269]: Report 3 with 5 photos
                - generic [ref=e270]:
                  - generic [ref=e271]: "Ảnh bằng chứng:"
                  - generic [ref=e272]:
                    - img "Evidence 1" [ref=e274]
                    - img "Evidence 2" [ref=e276]
                    - img "Evidence 3" [ref=e278]
                    - img "Evidence 4" [ref=e280]
                    - img "Evidence 5" [ref=e282]
              - generic [ref=e283]:
                - generic [ref=e284]: Lựa chọn phương án giải quyết *
                - generic [ref=e285]:
                  - generic [ref=e286] [cursor=pointer]:
                    - img [ref=e288]
                    - generic [ref=e290]:
                      - generic [ref=e291]: In lại miễn phí (ReprintApproved)
                      - generic [ref=e292]: Tự động kích hoạt lượt in bù cho xưởng sản xuất, không thu thêm bất kỳ chi phí nào từ khách hàng.
                  - generic [ref=e293] [cursor=pointer]:
                    - img [ref=e295]
                    - generic [ref=e297]:
                      - generic [ref=e298]: Duyệt hoàn tiền (RefundApproved)
                      - generic [ref=e299]: Chấp thuận hoàn tiền đơn hàng và chuyển sang danh sách chờ hoàn tiền tại phân hệ Tài chính.
                  - generic [ref=e300] [cursor=pointer]:
                    - img [ref=e302]
                    - generic [ref=e304]:
                      - generic [ref=e305]: Bác bỏ khiếu nại (Rejected)
                      - generic [ref=e306]: Từ chối khiếu nại do sản phẩm đạt chuẩn kỹ thuật bàn giao hoặc lỗi không xuất phát từ nhà in.
              - generic [ref=e307]:
                - generic [ref=e308]:
                  - generic [ref=e309]: Ghi chú thẩm định *
                  - generic [ref=e310]: 69 / 10 ký tự tối thiểu
                - textbox "Ghi chú thẩm định *" [ref=e311]:
                  - /placeholder: Ghi rõ lý do thẩm định và căn cứ đưa ra quyết định (tối thiểu 10 ký tự)...
                  - text: Sản phẩm in bị tách lớp kết cấu, duyệt in bù miễn phí theo quy chuẩn.
              - generic [ref=e312]:
                - button "Hủy bỏ" [ref=e313] [cursor=pointer]
                - button "Xác nhận Thẩm Định" [ref=e314] [cursor=pointer]:
                  - img [ref=e315]
                  - generic [ref=e317]: Xác nhận Thẩm Định
  - region "Notifications Alt+T"
```

# Test source

```ts
  145 |     await amountInput.fill('50000');
  146 |     await reasonInput.fill('Quá ngắn');
  147 |     await expect(submitRefundBtn).toBeDisabled();
  148 | 
  149 |     // Validation: Reason >= 10 characters enables button
  150 |     await reasonInput.fill('Khách hàng yêu cầu hoàn tiền do đổi sang mô hình 3D khác');
  151 |     await expect(submitRefundBtn).toBeEnabled();
  152 | 
  153 |     // Verify Idempotency-Key (UUID v4 format)
  154 |     const keyContainer = page.locator('div:has-text("Key:")').filter({ hasText: 'Đổi Key' }).first();
  155 |     await expect(keyContainer).toBeVisible();
  156 |     const keyText = await keyContainer.textContent();
  157 |     expect(keyText).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  158 | 
  159 |     // Close modal via Cancel button
  160 |     const cancelBtn = page.locator('button:has-text("Hủy bỏ")').first();
  161 |     await cancelBtn.click();
  162 |     await expect(modalTitle).toHaveCount(0);
  163 |   });
  164 | 
  165 |   // TEST 2: Warranty Defect Reports (Tab 6 /admin/warranty)
  166 |   test('Test 2: Warranty Defect Reports (table, lightbox gallery, 3-path resolution modal)', async ({ page }) => {
  167 |     resetTestDefectReport();
  168 |     await loginAsAdmin(page);
  169 |     await page.goto('http://localhost:5173/admin/warranty', { waitUntil: 'domcontentloaded' });
  170 | 
  171 |     // Page Title
  172 |     await expect(page.locator('h1:has-text("Bảo Hành & Khiếu Nại")')).toBeVisible({ timeout: 15000 });
  173 | 
  174 |     // Verify Table Headers
  175 |     await expect(page.locator('th:has-text("Mã đơn hàng")')).toBeVisible();
  176 |     await expect(page.locator('th:has-text("Khách hàng")')).toBeVisible();
  177 |     await expect(page.locator('th:has-text("Ngày gửi khiếu nại")')).toBeVisible();
  178 |     await expect(page.locator('th:has-text("Lý do khiếu nại")')).toBeVisible();
  179 |     await expect(page.locator('th:has-text("Ảnh bằng chứng")')).toBeVisible();
  180 |     await expect(page.locator('th:has-text("Trạng thái")')).toBeVisible();
  181 |     await expect(page.locator('th:has-text("Thao tác")')).toBeVisible();
  182 | 
  183 |     // Lightbox test: Click an evidence thumbnail
  184 |     const photoThumbnail = page.locator('button[title="Click để phóng to ảnh"]').first();
  185 |     await expect(photoThumbnail).toBeVisible({ timeout: 10000 });
  186 |     await photoThumbnail.click();
  187 | 
  188 |     // Verify Lightbox Modal is open
  189 |     const lightboxModal = page.locator('div[role="dialog"][aria-modal="true"]').first();
  190 |     await expect(lightboxModal).toBeVisible({ timeout: 10000 });
  191 | 
  192 |     // Lightbox navigation button (next photo if available)
  193 |     const nextBtn = page.locator('button[title*="Ảnh sau"]');
  194 |     if (await nextBtn.isVisible()) {
  195 |       await nextBtn.click();
  196 |     }
  197 | 
  198 |     // Close Lightbox via close button
  199 |     const closeLightboxBtn = page.locator('button[title="Đóng (Esc)"]').or(page.locator('button[title*="Đóng"]')).first();
  200 |     await expect(closeLightboxBtn).toBeVisible();
  201 |     await closeLightboxBtn.click();
  202 |     await expect(lightboxModal).toHaveCount(0);
  203 | 
  204 |     // Resolution Modal: Click "Thẩm Định Khiếu Nại" on Open report
  205 |     const openReportRow = page.locator('tr').filter({ hasText: 'Chờ thẩm định' }).first();
  206 |     const resolveBtn = openReportRow.locator('button:has-text("Thẩm Định Khiếu Nại")');
  207 |     await expect(resolveBtn).toBeVisible({ timeout: 10000 });
  208 |     await resolveBtn.click();
  209 | 
  210 |     // Verify Resolution Modal
  211 |     const modalHeader = page.locator('h2:has-text("Thẩm Định Khiếu Nại")');
  212 |     await expect(modalHeader).toBeVisible();
  213 | 
  214 |     // Verify 3 resolution options are rendered inside modal
  215 |     const resolveModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Thẩm Định Khiếu Nại' }).first();
  216 |     const reprintOption = resolveModal.locator('div.font-bold:has-text("In lại miễn phí (ReprintApproved)")');
  217 |     const refundOption = resolveModal.locator('div.font-bold:has-text("Duyệt hoàn tiền (RefundApproved)")');
  218 |     const rejectOption = resolveModal.locator('div.font-bold:has-text("Bác bỏ khiếu nại (Rejected)")');
  219 | 
  220 |     await expect(reprintOption).toBeVisible();
  221 |     await expect(refundOption).toBeVisible();
  222 |     await expect(rejectOption).toBeVisible();
  223 | 
  224 |     const submitResolutionBtn = page.locator('button[type="submit"]:has-text("Xác nhận Thẩm Định")');
  225 |     const noteTextarea = page.locator('textarea[placeholder*="Ghi rõ lý do thẩm định"]');
  226 | 
  227 |     // Button disabled when no option selected
  228 |     await expect(submitResolutionBtn).toBeDisabled();
  229 | 
  230 |     // Select ReprintApproved option
  231 |     await reprintOption.click();
  232 | 
  233 |     // Validation: Note < 10 characters keeps button disabled
  234 |     await noteTextarea.fill('Quá ngắn');
  235 |     await expect(submitResolutionBtn).toBeDisabled();
  236 | 
  237 |     // Fill valid note >= 10 characters
  238 |     await noteTextarea.fill('Sản phẩm in bị tách lớp kết cấu, duyệt in bù miễn phí theo quy chuẩn.');
  239 |     await expect(submitResolutionBtn).toBeEnabled();
  240 | 
  241 |     // Submit resolution
  242 |     await submitResolutionBtn.click();
  243 | 
  244 |     // Modal closes and success toast appears
> 245 |     await expect(modalHeader).toHaveCount(0, { timeout: 10000 });
      |                               ^ Error: expect(locator).toHaveCount(expected) failed
  246 |     await expect(page.locator('.Toastify__toast--success').or(page.locator('.Toastify__toast'))).toBeVisible({ timeout: 10000 });
  247 |   });
  248 | 
  249 |   // TEST 3: Observability Dashboard (Tab 1 /admin/dashboard)
  250 |   test('Test 3: Observability Dashboard (4 KPI cards, distribution chart, AI provider stats, manual outbox dispatch)', async ({ page }) => {
  251 |     await loginAsAdmin(page);
  252 |     await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'domcontentloaded' });
  253 | 
  254 |     // Page Title
  255 |     await expect(page.locator('h1:has-text("Tổng Quan & Chỉ Số Vận Hành")')).toBeVisible({ timeout: 15000 });
  256 | 
  257 |     // Verify 4 KPI cards
  258 |     await expect(page.locator('span:has-text("Tổng Đơn Hàng")').first()).toBeVisible({ timeout: 10000 });
  259 |     await expect(page.locator('span:has-text("Thanh Toán Cần Chú Ý")').first()).toBeVisible();
  260 |     await expect(page.locator('span:has-text("Hoàn Tiền Cần Chú Ý")').first()).toBeVisible();
  261 |     await expect(page.locator('span:has-text("Hàng Đợi Outbox")').first()).toBeVisible();
  262 | 
  263 |     // Verify 2-axis orders chart
  264 |     await expect(page.locator('text=Phân Bổ Đơn Hàng 2 Trục (Fulfillment vs Payment)')).toBeVisible();
  265 |     await expect(page.locator('text=1. Tiến Độ Sản Xuất')).toBeVisible();
  266 |     await expect(page.locator('text=2. Trạng Thái Thanh Toán')).toBeVisible();
  267 | 
  268 |     // Verify 3D AI Provider metrics (Hunyuan3D, Meshy, Tripo)
  269 |     await expect(page.locator('text=Hiệu Suất Nhà Cung Cấp AI 3D')).toBeVisible();
  270 |     await expect(page.locator('span.font-mono:has-text("Hunyuan3D")')).toBeVisible();
  271 |     await expect(page.locator('span.font-mono:has-text("Meshy")')).toBeVisible();
  272 |     await expect(page.locator('span.font-mono:has-text("Tripo")')).toBeVisible();
  273 | 
  274 |     // Manual outbox dispatch
  275 |     const dispatchBtn = page.locator('button:has-text("Kích hoạt gửi Outbox thủ công")');
  276 |     await expect(dispatchBtn).toBeVisible();
  277 |     await dispatchBtn.click();
  278 | 
  279 |     // Verify toast feedback appears
  280 |     await expect(page.locator('.Toastify__toast')).toBeVisible({ timeout: 10000 });
  281 |   });
  282 | 
  283 |   // TEST 4: System Admin - Users (Tab 7 /admin/system)
  284 |   test('Test 4: System Admin Users (20 items/page, AI credit grant with UUID v4 Idempotency-Key, lock/unlock user)', async ({ page }) => {
  285 |     await loginAsAdmin(page);
  286 |     await page.goto('http://localhost:5173/admin/system', { waitUntil: 'domcontentloaded' });
  287 | 
  288 |     // Page Title & Block 1
  289 |     await expect(page.locator('h1:has-text("Quản Trị Hệ Thống & Cấu Hình")')).toBeVisible({ timeout: 15000 });
  290 |     await expect(page.locator('text=Quản Trị Người Dùng & Tài Khoản')).toBeVisible();
  291 | 
  292 |     // Users Table
  293 |     const usersTable = page.locator('table').first();
  294 |     await expect(usersTable).toBeVisible({ timeout: 10000 });
  295 |     await expect(usersTable.locator('th:has-text("Email")')).toBeVisible();
  296 |     await expect(usersTable.locator('th:has-text("Vai Trò (Role)")')).toBeVisible();
  297 |     await expect(usersTable.locator('th:has-text("Trạng Thái")')).toBeVisible();
  298 |     await expect(usersTable.locator('th:has-text("Lượt Tạo 3D AI")')).toBeVisible();
  299 | 
  300 |     // Pagination controls: 20 per page indicator
  301 |     await expect(page.locator('text=20 tài khoản/trang').or(page.locator('text=20 mục/trang')).first()).toBeVisible();
  302 | 
  303 |     const customerRow = usersTable.locator('tr').filter({ hasText: 'customer@123' }).first();
  304 |     await expect(customerRow).toBeVisible({ timeout: 10000 });
  305 | 
  306 |     // Test "Cấp Credit AI" modal on customer@123
  307 |     const creditBtn = customerRow.locator('button:has-text("Cấp Credit AI")');
  308 |     await expect(creditBtn).toBeVisible();
  309 |     await creditBtn.click();
  310 | 
  311 |     const creditModalHeader = page.locator('h3:has-text("Cấp Thêm Lượt Tạo 3D AI")');
  312 |     await expect(creditModalHeader).toBeVisible();
  313 | 
  314 |     // Verify inputs
  315 |     const creditAmountInput = page.locator('input[type="number"]').first();
  316 |     await expect(creditAmountInput).toBeVisible();
  317 |     await creditAmountInput.fill('5');
  318 | 
  319 |     const creditReasonInput = page.locator('input[placeholder*="Ví dụ: Đền bù"]');
  320 |     await expect(creditReasonInput).toBeVisible();
  321 |     await creditReasonInput.fill('Quản trị viên cấp bù credit AI cho bài kiểm thử tự động E2E');
  322 | 
  323 |     // Verify UUID v4 Idempotency-Key
  324 |     const idempotencyInput = page.locator('input[readonly]');
  325 |     await expect(idempotencyInput).toBeVisible();
  326 |     const keyVal = await idempotencyInput.inputValue();
  327 |     expect(keyVal).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  328 | 
  329 |     // Submit credit grant
  330 |     const submitCreditBtn = page.locator('button:has-text("Xác nhận Cấp Credit")');
  331 |     await expect(submitCreditBtn).toBeEnabled();
  332 |     await submitCreditBtn.click();
  333 | 
  334 |     // Toast feedback appears
  335 |     await expect(page.locator('.Toastify__toast')).toBeVisible({ timeout: 10000 });
  336 |     await expect(creditModalHeader).toHaveCount(0);
  337 | 
  338 |     // Test "Khóa / Mở Khóa" modal on customer@123
  339 |     const lockActionBtn = customerRow.locator('button:has-text("Khóa"), button:has-text("Mở Khóa")');
  340 |     await expect(lockActionBtn).toBeVisible();
  341 |     const btnText = (await lockActionBtn.textContent()) || '';
  342 |     await lockActionBtn.click();
  343 | 
  344 |     const lockModal = page.locator('div[role="dialog"], div.fixed.inset-0').filter({ hasText: 'Khóa Tài Khoản' }).first();
  345 |     await expect(lockModal).toBeVisible();
```