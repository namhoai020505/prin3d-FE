# 🛠️ TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ & PROMPT THIẾT KẾ UI STAFF (PRIN3D / THE BOYS)

> **Mục đích tài liệu**: Tài liệu này chứa toàn bộ bối cảnh nghiệp vụ, luồng xử lý (User Flows), sơ đồ trạng thái (State Machines), Data Contracts và bộ **Prompt chi tiết cấp độ Production** để nạp trực tiếp vào **Gemini Argon Web** (hoặc các AI Code Generator) nhằm lập trình hoàn thiện phân hệ **Staff Portal (Kỹ thuật viên & Điều phối xưởng in 3D)**.

---

## MỤC LỤC
1. [Tổng Quan Hệ Thống & Phân Định Vai Trò (Staff vs. Admin)](#1-tổng-quan-hệ-thống--phân-định-vai-trò-staff-vs-admin)
2. [Design Tokens & Bộ Quy Chuẩn Thiết Kế](#2-design-tokens--bộ-quy-chuẩn-thiết-kế)
3. [Sơ Đồ Luồng Nghiệp Vụ 5 Bước (State Machines & User Flows)](#3-sơ-đồ-luồng-nghiệp-vụ-5-bước-state-machines--user-flows)
4. [Đặc Tả Chi Tiết Từng Màn Hình & Thành Phần UI](#4-đặc-tả-chi-tiết-từng-màn-hình--thành-phần-ui)
5. [Data Contracts & API Endpoints](#5-data-contracts--api-endpoints)
6. [PROMPT NẠP TRỰC TIẾP CHO GEMINI ARGON WEB](#6-prompt-nạp-trực-tiếp-cho-gemini-argon-web)

---

## 1. TỔNG QUAN HỆ THỐNG & PHÂN ĐỊNH VAI TRÒ (STAFF VS. ADMIN)

### 1.1. Bối cảnh dự án
Hệ thống **PRIN3D / THE BOYS** là nền tảng AI kết hợp sản xuất in 3D:
- **Người dùng**: Nhập Prompt hoặc tải ảnh 2D $\rightarrow$ AI sinh mô hình 3D (Meshy/Tripo) $\rightarrow$ Khách hàng đặt in vật lý $\rightarrow$ Thanh toán qua cổng PayOS.
- **Phân hệ Vận hành**: Cần vai trò **Staff** là đội ngũ kỹ thuật viên xưởng in và điều phối viên để kiểm soát chất lượng hình học 3D, vận hành máy in và giao nhận thực tế.

### 1.2. Phân định quyền hạn: Staff (`role = 2`) vs. Admin (`role = 3`)

| Phân hệ / Nghiệp vụ | Super Admin (`Admin`) | Kỹ thuật viên / Vận hành (`Staff`) |
| :--- | :---: | :---: |
| **Thẩm định Mesh 3D (Pre-flight Review)** | Xem & Can thiệp khẩn cấp | **Khu vực tác nghiệp chính** (Kiểm tra hình học, duyệt thông số in) |
| **Dây chuyền xưởng in (Kanban 5 bước)** | Giám sát vĩ mô | **Khu vực tác nghiệp chính** (Gán lab, chạy máy in, xử lý nguội) |
| **Kiểm định chất lượng (QC Pass/Fail)** | Xem nhật ký QC | **Trực tiếp đo đạc, chấm Pass/Fail, kích hoạt in lại** |
| **Vận đơn Logistics & Bàn giao** | Tra cứu vận đơn | **Tạo mã tracking, bàn giao bưu tá, cập nhật trạng thái** |
| **Xử lý khiếu nại (Defect Reports)** | Duyệt hoàn tiền PayOS | **Thẩm định kỹ thuật sản phẩm lỗi, duyệt in bù (Reprint)** |
| **Doanh thu sàn, Đối soát PayOS** | Toàn quyền xem & đối soát | **Ẩn hoàn toàn** (Không can thiệp dòng tiền) |
| **Quản trị User & Bảng giá in** | Thêm/Sửa/Khóa User, sửa giá | **Ẩn hoàn toàn** |

---

## 2. DESIGN TOKENS & BỘ QUY CHUẨN THIẾT KẾ

- **Chủ đề mặc định**: **Cyberpunk Dark Obsidian** kết hợp viền sáng **Neon Cyan** & **Emerald Accent**.
- **Chế độ phụ**: **Clean Light Mode** (Nền `bg-slate-100`, card `bg-white`, border `border-slate-200`).
- **Màu sắc chức năng**:
  - Background tổng: `#070B14`
  - Sidebar / Drawer / Card: `#090D14` và `#0D131F`
  - Primary Accent (Cyan): `#00F0FF` (`shadow-[0_0_15px_rgba(0,240,255,0.25)]`)
  - Thành công / QC Pass (Emerald): `#10B981`
  - Cảnh báo / Chờ phân công (Amber): `#F59E0B`
  - Thất bại / Lỗi hỏng / QC Fail (Rose): `#F43F5E`
  - Chữ chính: `#F8FAFC` (Slate 50), Chữ phụ: `#94A3B8` (Slate 400)
- **Typography**:
  - Font giao diện: `'Urbanist'`, sans-serif.
  - Font mã đơn / Tọa độ XYZ / Kích thước / Tracking: `font-mono` (`ui-monospace`, 'SFMono-Regular').

---

## 3. SƠ ĐỒ LUỒNG NGHIỆP VỤ 5 BƯỚC (STATE MACHINES & USER FLOWS)

### 3.1. Sơ đồ trạng thái dây chuyền in 3D

```
Khách tạo model AI 
       │
       ▼
[1. Thẩm định 3D] ──(Từ chối: Hở lưới/Non-manifold)──> Hủy / Khách tạo lại
       │
   (Đạt chuẩn)
       │
Khách thanh toán PayOS
       │
       ▼
[2. Chờ Gán Xưởng] ──(Staff chọn Lab + Deadline)──> [Xưởng Tiếp Nhận]
                                                             │
                                                    (Bắt đầu in)
                                                             │
                                                             ▼
                                                    [3. Đang In (SLA/FDM)]
                                                             │
                                                    (Chạy xong lớp cắt)
                                                             │
                                                             ▼
                                                    [Xử Lý Nguội (Rửa cồn/Sấy UV)]
                                                             │
                                                    (Hoàn thiện bề mặt)
                                                             │
                                                             ▼
                                                    [4. Kiểm Định QC]
                                                             │
                          ┌──────────────────────────────────┴──────────────────────────────────┐
                          │ (Không đạt - Layer shift/Bọt khí)                                    │ (Đạt chuẩn 100%)
                          ▼                                                                     ▼
                [Khởi tạo In lại (Reprint)] ──> Quay lại Bước 3                        [5. Đóng Gói Chống Sốc]
                                                                                                │
                                                                                                ▼
                                                                                       [Tạo Vận Đơn (VNPost/GHN)]
                                                                                                │
                                                                                                ▼
                                                                                       [Bàn Giao & Giao Thành Công]
```

---

## 4. ĐẶC TẢ CHI TIẾT TỪNG MÀN HÌNH & THÀNH PHẦN UI

### 4.1. Màn hình 1: Thẩm định Mẫu in 3D (`/staff/reviews`)
- **Bố cục Master - Detail**:
  - **Cột trái (Queue)**: Danh sách tác vụ 3D chờ thẩm định. Filter pills: *Tất cả*, *Hoàn tất*, *Cần chú ý*, *Lỗi*. Mỗi thẻ gồm: Tên mô hình, ảnh preview, mã task, tag trạng thái lưới (*Kín nước Watertight* hoặc *Hở lưới Non-manifold*).
  - **Cột phải (Workspace)**:
    1. **Khung 3D Viewport (Three.js WebGL)**:
       - Render lưới không gian 3D, OrbitControls xoay tự do, nút [Tự xoay], nút [Reset góc nhìn].
       - Khung bao kích thước Build Volume của máy in giả lập.
    2. **Thanh chỉ số đo lường hình học**:
       - 4 ô thẻ: Chiều cao yêu cầu ($H\,\text{mm}$), Kích thước thực ($X \times Y \times Z\,\text{mm}$), Thể tích khối ($\text{cm}^3$), Tổng mặt tam giác (Triangle count).
    3. **Phiếu Thẩm định Kỹ thuật in 3D (Review Form)**:
       - 2 nút quyết định lớn: `[✓ Đạt yêu cầu (Approved)]` vs `[✕ Từ chối (Rejected)]`.
       - Select Hướng in: *Thẳng đứng (Vertical)*, *Nghiêng 45 độ (Angled 45)*, *Nằm ngang (Horizontal)*.
       - Select Vật liệu duyệt: *Resin Tiêu chuẩn*, *Resin 8K Cao cấp*, *Nhựa PLA Pro*, *Nylon CF*.
       - Input Chiều cao in (mm) và Slicer tương thích (*ChituBox*, *Bambu Studio*).
       - 2 Checkbox kiểm định:
         - [ ] *Xác nhận kết cấu đỡ (Support) đạt tiêu chuẩn in, không ăn vào mặt chi tiết chính.*
         - [ ] *Xác nhận nằm gọn trong khổ in (Build Volume) của trạm.*
       - Textarea ghi chú của kiểm định viên (Tối thiểu 3 ký tự).
       - Nút hành động: `[✓ Xác nhận phê duyệt mẫu in 3D]` $\rightarrow$ Gọi API `POST /api/v2/reviews`.

---

### 4.2. Màn hình 2: Bảng Kanban Điều phối Xưởng (`/staff/fulfillment`)
- **Header Thống kê**: 5 ô đếm số lượng đơn tương ứng 5 giai đoạn: *Chờ Gán Xưởng*, *Xưởng Tiếp Nhận*, *Đang Sản Xuất*, *Chờ Kiểm Định QC*, *Đóng Gói & Giao Vận*.
- **Bộ lọc & Tìm kiếm**: Search realtime theo mã `TB-...`, khách hàng, số điện thoại; Dropdown lọc chất liệu (*Resin, PLA, Nylon*).
- **5 Cột Kanban chức năng**:
  1. **Cột 1: Chờ Gán Xưởng (`col-awaiting`)**:
     - Nút: **[Gán Xưởng In]** $\rightarrow$ Mở `AssignLabDialog`.
  2. **Cột 2: Xưởng Tiếp Nhận (`col-assigned`)**:
     - Nút: **[Nhận Việc]** (Accept assignment) và **[Bắt Đầu In]** (Khởi chạy Run #1).
  3. **Cột 3: Đang In & Xử Lý (`col-production`)**:
     - Thẻ trạng thái luân chuyển 1-chạm: Đang in $\rightarrow$ Nút **[Chuyển Xử Lý Nguội →]**; Đang xử lý nguội $\rightarrow$ Nút **[Chuyển Chờ QC →]**.
  4. **Cột 4: Chờ Kiểm Định QC (`col-qc`)**:
     - Nút hành động nổi bật: **[Đánh Giá QC]** $\rightarrow$ Mở `QcReviewDialog`.
  5. **Cột 5: Đóng Gói & Giao Vận (`col-delivery`)**:
     - Nếu chưa có vận đơn $\rightarrow$ Nút **[Tạo Mã Vận Đơn]** $\rightarrow$ Mở `CreateShipmentDialog`.
     - Nếu đang giao $\rightarrow$ Nút **[Cập Nhật Giao Hàng]** $\rightarrow$ Mở `UpdateShipmentEventDialog`.

---

### 4.3. Màn hình 3: Drawer Lộ trình Sản xuất & Vận đơn (`FulfillmentTimelineDrawer`)
- Trượt từ bên phải khi click vào thẻ đơn hàng:
  - **Phần 1: Phân công xưởng in**: Tên trạm in nhận việc, thời gian gán, ghi chú phân bổ.
  - **Phần 2: Tiến độ sản xuất & Lượt in (Production Runs)**: Danh sách các đợt in (`Đợt in #1`, `Đợt in #2`), trạng thái, chi phí thực tế, ghi chú QC.
  - **Phần 3: Vận đơn & Sự kiện giao hàng (Shipments)**: Tên đơn vị vận chuyển (*VNPost Express 3D*), mã tracking (kèm nút copy nhanh), cước phí, timeline sự kiện giao vận (*LabelCreated $\rightarrow$ PickedUp $\rightarrow$ InTransit $\rightarrow$ Delivered*).

---

### 4.4. Màn hình 4: Các Hộp thoại Hành động (Action Dialogs)
1. **AssignLabDialog (Gán xưởng in đối tác)**:
   - Select chọn xưởng in từ API `/api/v2/partner-labs`.
   - Input chi phí xưởng (VNĐ), datetime-picker hạn hoàn thành dự kiến, textarea ghi chú kỹ thuật.
2. **QcReviewDialog (Ghi nhận kết quả kiểm định QC)**:
   - Radio: **Đạt chuẩn (Passed)** vs **Không đạt chuẩn (Failed)**.
   - Nếu không đạt: Dropdown lý do lỗi (*Bọt khí Resin, Cong vênh, Gãy support, Layer shift*), upload ảnh chụp bằng chứng lỗi, checkbox **"Kích hoạt in lại tự động (Trigger Reprint)"**.
   - Textarea ghi chú đánh giá chi tiết dung sai.
3. **CreateShipmentDialog (Tạo vận đơn giao hàng)**:
   - Select đơn vị vận chuyển (*VNPost Express 3D, Giao Hàng Nhanh, SPX Express*).
   - Input mã vận đơn tracking number.
   - Input cước phí giao hàng thực tế.

---

### 4.5. Màn hình 5: Thẩm định Khiếu nại Lỗi In (`/staff/defects`)
- Danh sách báo cáo lỗi từ khách hàng (`/api/v2/defect-reports`).
- Xem ảnh chụp lỗi của khách đối chiếu với ảnh lưu trữ QC lúc xuất xưởng.
- Hành động thẩm định:
  - **[Duyệt In Lại Đền Bù]** (`ReprintApproved`): Tự động sinh đơn in mới miễn phí chuyển vào xưởng.
  - **[Duyệt Hoàn Tiền]** (`RefundApproved`): Chuyển phiếu yêu cầu sang Admin để giải ngân PayOS.
  - **[Bác Bỏ Khiếu Nại]** (`Rejected`): Nhập giải trình kỹ thuật gửi email phản hồi khách.

---

## 5. DATA CONTRACTS & API ENDPOINTS

```typescript
// 1. Phê duyệt kỹ thuật mẫu 3D (POST /api/v2/reviews)
export interface CreatePrintReviewPayload {
  versionId: string;
  decision: 'Approved' | 'Rejected';
  checklist: {
    watertight: boolean;
    wallThicknessMm: number;
    supportRequired: boolean;
    orientation: 'Vertical' | 'Angled45' | 'Horizontal';
    slicer: string;
  };
  configuration: {
    material: string;
    heightMm: number;
    scale: number;
  };
  note: string;
  evidenceStorageKey?: string;
}

// 2. Gán xưởng in đối tác (POST /api/v2/orders/{id}/assignments)
export interface AssignPartnerPayload {
  partnerLabId: string;
  dueAtUtc?: string;
  decisionNote?: string;
  partnerCostSnapshotVnd?: number;
}

// 3. Khởi tạo đợt in (POST /api/v2/assignments/{id}/production-runs)
export interface StartProductionRunPayload {
  quantity?: number;
  actualCostVnd?: number;
}

// 4. Cập nhật tiến độ gia công (POST /api/v2/production-runs/{id}/status)
export interface UpdateRunStatusPayload {
  status: 'PostProcessing' | 'QualityCheck';
}

// 5. Ghi nhận kết quả QC (POST /api/v2/production-runs/{id}/qc)
export interface RecordQcPayload {
  passed: boolean;
  qcNote?: string;
  qcEvidenceStorageKey?: string;
  triggerReprint?: boolean;
  actualCostVnd?: number;
}

// 6. Tạo vận đơn giao hàng (POST /api/v2/orders/{id}/shipments)
export interface CreateShipmentPayload {
  carrier: string;
  trackingNumber: string;
  shippingActualVnd?: number;
}

// 7. Giải quyết khiếu nại lỗi in (POST /api/v2/defect-reports/{id}/resolve)
export interface ResolveDefectPayload {
  resolutionType: 'ReprintApproved' | 'RefundApproved' | 'Rejected';
  resolutionNote?: string;
}
```

---

## 6. PROMPT NẠP TRỰC TIẾP CHO GEMINI ARGON WEB

> **HƯỚNG DẪN**: Copy toàn bộ nội dung trong ô code bên dưới và dán vào thanh chat của **Gemini Argon Web**.

```markdown
Bạn là Kiến trúc sư trưởng Frontend (Principal Frontend Architect) chuyên sâu về React 19, TypeScript, Tailwind CSS v4, Three.js và framer-motion.

HÃY VIẾT TOÀN BỘ CODE HOÀN CHỈNH CHO PHÂN HỆ GIAO DIỆN QUẢN TRỊ KỸ THUẬT & VẬN HÀNH (STAFF PORTAL) của dự án PRIN3D / THE BOYS (Nền tảng in 3D công nghiệp từ mô hình AI 2D sang 3D).

### 1. Bối cảnh & Phân quyền Staff:
- Staff là Kỹ thuật viên & Vận hành sản xuất (Role = 2). Staff phụ trách toàn bộ chuỗi sản xuất thực tế: Thẩm định mô hình 3D, Điều phối trạm in, Theo dõi máy in & xử lý nguội, Kiểm định QC thực tế, Tạo vận đơn và Xử lý lỗi in.
- Staff KHÔNG quản lý người dùng, KHÔNG sửa bảng giá, KHÔNG xem doanh thu tài chính.
- Hệ thống dùng Theme Cyberpunk Dark Obsidian (`#070B14`, `#090D14`, Neon Cyan `#00F0FF`, Emerald `#10B981`, Amber `#F59E0B`, Rose `#F43F5E`) với font Urbanist và font Mono cho số liệu. Hỗ trợ chuyển đổi nhanh Light Mode.

### 2. Các trang cần code đầy đủ:
1. `StaffLayout.tsx` & `StaffSidebar.tsx`:
   - Logo The Boys, Menu: Thẩm định mẫu in (`/staff/reviews`), Điều phối xưởng Kanban (`/staff/fulfillment`), Danh sách đơn hàng (`/staff/orders`), Xử lý khiếu nại (`/staff/defects`).
   - Nút chuyển Dark/Light mode, Avatar Staff, nút Đăng xuất.

2. `StaffReviewsPage.tsx` & `StaffModelViewer.tsx` (`/staff/reviews`):
   - Cột trái: Hàng đợi mẫu in 3D AI chờ thẩm định (Tabs lọc: Tất cả, Hoàn tất, Cần chú ý, Hở lưới).
   - Cột phải: Khung 3D Viewport WebGL (Three.js OrbitControls, lưới không gian, nút tự xoay, nút reset camera); Thẻ chỉ số đo đạc hình học (Chiều cao yêu cầu mm, Kích thước thực tế XYZ mm, Thể tích cm3, Tổng tam giác); Phiếu thẩm định kỹ thuật (2 nút Đạt/Từ chối, Select hướng in, Select vật liệu SLA/PLA/Nylon, Checkbox Support, Checkbox Build Volume, Textarea ghi chú, Nút xác nhận gọi API `POST /api/v2/reviews`).

3. `StaffFulfillmentKanbanPage.tsx` (`/staff/fulfillment`):
   - Thanh thống kê 5 chỉ số đầu trang (Chờ gán xưởng, Xưởng tiếp nhận, Đang sản xuất, Chờ QC, Đóng gói giao vận).
   - Ô tìm kiếm mã đơn `TB-...` và lọc chất liệu in realtime.
   - Bảng Kanban 5 cột chuẩn quy trình:
     * Cột 1 (Chờ Gán Xưởng): Nút [Gán Xưởng In] mở `AssignLabDialog`.
     * Cột 2 (Xưởng Tiếp Nhận): Nút [Nhận Việc] và [Bắt Đầu In].
     * Cột 3 (Đang In & Xử Lý): Nút [Chuyển Xử Lý Nguội →] và [Chuyển Chờ QC →].
     * Cột 4 (Chờ Kiểm Định QC): Nút [Đánh Giá QC] mở `QcReviewDialog`.
     * Cột 5 (Đóng Gói & Giao Vận): Nút [Tạo Mã Vận Đơn] mở `CreateShipmentDialog` hoặc [Cập Nhật Giao Hàng].

4. `StaffFulfillmentDrawer.tsx`:
   - Trượt mượt từ bên phải khi bấm vào bất kỳ thẻ đơn hàng nào: Hiển thị Section Phân công xưởng, Section Tiến độ các lượt in (Run #1, Run #2), Section Vận đơn & Lịch trình di chuyển kiện hàng.

5. Bộ Modal Hành động:
   - `AssignLabDialog.tsx`: Chọn trạm in đối tác, nhập hạn chót, chi phí xưởng.
   - `QcReviewDialog.tsx`: Chấm Đạt / Không đạt, chọn loại lỗi, upload ảnh lỗi, checkbox "Kích hoạt in lại tự động (Trigger Reprint)".
   - `CreateShipmentDialog.tsx`: Chọn hãng tàu (VNPost, GHN, SPX), nhập mã tracking, cước phí.

### 3. Yêu cầu kỹ thuật:
- Viết code sạch, 100% TypeScript, định nghĩa rõ ràng DTO Interfaces.
- Thao tác API thông qua module Axios client có sẵn (`import api from '../../lib/api'`).
- Hiển thị Toast thông báo trạng thái với `react-toastify`.
- Clean up Three.js animation frame, OrbitControls và ObjectURL khi unmount để chống rò rỉ bộ nhớ.
- Tạo sẵn Mock Data phong phú, chân thực cho phép chạy thử ngay lập tức ngay cả khi Backend chưa bật.
```
