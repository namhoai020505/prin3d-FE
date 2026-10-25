# Original User Request

## 2026-10-25T14:49:09Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team (Nhóm 1: Tài chính & Bảo hành, Nhóm 2: Chỉ số & Quản trị hệ thống, Nhóm 3: QA Automation E2E)

Triển khai hoàn tất 100% toàn bộ các phân hệ còn lại của Admin Portal (Giai đoạn 3: Tab 5 Finance, Tab 6 Warranty và Giai đoạn 4: Tab 1 Dashboard Observability, Tab 7 System Admin) trên nền tảng The Boys 3D Printing, tuân thủ nghiêm ngặt thiết kế Dark Cyberpunk, Vector Icons chuyên nghiệp (tuyệt đối không dùng emoji), bảo vệ nguyên vẹn các giai đoạn trước và đạt 100% test E2E.

Working directory: c:\Users\namho\Downloads\FPT\Exe\prin3d-FE
Backend directory: C:\Users\namho\Downloads\FPT\Exe\print3d
Integrity mode: development

---

## Requirements

### R1. Phân Hệ Tab 5: Quản Lý Giao Dịch & Hoàn Tiền (`/admin/finance`)
- **Sub-tab 1: Đối Soát Thanh Toán (Payment Reconciliation)**:
  - Tải danh sách giao dịch qua `paymentService.ts` (các đơn hàng có `orderPaymentStatus: 'Unpaid' | 'PendingPayment'` hoặc gọi `GET /api/v2/orders/{orderId}/payment-attempts`).
  - Bảng giao dịch: Mã đơn (monospace Cyan), Cổng thanh toán (PayOS), Số tiền (VNĐ), Trạng thái (`Pending`, `NeedsAttention`, `Succeeded`).
  - Nút hành động: "Kiểm tra & Đối soát PayOS" -> gọi `POST /api/v2/payments/reconcile/{attemptId}` -> hiển thị kết quả đối soát tức thì qua Toast.
- **Sub-tab 2: Quản Lý Hoàn Tiền (Refunds Management)**:
  - Bảng danh sách các đơn hàng ở trạng thái `RefundPending` hoặc có lịch sử hoàn tiền (`GET /api/v2/orders/{orderId}/refunds`).
  - Nút "Tạo Lệnh Hoàn Tiền": Mở modal nhập số tiền hoàn (ràng buộc $\le$ tổng tiền đơn), nhập lý do hoàn (bắt buộc $\ge$ 10 ký tự), tự động sinh `Idempotency-Key: UUID` -> gọi `POST /api/v2/orders/{orderId}/refunds`.
  - Nút "Đối Soát Hoàn Tiền": Gọi `POST /api/v2/refunds/{refundId}/reconcile`.

### R2. Phân Hệ Tab 6: Bảo Hành & Khiếu Nại Sản Phẩm Lỗi (`/admin/warranty`)
- **Backend MediatR Endpoint**:
  - Viết Query `GetDefectReportsQuery` và Handler trong `TheBoys.Application` sử dụng `.AsNoTracking()`.
  - Expose endpoint `GET /api/v2/defect-reports` với quyền `[Authorize(Roles = Roles.Management)]` trả về danh sách khiếu nại kèm `OrderCode`, `CustomerName`, `Reason`, `EvidencePhotos`, `Status`.
- **Giao diện Frontend (`src/pages/admin/warranty/WarrantyPage.tsx`)**:
  - Bảng phiếu khiếu nại: Mã đơn hàng, Tên khách hàng, Ngày gửi, Lý do lỗi, Thư viện ảnh bằng chứng (thumbnails có lightbox phóng to khi click).
  - Nút "Thẩm Định Khiếu Nại": Mở modal giải quyết với 3 quyết định:
    1. In lại miễn phí (`ReprintApproved`) -> Tự động kích hoạt lượt in bù.
    2. Duyệt hoàn tiền (`RefundApproved`) -> Đưa đơn vào danh sách chờ hoàn tiền.
    3. Bác bỏ khiếu nại (`Rejected`) -> Từ chối khiếu nại.
    - Yêu cầu bắt buộc nhập `resolutionNote` ($\ge$ 10 ký tự) -> gọi `POST /api/v2/defect-reports/{reportId}/resolve`.

### R3. Phân Hệ Tab 1: Tổng Quan & Chỉ Số Vận Hành (`/admin/dashboard`)
- Xây dựng lại `DashboardPage.tsx` hiện đại, tách khỏi file cũ `Dashboard.tsx`, kết nối API `GET /api/v2/admin/observability`:
  - **Hàng 1 (4 KPI Cards)**: Tổng đơn hàng, Ca thanh toán lỗi cần đối soát (`paymentAttemptsNeedsAttention`), Ca hoàn tiền treo (`refundsNeedsAttention`), Hàng đợi Outbox (`pendingMessagesCount`).
  - **Hàng 2 (Biểu đồ phân bổ)**: Phân bổ đơn hàng 2 trục (Fulfillment vs Payment) và Hiệu suất các nhà cung cấp AI 3D (Hunyuan3D, Meshy, Tripo: Tỷ lệ Succeeded, Failed, Running).
  - **Hành động vận hành**: Nút "Kích hoạt gửi Outbox thủ công" gọi `POST /api/v2/admin/outbox/dispatch` với body `{ batchSize: 50 }`. Có nút "Làm mới số liệu".

### R4. Phân Hệ Tab 7: Quản Trị Người Dùng & Cấu Hình Bảng Giá (`/admin/system`)
- **Bảo mật Role Guard**: Chỉ cho phép người dùng có Role `admin` truy cập (Staff truy cập sẽ bị chuyển hướng hoặc chặn).
- **Khối 1: Quản Trị Người Dùng (User Management)**:
  - Gọi `GET /api/admin/users?page={page}` (phân trang 20 dòng/trang).
  - Bảng người dùng: Email, Họ tên, Role (Dropdown thay đổi quyền `admin` / `staff` / `customer` -> gọi `PATCH /api/admin/users/{id}/role`), Trạng thái hoạt động (Active / Locked).
  - Nút "Khóa / Mở Khóa": Gọi `POST /api/admin/users/{id}/lock` (nhập lý do khóa) hoặc `POST /api/admin/users/{id}/unlock`.
  - Nút "Cấp Credit AI": Mở modal nhập số lượng Credit (1–100) và lý do cấp (bắt buộc) -> tự động sinh `Idempotency-Key: UUID` -> gọi `POST /api/admin/users/credits`.
- **Khối 2: Cấu Hình Bảng Giá In (Pricing Packages)**:
  - Gọi `GET /api/pricing-packages`.
  - Bảng gói in: Tên gói, Kích thước mm, Vật liệu in, Đơn giá hiện tại (VNĐ), Công tắc Kích hoạt (Active/Inactive).
  - Nút "Cập Nhật Giá": Gọi `PATCH /api/admin/pricing-packages/{id}` với body `{ priceVnd, isActive }`.

### R5. Quy Chuẩn Giao Diện (UI/UX) & Điều Hướng Toàn Hệ Thống
- **TUYỆT ĐỐI KHÔNG DÙNG EMOJI**: Nghiêm cấm dùng các emoji Unicode (📦, 🔍, 📊, ⚙️, 🛡️, 💳, 🚚, 🏭, ✨, ❌, ⚠️...) ở mọi nơi. Bắt buộc 100% sử dụng Vector Icons từ `react-icons/fa` hoặc `lucide-react`.
- **Phong cách Cyberpunk Obsidian**: Nền tối `#090D14`, card nền `slate-900/60`, border kính mờ `border-white/10`, nút hành động chính `.btn-pooled-cyan`.
- **Kích hoạt 100% 7 phân hệ trên Sidebar Admin**:
  1. `/admin/dashboard`: Tổng quan & Chỉ số (Icon: FaChartLine)
  2. `/admin/reviews`: Thẩm định mẫu in (Icon: FaCheckDouble)
  3. `/admin/orders`: Quản lý đơn hàng (Icon: FaBox)
  4. `/admin/fulfillment`: Điều phối xưởng (Icon: FaIndustry)
  5. `/admin/finance`: Giao dịch & Hoàn tiền (Icon: FaCreditCard)
  6. `/admin/warranty`: Bảo hành & Khiếu nại (Icon: FaShieldAlt)
  7. `/admin/system`: Quản trị hệ thống (Icon: FaUsersCog, `adminOnly: true`)
  - Xóa bỏ hoàn toàn nhãn "Sắp có".
- **Bảo toàn mã nguồn**: TUYỆT ĐỐI KHÔNG CHỈNH SỬA file `src/pages/user/components/Studio3DViewport.tsx`. Giữ nguyên 100% logic Giai đoạn 1 và 2.

### R6. Kiểm Thử Tự Động Playwright E2E & Nghiệm Thu
- Tạo suite kiểm thử tự động `e2e/admin-phase3-phase4.spec.ts` gồm ít nhất 6 Test Cases:
  - **Test 1 (Finance)**: Admin đăng nhập -> Vào `/admin/finance` -> Đối soát thanh toán PayOS & Tạo lệnh hoàn tiền thành công.
  - **Test 2 (Warranty)**: Mở `/admin/warranty` -> Xem ảnh bằng chứng lỗi -> Duyệt khiếu nại (`ReprintApproved` hoặc `RefundApproved`).
  - **Test 3 (Observability)**: Mở `/admin/dashboard` -> Kiểm tra 4 thẻ KPI -> Kích hoạt gửi Outbox thủ công thành công.
  - **Test 4 (User Admin)**: Mở `/admin/system` -> Cấp Credit AI (Idempotency-Key) & Khóa/Mở khóa tài khoản người dùng.
  - **Test 5 (Pricing Packages)**: Mở `/admin/system` -> Chỉnh sửa giá gói in 3D thành công.
  - **Test 6 (Role Guard Security)**: Tài khoản Staff hoặc Customer truy cập `/admin/system` -> Bị chặn và chuyển hướng an toàn.
- Kiểm tra hồi quy toàn diện:
  - `npx playwright test e2e/admin-phase1.spec.ts` (Pass 100%).
  - `npx playwright test e2e/admin-phase2.spec.ts` (Pass 100%).
  - `npx playwright test e2e/admin-phase3-phase4.spec.ts` (Pass 100%).
- Xuất báo cáo nghiệm thu `C:\Users\namho\Downloads\FPT\Exe\report\exereport18.txt`.

---

## Verification Resources
- **Tài khoản kiểm thử**:
  - Quản trị viên: `admin@123` / `Admin@123456` (Role: Admin)
  - Khách hàng: `customer@123` / `Admin@123456` (Role: Customer)
- **Database & Server**:
  - Backend WebApi: `http://localhost:5133`
  - Frontend Vite Dev: `http://localhost:5173`
  - Database SQL Server: `(localdb)\mssqllocaldb` -> Database: `TheBoysDb`
- **Công cụ kiểm chứng**:
  - `dotnet build TheBoys.sln`
  - `npm run build`
  - `npx playwright test e2e/admin-phase3-phase4.spec.ts`
  - `sqlcmd -S "(localdb)\mssqllocaldb" -d TheBoysDb`

---

## Acceptance Criteria

### A1. Giao Diện & Điều Hướng (UI/UX)
- [ ] Sidebar Admin hiển thị đầy đủ 7 phân hệ ở trạng thái enabled, không còn bất kỳ nhãn "Sắp có" nào.
- [ ] Tuyệt đối không có ký tự emoji trong toàn bộ giao diện 4 phân hệ mới; 100% sử dụng vector icons (`react-icons/fa` hoặc `lucide-react`).
- [ ] Giao diện tối Cyberpunk Obsidian, chuẩn Glass Badge, nút Pooled-Light Cyan, phân trang 20 dòng và không có thanh cuộn ngang thừa.
- [ ] Tệp `Studio3DViewport.tsx` giữ nguyên nguyên vẹn không bị chỉnh sửa.

### A2. Phân Hệ Tài Chính & Bảo Hành (Giai đoạn 3)
- [ ] `/admin/finance`: Đối soát thanh toán PayOS thành công, hiển thị toast kết quả.
- [ ] `/admin/finance`: Tạo lệnh hoàn tiền thành công với số tiền hợp lệ và lý do $\ge$ 10 ký tự, có Idempotency-Key.
- [ ] `/admin/warranty`: Hiển thị danh sách khiếu nại qua API `GET /api/v2/defect-reports`, xem được thumbnail/lightbox ảnh bằng chứng lỗi.
- [ ] `/admin/warranty`: Thẩm định khiếu nại thành công với ghi chú $\ge$ 10 ký tự.

### A3. Phân Hệ Chỉ Số & Quản Trị Hệ Thống (Giai đoạn 4)
- [ ] `/admin/dashboard`: Tải và hiển thị dữ liệu Observability thời gian thực (4 thẻ KPI, biểu đồ phân bổ 2 trục và trạng thái AI provider).
- [ ] `/admin/dashboard`: Nút "Kích hoạt gửi Outbox thủ công" gửi thành công yêu cầu tới `/api/v2/admin/outbox/dispatch`.
- [ ] `/admin/system`: Phân trang người dùng 20 người/trang, đổi role, khóa/mở khóa tài khoản thành công.
- [ ] `/admin/system`: Cấp Credit AI thành công với Idempotency-Key.
- [ ] `/admin/system`: Cập nhật giá gói in thành công qua `PATCH /api/admin/pricing-packages/{id}`.
- [ ] Route Guard: Tài khoản Staff hoặc Customer bị chặn tuyệt đối khi vào `/admin/system`.

### A4. Chất Lượng Build & Kiểm Thử
- [ ] `dotnet build TheBoys.sln`: 0 Error, 0 Warning.
- [ ] `npm run build`: 0 Error, 0 Warning.
- [ ] `npx playwright test e2e/admin-phase3-phase4.spec.ts`: 6/6 tests pass.
- [ ] Hồi quy Giai đoạn 1 & 2: 8/8 tests pass (3 phase 1 + 5 phase 2).
- [ ] Báo cáo `C:\Users\namho\Downloads\FPT\Exe\report\exereport18.txt` được tạo đầy đủ với log build, log test và log sqlcmd.
