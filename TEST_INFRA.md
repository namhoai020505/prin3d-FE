# E2E Test Infra: Admin Portal Phase 3 & Phase 4

## Test Philosophy
- Requirement-driven, opaque-box testing using Playwright with MS Edge channel.
- Verification covers UI rendering, interaction flows, API contracts, idempotency, security role guarding, and system state changes.

## Feature Inventory & Test Coverage
| # | Feature | Source (Requirement) | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Scenario) |
|---|---------|----------------------|:----------------:|:-----------------:|:----------------------:|:-----------------:|
| 1 | Tab 5 Finance (Payment & Refunds) | ORIGINAL_REQUEST §R1 | Test 1a: Reconcile PayOS | Test 1b: Refund amount validation | Test 1c: Refund reflects in list | Test 1d: End-to-end payment to refund flow |
| 2 | Tab 6 Warranty (Defect Reports) | ORIGINAL_REQUEST §R2 | Test 2a: Defect reports table | Test 2b: Resolution note >= 10 chars | Test 2c: Lightbox evidence viewer | Test 2d: Resolve defect report (Reprint/Refund) |
| 3 | Tab 1 Observability (Dashboard) | ORIGINAL_REQUEST §R3 | Test 3a: 4 KPI Cards render | Test 3b: Real-time data fetch | Test 3c: Outbox manual dispatch | Test 3d: Observability live refresh |
| 4 | Tab 7 System Admin (Users & Pricing) | ORIGINAL_REQUEST §R4 | Test 4a: User table pagination | Test 4b: Credit grant 1-100 range | Test 4c: Lock/Unlock user state | Test 4d: Edit pricing package |
| 5 | Security Route Guard | ORIGINAL_REQUEST §R4, R5 | Test 5a: Staff denied /admin/system | Test 5b: Customer denied /admin/system | Test 5c: Redirection to home | Test 5d: Security unauthorized attempts |

## Test Architecture
- **Framework**: Playwright (`@playwright/test`)
- **Browser Channel**: `msedge`
- **Execution Mode**: `workers: 1`, `retries: 0`, sequential
- **Base URL**: `http://localhost:5173`
- **Backend API**: `http://localhost:5133`
- **Database**: LocalDB `TheBoysDb`
- **Authentication**: Direct API login + `sessionStorage` token injection with `g2c-auth-session-changed` event dispatch.
- **Data Pre-seeding**: Direct SQL or API hooks for test records (DefectReports, PaymentAttempts).

## Test Cases Defined in `e2e/admin-phase3-phase4.spec.ts`
1. **Test 1 (Finance)**: Admin navigates to `/admin/finance`, executes PayOS payment reconciliation, creates idempotent refund with valid reason.
2. **Test 2 (Warranty)**: Admin navigates to `/admin/warranty`, inspects evidence photo lightbox, resolves defect report with decision (`ReprintApproved` or `RefundApproved`).
3. **Test 3 (Observability)**: Admin opens `/admin/dashboard`, verifies 4 KPI metrics cards, triggers manual Outbox dispatch with batchSize 50.
4. **Test 4 (User Admin)**: Admin navigates to `/admin/system`, grants AI credits with Idempotency-Key, performs Lock and Unlock on user.
5. **Test 5 (Pricing Packages)**: Admin edits 3D printing package price and status in `/admin/system`.
6. **Test 6 (Role Guard Security)**: Staff and Customer accounts attempting to access `/admin/system` are blocked and safely redirected.
