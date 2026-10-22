# LedgerPulse — CI End-to-End Test Report

**Result:** PASS for the listed isolated browser/API journeys  
**Tested source commit:** [`a77a379f537d96bdca42097a1646a8b4ea0ba8d6`](https://github.com/faizansaiyed123/service-agreement-manager-frontend/commit/a77a379f537d96bdca42097a1646a8b4ea0ba8d6)  
**CI run:** [Run #39728516824](https://github.com/faizansaiyed123/service-agreement-manager-frontend/actions/runs/39728516824)  
**Browser tests:** 2 passed, 0 failed, 0 skipped  
**Successful visual checkpoints:** 18

## Confirmed in this run

| Check | Result |
|---|---|
| Backend migrations against fresh PostgreSQL 16 | PASS |
| Backend readiness endpoint | PASS |
| Frontend production build and preview | PASS |
| Browser-to-API journey | PASS — customer, agreement, invoice/payment, assets/catalogue, work order, recurring schedule, CSV import/export, email outbox, maintenance and branch workflows |
| Tenant isolation / untrusted Origin | PASS — tested customer isolation path and CORS-origin rejection |
| Visual walkthrough publication | PASS — screenshots copied into this folder after successful assertions |

## Do not interpret this as full feature sign-off

This is broad but bounded end-to-end coverage, not a test of every LedgerPulse feature, role, validation branch or production scenario. The [visual walkthrough](VISUAL-TEST-WALKTHROUGH.md) contains a feature-by-feature coverage inventory and explicitly labels partial and untested areas.

Not yet tested end to end include webhook lifecycle/delivery and secret rotation, attachment upload/download, password reset/email verification/logout/session expiry, invoice partial payments/refunds/credits/voids, the complete RBAC matrix, recurring scheduler execution, provider-enabled SMS, live SMTP delivery and hosted production.

The live deployment was not verified: Vercel inspection was blocked by deployment protection and no linked Render backend service was found in the connected workspace. Tests use a local production-built frontend, the backend repository's `main` branch and disposable PostgreSQL 16.

Test data is synthetic. Email only enters the outbox, SMS takes the expected provider-disabled path, and no real payment, email, SMS or webhook delivery is attempted.