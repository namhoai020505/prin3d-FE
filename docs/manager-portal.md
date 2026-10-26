# Manager portal

Entry point: `/manager/dashboard`. Login redirects Manager accounts to this route;
Admin can also open it from the admin sidebar. Staff and Customer cannot enter it.

The portal shares the staff theme and production/review/defect workflows. It adds
an operational overview, searchable order management with detail/cancellation,
payment history, refunds and reconciliation. Data comes from the existing backend
APIs. Status/material options are derived from API results; there are no frontend
demo records or fallback business data. Loading, failure and empty states are explicit.

## Backend dependency

Use the backend changes on `codex/manager-access` in the `print3d` repository and
restart the API. They map the existing numeric role `4` to `manager`, include it in
operational authorization and retain Admin-only account management. No role values
or credentials of existing accounts are changed. No database migration is needed.

The order service maps the V2 API's `paymentStatus`, `subtotalVnd`, `shippingFeeVnd`
and `totalVnd` to the existing drawer model, so monetary values and payment status
are consistent between the list and detail. Review thumbnails use authenticated
blob requests and revoke their object URLs on unmount.

## Temporary development records

Run `database/manager-demo.sql` against the configured development database, using
`sqlcmd -b -f 65001 -S <server> -d <database> -E -i database/manager-demo.sql`.
The script runs in a transaction, is safe to repeat and inserts 12 orders marked
`TB-DEMO-MGR-*` with their operational records. It selects existing accounts and
an active pricing package by query. It never updates or inserts account credentials.
All order names, transaction references and evidence keys in this fixture are
explicitly demonstration data; evidence keys do not represent uploaded photos.

The script does not reset workflow changes made during manual testing. Removing
business data from the database results in empty portal states. It has no automatic
reseed, localStorage fixtures or embedded fallback records.

## Verification

- Frontend production build and ESLint on the new portal/auth/review modules.
- Live API and Edge/Playwright validation at desktop 1440×1000 and mobile 390×844:
  overview, themes, search, empty search, filters, detail totals, lab assignment,
  production progress, payment history/refund form, reviews, defects and navigation.
- Backend `ManagerAccessTests`: Manager can read other customers' operations;
  Admin account management and another customer's access remain forbidden.

Gateway settlement and sending real refunds were not exercised against a live
payment provider. The portal invokes the existing backend payment operations.
