# Service Agreement Manager — CI End-to-End Test Report

**Result:** PASS for the listed isolated browser/API journeys  
**Tested source commit:** [`__TESTED_SHA__`](https://github.com/__REPOSITORY__/commit/__TESTED_SHA__)  
**CI run:** [Run #__RUN_ID__](__RUN_URL__)  
**Browser tests:** __E2E_PASSED__ passed, __E2E_FAILED__ failed, __E2E_SKIPPED__ skipped  
**Successful visual checkpoints:** __CHECKPOINT_COUNT__  
**Backend suite:** __BACKEND_PASSED__ passed, __BACKEND_FAILED__ failures/errors, __BACKEND_SKIPPED__ skipped  
**PostgreSQL concurrency suite:** __PG_RACE_PASSED__ passed, __PG_RACE_FAILED__ failures/errors, __PG_RACE_SKIPPED__ skipped

## Confirmed in this run

| Check | Result |
|---|---|
| Backend migrations against fresh PostgreSQL 16 | PASS |
| Backend readiness endpoint | PASS |
| Alembic schema consistency (`alembic check`) | PASS |
| Backend quality/tests (`ruff check .`, full `pytest` suite) | PASS — __BACKEND_PASSED__ passed, __BACKEND_FAILED__ failures/errors, __BACKEND_SKIPPED__ skipped |
| PostgreSQL concurrency tests (concurrent invoice payment and maintenance generation) | PASS — __PG_RACE_PASSED__ passed, __PG_RACE_FAILED__ failures/errors, __PG_RACE_SKIPPED__ skipped |
| Frontend production build and preview | PASS |
| Browser-to-API journey | PASS — customer, agreement, invoice/payment, assets/catalogue, work order, recurring schedule, CSV import/export, email outbox, maintenance and branch workflows |
| Tenant isolation / untrusted Origin | PASS — tested customer isolation path and CORS-origin rejection |
| Visual walkthrough publication | PASS — screenshots copied into this folder after successful assertions |

## Do not interpret this as full feature sign-off

This is broad but bounded end-to-end coverage, not a test of every Service Agreement Manager feature, role, validation branch or production scenario. The [visual walkthrough](VISUAL-TEST-WALKTHROUGH.md) contains a feature-by-feature coverage inventory and explicitly labels partial and untested areas.

Coverage was extended with browser-origin API flows for attachment upload/download/checksum/delete and tenant isolation; webhook endpoint validation/secret redaction/rotation/deactivation/tenant isolation; cookie refresh/logout revocation; password-reset anti-enumeration plus password-reset and email-verification error UI with token-fragment removal; and invoice partial payments, idempotent replay/conflicts, overpayment rejection, refunds, credits, voiding and PDF generation. Backend pytest also covers the backend's broader role, token, webhook-signing/retry and business-rule tests. Still not fully verified are every role/resource combination, every validation/expiry/race edge beyond the two tested PostgreSQL concurrency races, the live deployed recurring-billing scheduler/worker cadence, live SMTP/SMS/webhook provider delivery, production object storage and hosted production integration.

The live deployment was not verified: Vercel inspection was blocked by deployment protection and no linked Render backend service was found in the connected workspace. Tests use a local production-built frontend, the backend repository's `main` branch and disposable PostgreSQL 16.

Test data is synthetic. Email only enters the outbox, SMS takes the expected provider-disabled path, and no real payment, email, SMS or webhook delivery is attempted.