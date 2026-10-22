# LedgerPulse — End-to-End Visual Walkthrough

> Curated screenshots from verified browser states. The regression image is historical failure evidence and is deliberately not counted as a successful checkpoint.

**Tested source commit:** [`__TESTED_SHA__`](https://github.com/__REPOSITORY__/commit/__TESTED_SHA__)  
**CI workflow:** [Run #__RUN_ID__](__RUN_URL__)  
**Browser:** Chromium controlled by Playwright  
**Application build:** Vite production build served locally against the FastAPI backend on `main`  
**Database:** Disposable PostgreSQL 16  
**Viewport:** 1280 × 720 for most screenshots; homepage is captured full-page; reports is taller than the viewport.

## How to read this walkthrough

This report follows Sayphora's screenshot layout: journeys are ordered, images are displayed in aligned two-column HTML tables, and each screenshot has a caption describing the action and assertion. Images are captured only after checkpoint assertions succeed, except the separately labelled historical regression reproduction.

**Latest automated result:** __E2E_PASSED__ Playwright tests passed, __E2E_FAILED__ failed, __E2E_SKIPPED__ skipped. There are __CHECKPOINT_COUNT__ successful screenshot checkpoints. These checks provide broad integration evidence, **not a claim that every LedgerPulse feature or every edge case has been tested**.

**Backend verification:** __BACKEND_PASSED__ passed, __BACKEND_FAILED__ failures/errors, __BACKEND_SKIPPED__ skipped in the full backend suite; PostgreSQL concurrency checks: __PG_RACE_PASSED__ passed, __PG_RACE_FAILED__ failures/errors, __PG_RACE_SKIPPED__ skipped. Ruff and Alembic schema-consistency checks also run.

## Regression evidence — before and after the fix

__FAILURE_SCREENSHOT_NOTE__

<table><tbody><tr>
<td width="50%" valign="top"><h3>00. Before fix — acceptance modal remained open</h3><a href="visuals/00-before-fix-agreement-acceptance-modal.png"><img src="visuals/00-before-fix-agreement-acceptance-modal.png" alt="Historical failure screenshot showing the acceptance modal left open" width="100%"/></a><p><strong>Status: historical failure reproduction.</strong> The backend activated an agreement effective today, but the frontend acceptance modal stayed open. This image is not counted as a passed checkpoint.</p><p><em>Viewport: 1280 × 720</em></p></td>
<td width="50%" valign="top"><h3>After fix — active agreement without the modal</h3><a href="visuals/06-agreement-active.png"><img src="visuals/06-agreement-active.png" alt="Agreement active after successful acceptance" width="100%"/></a><p><strong>Status: passed after fix.</strong> The acceptance flow now closes the modal, then verifies the active state followed by suspend/resume transitions.</p><p><em>Viewport: 1280 × 720</em></p></td>
</tr></tbody></table>

## Verified user journeys

### Application entry and customer setup

<table><tbody>
<tr><td width="50%" valign="top"><h3>01. Public homepage</h3><a href="visuals/01-public-homepage.png"><img src="visuals/01-public-homepage.png" alt="Public homepage" width="100%"/></a><p>The production-built frontend loads from the local preview server. This is a UI smoke checkpoint, not a test of every landing-page link.</p><p><em>Viewport: full page, 1280 px wide</em></p></td><td width="50%" valign="top"><h3>02. Invalid login</h3><a href="visuals/02-login-invalid-credentials.png"><img src="visuals/02-login-invalid-credentials.png" alt="Invalid credentials error" width="100%"/></a><p>An unknown synthetic account is rejected with the expected 401 response and a readable login error.</p><p><em>Viewport: 1280 × 720</em></p></td></tr>
<tr><td width="50%" valign="top"><h3>03. Dashboard after registration</h3><a href="visuals/03-dashboard-after-registration.png"><img src="visuals/03-dashboard-after-registration.png" alt="Dashboard after account registration" width="100%"/></a><p>A synthetic owner registers, receives an authenticated response, and reaches the dashboard.</p><p><em>Viewport: 1280 × 720</em></p></td><td width="50%" valign="top"><h3>04. Customer, contact and service location</h3><a href="visuals/04-customer-and-service-location.png"><img src="visuals/04-customer-and-service-location.png" alt="Customer and service location setup" width="100%"/></a><p>The browser creates a customer, billing contact and service location, then verifies persisted association and fields.</p><p><em>Viewport: 1280 × 720</em></p></td></tr>
</tbody></table>

### Agreements and invoices

<table><tbody>
<tr><td width="50%" valign="top"><h3>05. Draft agreement</h3><a href="visuals/05-agreement-draft.png"><img src="visuals/05-agreement-draft.png" alt="Draft service agreement" width="100%"/></a><p>A draft agreement is created and the returned amount and customer association are checked.</p><p><em>Viewport: 1280 × 720</em></p></td><td width="50%" valign="top"><h3>06. Agreement active</h3><a href="visuals/06-agreement-active.png"><img src="visuals/06-agreement-active.png" alt="Active service agreement" width="100%"/></a><p>Proposal, acceptance, automatic effective-date activation, modal closure, suspension and resume are verified.</p><p><em>Viewport: 1280 × 720</em></p></td></tr>
<tr><td width="50%" valign="top"><h3>07. Draft invoice</h3><a href="visuals/07-invoice-draft.png"><img src="visuals/07-invoice-draft.png" alt="Draft invoice" width="100%"/></a><p>The invoice is created through the UI and customer, total and initial status are asserted.</p><p><em>Viewport: 1280 × 720</em></p></td><td width="50%" valign="top"><h3>08. Invoice fully paid</h3><a href="visuals/08-invoice-paid.png"><img src="visuals/08-invoice-paid.png" alt="Paid invoice" width="100%"/></a><p>The invoice is issued and fully paid; a later API read confirms paid status and zero balance due.</p><p><em>Viewport: 1280 × 720</em></p></td></tr>
</tbody></table>

### Equipment and service catalogue

<table><tbody><tr><td width="50%" valign="top"><h3>09. Equipment created</h3><a href="visuals/09-equipment-created.png"><img src="visuals/09-equipment-created.png" alt="Equipment created for customer" width="100%"/></a><p>The equipment is linked to the customer and location; returned IDs and serial number are checked.</p><p><em>Viewport: 1280 × 720</em></p></td><td width="50%" valign="top"><h3>10. Service catalogue item created</h3><a href="visuals/10-service-catalog-created.png"><img src="visuals/10-service-catalog-created.png" alt="Service catalogue item created" width="100%"/></a><p>The new service code and unit price are verified from the server response and UI.</p><p><em>Viewport: 1280 × 720</em></p></td></tr></tbody></table>

### Field operations and maintenance

<table><tbody>
<tr><td width="50%" valign="top"><h3>11. Work order completed</h3><a href="visuals/11-work-order-completed.png"><img src="visuals/11-work-order-completed.png" alt="Completed work order" width="100%"/></a><p>The browser creates a technician, then creates, assigns, starts and completes a work order. API status transitions are asserted.</p><p><em>Viewport: 1280 × 720</em></p></td><td width="50%" valign="top"><h3>12. Recurring billing active</h3><a href="visuals/12-recurring-billing-active.png"><img src="visuals/12-recurring-billing-active.png" alt="Active recurring invoice schedule" width="100%"/></a><p>A recurring billing schedule is created, paused and resumed. Background invoice generation is not tested.</p><p><em>Viewport: 1280 × 720</em></p></td></tr>
<tr><td width="50%" valign="top"><h3>18. Maintenance plan generation</h3><a href="visuals/18-maintenance-plan-generation.png"><img src="visuals/18-maintenance-plan-generation.png" alt="Maintenance plan after idempotent order generation" width="100%"/></a><p>A plan with a checklist is created. Generating the same occurrence twice returns the same work-order ID, and the duplicate returns HTTP 200.</p><p><em>Viewport: 1280 × 720</em></p></td><td width="50%" valign="top"></td></tr>
</tbody></table>

### CSV reporting and import recovery

<table><tbody><tr><td width="50%" valign="top"><h3>13. Reports and CSV exports</h3><a href="visuals/13-reports-and-csv-exports.png"><img src="visuals/13-reports-and-csv-exports.png" alt="Reports and exported CSV records" width="100%"/></a><p>Four CSV exports download with expected filenames and contain test records created in the same journey.</p><p><em>Viewport: 1280 × 886</em></p></td><td width="50%" valign="top"><h3>14. Customer import recovery</h3><a href="visuals/14-customer-import-recovery.png"><img src="visuals/14-customer-import-recovery.png" alt="Customer CSV import recovery" width="100%"/></a><p>Preview flags a duplicate, valid rows import, the failed row is corrected and retried, and the job ends with 3 imported and 0 failed.</p><p><em>Viewport: 1280 × 720</em></p></td></tr></tbody></table>

### Notifications and provider configuration

<table><tbody><tr><td width="50%" valign="top"><h3>15. Email queued</h3><a href="visuals/15-email-queued.png"><img src="visuals/15-email-queued.png" alt="Email notification queued" width="100%"/></a><p>The email request persists with queued status. No sender worker is started and no email is delivered.</p><p><em>Viewport: 1280 × 720</em></p></td><td width="50%" valign="top"><h3>16. SMS provider disabled</h3><a href="visuals/16-sms-provider-disabled.png"><img src="visuals/16-sms-provider-disabled.png" alt="SMS provider disabled error" width="100%"/></a><p>The backend returns 503 `sms_provider_disabled`; the UI surfaces the configuration error. No SMS is sent.</p><p><em>Viewport: 1280 × 720</em></p></td></tr></tbody></table>

### Branch administration

<table><tbody><tr><td width="50%" valign="top"><h3>17. Branch hours and closures</h3><a href="visuals/17-branch-hours-and-closures.png"><img src="visuals/17-branch-hours-and-closures.png" alt="Branch operating hours and closure date" width="100%"/></a><p>A branch is created, Monday is updated to 08:00–17:00, persisted hours are checked, and a closure record is created.</p><p><em>Viewport: 1280 × 720</em></p></td><td width="50%" valign="top"></td></tr></tbody></table>

### Extended finance, integrations and session security

<table><tbody>
<tr>
<td width="50%" valign="top"><h3>19. Invoice partial payment and reconciliation</h3><a href="visuals/19-invoice-partially-paid.png"><img src="visuals/19-invoice-partially-paid.png" alt="Invoice visible in the app during partial payment state" width="100%"/></a><p>A $100 invoice is issued and a $30 payment leaves a persisted partial balance. The same idempotency key replays the original payment; changed-content reuse and overpayment are rejected. The full API sequence then settles, refunds and credits the invoice.</p><p><em>Viewport: 1280 × 720</em></p></td>
<td width="50%" valign="top"><h3>20. Integrations / webhook administration</h3><a href="visuals/20-integrations-webhooks.png"><img src="visuals/20-integrations-webhooks.png" alt="Integrations page after webhook endpoint verification" width="100%"/></a><p>The actual integrations screen shows the newly created HTTPS endpoint as Active after API-driven secret rotation. Assertions also verify HTTP URLs are rejected, the plaintext secret is absent from list responses, tenant isolation returns 404, and deactivation succeeds after the screenshot. No external receiver is called.</p><p><em>Viewport: 1280 × 720</em></p></td>
</tr>
<tr>
<td width="50%" valign="top"><h3>21. Session cleared after logout</h3><a href="visuals/21-session-after-logout.png"><img src="visuals/21-session-after-logout.png" alt="Login screen after the browser session is revoked" width="100%"/></a><p>The cookie-authenticated refresh flow succeeds before logout. Logout returns 204, the authenticated identity endpoint then returns 401, and reopening the protected dashboard routes back to login. Password-recovery responses for known and unknown addresses are also checked for indistinguishable public messages.</p><p><em>Viewport: 1280 × 720</em></p></td>
<td width="50%" valign="top"></td>
</tr>
</tbody></table>

### Recovery screens and invalid-link handling

<table><tbody>
<tr>
<td width="50%" valign="top"><h3>22. Password-reset request</h3><a href="visuals/22-password-reset-request.png"><img src="visuals/22-password-reset-request.png" alt="Password reset request page showing a generic confirmation" width="100%"/></a><p>The real form accepts a synthetic email and displays the same generic response used for an unknown email; the API assertions compare both messages to guard against account enumeration.</p><p><em>Viewport: 1280 × 720</em></p></td>
<td width="50%" valign="top"><h3>23. Invalid password-reset link</h3><a href="visuals/23-password-reset-invalid-token.png"><img src="visuals/23-password-reset-invalid-token.png" alt="Password reset page displaying an invalid-token error" width="100%"/></a><p>A deliberately invalid one-time token produces a readable error, and the fragment token is removed from the address bar before form submission.</p><p><em>Viewport: 1280 × 720</em></p></td>
</tr>
<tr>
<td width="50%" valign="top"><h3>24. Invalid email-verification link</h3><a href="visuals/24-email-verification-invalid-token.png"><img src="visuals/24-email-verification-invalid-token.png" alt="Email verification page displaying an invalid-token error" width="100%"/></a><p>An invalid verification token is rejected without activating the account; the UI clears the hash fragment and shows the backend's safe error message. Valid token/password setup is separately covered by backend tests, not by a real inbox.</p><p><em>Viewport: 1280 × 720</em></p></td>
<td width="50%" valign="top"></td>
</tr>
</tbody></table>

## Feature coverage inventory

| Feature area | Coverage status | What was actually verified |
|---|---|---|
| Registration / sessions / recovery | **Partial pass — extended** | UI registration, session identity/refresh, logout/revocation, protected-route redirect, password reset request UI, invalid reset-token UI, invalid email-verification UI, anti-enumeration and removal of one-time token fragments from the address bar. Valid token/password flows are covered by the backend suite; actual email inbox delivery is not tested. |
| Customers / contacts / locations | **Partial pass** | Customer, billing-contact, location creation and CSV import/recovery. Edit/deactivate/search/pagination, attachments and all validations are not tested. |
| Agreements | **Partial pass** | Draft → proposed → effective-today active → suspend/resume; modal defect reproduced/fixed. Cancel, renewals, expiry, future-start acceptance and all invalid transitions are not tested. |
| Invoices / payments | **Partial pass — extended** | Draft/issue/full payment in the UI journey; extended browser-origin API flow covers partial payment, replayed idempotency key, changed-payload conflict, overpayment rejection, full settlement, refund, credit, void transition and PDF response. Tax/discount combinations, provider payment gateways and all race conditions are not all exercised. |
| Equipment / service catalogue | **Partial pass** | One equipment record and one service item created and persisted. Update, deactivate/decommission, delete and filter paths are not tested. |
| Work orders / technician access | **Partial pass** | Create → assign → start → complete using owner session and synthetic technician. Technician self-login, edit/cancel, appointment validation and checklist enforcement are not tested. |
| Maintenance plans | **Partial pass** | Plan created, order generated and repeated occurrence is idempotent. Schedule editing/deactivation and due-date/checklist edge cases are not tested. |
| Branches | **Partial pass** | Branch creation, Monday hours and closure creation. Duplicate codes, invalid timezones, closure deletion and primary-branch changes are not tested. |
| Recurring invoices | **Partial pass** | Create, pause and resume. Background scheduler and automatic invoice creation are not tested. |
| Reports / CSV | **Partial pass** | Four CSV exports and their contents; import duplicate recovery. All filters, pagination boundaries and formula-injection cases are not tested. |
| Email / SMS | **Partial pass** | Email outbox queue persistence and provider-disabled SMS error; backend suite checks queue/business rules. Live SMTP inbox delivery and provider-enabled SMS are not tested. |
| Webhooks / attachments | **Partial pass — extended** | Browser-origin API flow verifies attachment upload/list/update/download checksum/delete and tenant isolation; webhook HTTPS-only validation, CRUD, secret redaction/rotation, tenant isolation and deactivation. Backend tests cover webhook signature/retry worker behavior. A live external webhook receiver and production object storage are not exercised. |
| Authorization / security | **Partial pass** | Cross-tenant customer lookup returns 404; untrusted Origin returns 403. Full RBAC matrix, rate limits and all tenant-scoped endpoints are not tested. |
| Hosted production | **Not tested** | The suite used a local production build, local API and disposable PostgreSQL, not the hosted domain. |

## Explicit scope boundaries

- This is broad cross-layer coverage, **not an exhaustive test of every LedgerPulse feature**. Untested items above must not be read as passed.
- Live Vercel-to-backend connectivity, production HTTPS cookies, proxy/CORS behavior and production configuration remain unverified.
- Email is queued but not delivered; SMS takes the provider-disabled path. No live payment, refund, carrier, email, SMS or webhook provider was exercised.
- All test records use a disposable database and synthetic data; no production customer data was used.

---

**Evidence policy:** images are captured after successful checkpoint assertions. The before-fix screenshot is retained only to document the reproduced agreement-modal defect. Playwright traces and service logs remain in CI artifacts, not in this visual gallery.
