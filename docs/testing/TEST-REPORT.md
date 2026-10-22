# LedgerPulse — CI End-to-End Test Report

**Result:** PASS for the listed isolated browser/API journeys  
**Tested source commit:** [`ed8cf14918e96c4138ab3f2b82dc89e1d2a20be0`](https://github.com/faizansaiyed123/service-agreement-manager-frontend/commit/ed8cf14918e96c4138ab3f2b82dc89e1d2a20be0)  
**CI run:** [Run #39760398718](https://github.com/faizansaiyed123/service-agreement-manager-frontend/actions/runs/39760398718)  
**Browser tests:** 4 passed, 0 failed, 0 skipped  
**Successful visual checkpoints:** 25  
**Backend suite:** 73 passed, 0 failures/errors, 2 skipped  
**PostgreSQL concurrency suite:** 2 passed, 0 failures/errors, 0 skipped

## Confirmed in this run

| Check | Result |
|---|---|
| Backend migrations against fresh PostgreSQL 16 | PASS |
| Backend readiness endpoint | PASS |
| Alembic schema consistency (`alembic check`) | PASS |
| Backend quality/tests (`ruff check .`, full `pytest` suite) | PASS — 73 passed, 0 failures/errors, 2 skipped |
| PostgreSQL concurrency tests (concurrent invoice payment and maintenance generation) | PASS — 2 passed, 0 failures/errors, 0 skipped |
| Frontend production build and preview | PASS |
| Browser-to-API journey | PASS — customer, agreement, invoice/payment, assets/catalogue, work order, recurring schedule, CSV import/export, email outbox, maintenance and branch workflows |
| Tenant isolation / untrusted Origin | PASS — tested customer isolation path and CORS-origin rejection |
| Visual walkthrough publication | PASS — screenshots copied into this folder after successful assertions |

## Do not interpret this as full feature sign-off

This is broad but bounded end-to-end coverage, not a test of every LedgerPulse feature, role, validation branch or production scenario. The [visual walkthrough](VISUAL-TEST-WALKTHROUGH.md) contains a feature-by-feature coverage inventory and explicitly labels partial and untested areas.

Coverage was extended with browser-origin API flows for attachment upload/download/checksum/delete and tenant isolation; webhook endpoint validation/secret redaction/rotation/deactivation/tenant isolation; cookie refresh/logout revocation; password-reset anti-enumeration plus password-reset and email-verification error UI with token-fragment removal; and invoice partial payments, idempotent replay/conflicts, overpayment rejection, refunds, credits, voiding and PDF generation. Backend pytest also covers the backend's broader role, token, webhook-signing/retry and business-rule tests. Still not fully verified are every role/resource combination, every validation/expiry/race edge beyond the two tested PostgreSQL concurrency races, the live deployed recurring-billing scheduler/worker cadence, live SMTP/SMS/webhook provider delivery, production object storage and hosted production integration.

The live deployment was not verified: Vercel inspection was blocked by deployment protection and no linked Render backend service was found in the connected workspace. Tests use a local production-built frontend, the backend repository's `main` branch and disposable PostgreSQL 16.

Test data is synthetic. Email only enters the outbox, SMS takes the expected provider-disabled path, and no real payment, email, SMS or webhook delivery is attempted.