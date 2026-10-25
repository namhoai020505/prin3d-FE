# Project: Admin Portal Phase 3 & Phase 4 Implementation

## Architecture
- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS (Cyberpunk Obsidian Theme).
  - Location: `c:\Users\namho\Downloads\FPT\Exe\prin3d-FE`
  - Key Modules: `src/pages/admin/*`, `src/services/*`, `src/layouts/admin/*`, `src/App.tsx`.
- **Backend**: .NET 10 WebApi + MediatR Clean Architecture + Entity Framework Core (SQL Server LocalDB `TheBoysDb`).
  - Location: `C:\Users\namho\Downloads\FPT\Exe\print3d`
  - Key Modules: `TheBoys.Domain`, `TheBoys.Application`, `TheBoys.Infrastructure`, `TheBoys.WebApi`.
- **E2E Testing**: Playwright with MS Edge channel, accelerated API/sessionStorage auth, SQL Server state seeding.
  - Location: `c:\Users\namho\Downloads\FPT\Exe\prin3d-FE\e2e`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Tab 5 Finance - Payment Reconciliation | Sub-tab 1: payment attempts table, status badges, PayOS reconciliation action with toast | M2 | R1 |
| F2 | Tab 5 Finance - Refund Management | Sub-tab 2: refunds list, idempotent refund creation modal (UUID, reason >= 10 chars), refund reconciliation | M2 | R1 |
| F3 | Tab 6 Warranty - Backend CQRS & Endpoint | `GetDefectReportsQuery` (with `.AsNoTracking()`) in `TheBoys.Application` and `GET /api/v2/defect-reports` in `TheBoys.WebApi` | M1 | R2 |
| F4 | Tab 6 Warranty - Frontend UI & Defect Resolution | `WarrantyPage.tsx`: defect reports table, lightbox thumbnail viewer, 3-way resolution modal (`ReprintApproved`, `RefundApproved`, `Rejected`), `defectService.ts` | M2 | R2 |
| F5 | Tab 1 Observability - Dashboard | `DashboardPage.tsx`: 4 KPI cards, 2-axis charts (fulfillment vs payment), AI provider metrics, manual outbox dispatch ({ batchSize: 50 }) | M3 | R3 |
| F6 | Tab 7 System Admin - User Management | `SystemAdminPage.tsx`: 20-row pagination, role switch dropdown (`admin`/`staff`/`cus`), account lock/unlock, idempotent credit grant (1-100 credits) | M3 | R4 |
| F7 | Tab 7 System Admin - Pricing Packages | `SystemAdminPage.tsx`: pricing packages table, update pricing modal/form (`PATCH /api/admin/pricing-packages/{id}`) | M3 | R4 |
| F8 | Global UI/UX Navigation & Design System | Sidebar all 7 tabs enabled, remove "Sắp có", strictly vector icons (`react-icons/fa`, `lucide-react`), 0 emojis, route guarding, `Studio3DViewport.tsx` untouched | M3 | R4, R5 |
| F9 | E2E Playwright Suite Creation | `e2e/admin-phase3-phase4.spec.ts`: 6 test cases for Finance, Warranty, Observability, User Admin, Pricing, Role Guard | M4 | R6 |
| F10 | Regression Testing & Acceptance Report | Phase 1, Phase 2, Phase 3/4 100% pass, clean builds, generate `C:\Users\namho\Downloads\FPT\Exe\report\exereport18.txt` | M5 | R6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Warranty CQRS & Endpoint | Implement `GetDefectReportsQuery` in `TheBoys.Application` and `GET /api/v2/defect-reports` in `TheBoys.WebApi` | none | DONE |
| M2 | Phase 3 Frontend (Finance & Warranty) | Implement `FinancePage.tsx`, `WarrantyPage.tsx`, and `defectService.ts` | M1 | DONE |
| M3 | Phase 4 Frontend & Global Navigation | Implement `DashboardPage.tsx`, `SystemAdminPage.tsx`, update `Sidebar.tsx`, `Topbar.tsx`, and `App.tsx` (Role Guard) | none | IN_PROGRESS |
| M4 | E2E Testing Suite (`admin-phase3-phase4.spec.ts`) | Design and implement 6 automated test cases in `e2e/admin-phase3-phase4.spec.ts` | M1 | PLANNED |
| M5 | Final Regression & Acceptance Report | Execute all test suites (Phases 1, 2, 3/4), verify 0 errors, generate `exereport18.txt` | M2, M3, M4 | PLANNED |

## Interface Contracts
### `TheBoys.Application` ↔ `TheBoys.WebApi` (Warranty Query)
- **Query**: `public record GetDefectReportsQuery() : IRequest<List<DefectReportDto>>;`
- **DTO**:
  ```csharp
  public record DefectReportDto(
      Guid Id,
      Guid OrderId,
      string OrderCode,
      string CustomerName,
      string Reason,
      List<string> EvidencePhotos,
      string Status,
      string? ResolutionNote,
      DateTime CreatedAtUtc,
      DateTime? ResolvedAtUtc
  );
  ```
- **Handler**: Uses `_dbContext.DefectReports.AsNoTracking().Include(x => x.Order).Include(x => x.User).Include(x => x.Evidence)`
- **Endpoint**: `[HttpGet("defect-reports"), Authorize(Roles = Roles.Management)]` in `DefectReportsV2Controller.cs`

### Frontend ↔ Backend Contracts
- `GET /api/v2/defect-reports`: Returns `List<DefectReportDto>`
- `POST /api/v2/defect-reports/{reportId}/resolve`: Request `{ "resolutionType": "ReprintApproved" | "RefundApproved" | "Rejected", "resolutionNote": string }`
- `GET /api/v2/orders/{id}/payment-attempts`: Returns `List<PaymentAttemptDto>`
- `POST /api/v2/payments/reconcile/{attemptId}`: Returns `PaymentAttemptDto`
- `POST /api/v2/orders/{id}/refunds`: Header `Idempotency-Key: UUID`, Body `{ "amountVnd": decimal, "reason": string }`
- `GET /api/v2/orders/{id}/refunds`: Returns `List<RefundDto>`
- `POST /api/v2/refunds/{refundId}/reconcile`: Body `{ "note": string }`
- `GET /api/v2/admin/observability`: Returns `ObservabilityReportDto`
- `POST /api/v2/admin/outbox/dispatch`: Body `{ "batchSize": 50 }`
- `GET /api/admin/users?page={page}`: Returns `UserAdminDto[]` (20 items/page displayed on frontend)
- `PATCH /api/admin/users/{id}/role`: Body `{ "role": "admin" | "staff" | "cus" }`
- `POST /api/admin/users/{id}/lock`: Body `{ "reason": string }`
- `POST /api/admin/users/{id}/unlock`: Body `{}`
- `POST /api/admin/users/credits`: Header/Body `Idempotency-Key`, Body `{ "userId": Guid, "amount": int, "reason": string, "idempotencyKey": string }`
- `GET /api/pricing-packages`: Returns active pricing packages
- `PATCH /api/admin/pricing-packages/{id}`: Body `{ "priceVnd": decimal, "isActive": bool }`

## Code Layout
### Protected Source Files (STRICTLY READ-ONLY)
- `src/pages/user/components/Studio3DViewport.tsx` (DO NOT MODIFY UNDER ANY CIRCUMSTANCES)

### Frontend Files
- `src/pages/admin/finance/FinancePage.tsx` (New)
- `src/pages/admin/warranty/WarrantyPage.tsx` (New)
- `src/pages/admin/dashboard/DashboardPage.tsx` (New, replaces prototype Dashboard.tsx)
- `src/pages/admin/system/SystemAdminPage.tsx` (New)
- `src/services/defectService.ts` (Add `getDefectReports()`)
- `src/layouts/admin/Sidebar.tsx` (Enable 7 tabs, remove "Sắp có", vector icons only)
- `src/layouts/admin/Topbar.tsx` (Update route headers)
- `src/App.tsx` (Register routes, apply strict `allowedRoles={['admin']}` for `/admin/system`)

### Backend Files
- `C:\Users\namho\Downloads\FPT\Exe\print3d\src\TheBoys.Application\Defects\Queries\GetDefectReportsQuery.cs` (New)
- `C:\Users\namho\Downloads\FPT\Exe\print3d\src\TheBoys.WebApi\Controllers\v2\DefectReportsV2Controller.cs` (Add `GET defect-reports`)

### E2E Test Files
- `c:\Users\namho\Downloads\FPT\Exe\prin3d-FE\e2e\admin-phase3-phase4.spec.ts` (New)
- `c:\Users\namho\Downloads\FPT\Exe\prin3d-FE\e2e\admin-phase1.spec.ts` (Harmonize "Sắp có" assertion if needed)
