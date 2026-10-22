# Service Agreement Manager — End-to-End Visual Walkthrough

> A recruiter-friendly walkthrough of Service Agreement Manager, showing successful product states across core customer, contract, billing and field-service workflows.

**Tested source commit:** [`ed8cf14918e96c4138ab3f2b82dc89e1d2a20be0`](https://github.com/faizansaiyed123/service-agreement-manager-frontend/commit/ed8cf14918e96c4138ab3f2b82dc89e1d2a20be0)  
**CI workflow:** [Run #39760398718](https://github.com/faizansaiyed123/service-agreement-manager-frontend/actions/runs/39760398718)  
**Browser:** Chromium controlled by Playwright  
**Application build:** Vite production build served locally against the FastAPI backend on `main`  
**Database:** Disposable PostgreSQL 16  
**Viewport:** 1280 × 720 for most screenshots; homepage is captured full-page; reports is taller than the viewport.

## How to read this walkthrough

This report follows Sayphora's screenshot layout: journeys are ordered, images are displayed in aligned two-column HTML tables, and each screenshot has a caption describing the action and assertion. Only clean, successful product states are shown in this gallery. Negative assertions may run in CI, but error screens are never published as portfolio screenshots.

**Latest automated result:** 4 Playwright tests passed, 0 failed, 0 skipped. There are 25 successful screenshot checkpoints. These checks provide broad integration evidence, **not a claim that every Service Agreement Manager feature or every edge case has been tested**.

**Backend verification:** 73 passed, 0 failures/errors, 2 skipped in the full backend suite; PostgreSQL concurrency checks: 2 passed, 0 failures/errors, 0 skipped. Ruff and Alembic schema-consistency checks also run.

## Verified user journeys

### Application entry and customer setup

<table><tbody>
<tr><td width="50%" valign="top"><h3>01. Public homepage</h3><a href="visuals/01-public-homepage.png"><img src="visuals/01-public-homepage.png" alt="Public homepage" width="100%"/></a><p>The production-built frontend loads from the local preview server. This is a UI smoke checkpoint, not a test of every landing-page link.</p><p><em>Viewport: full page, 1280 px wide</em></p></td></tr>
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
<tr><td width="50%" valign="top"><h3>11. Work order completed</h3><a href="visuals/11-work-order-completed.png"><img src="visuals/11-work-order-completed.png" alt="Completed work order" width="100%"/></a><p>The browser creates a technician, then creates, assigns, starts and completes a work order. API status transitions are asserted.</p><p><em>Viewport: 1280 × 720</em></p></td><td width="50%" valign="top"><h3>12. Recurring billing active</h3><a href="visuals/12-recurring-billing-active.png"><img src="visuals/12-recurring-billing-active.png" alt="Active recurring invoice schedule" width="100%"/></a><p>A recurring billing schedule is created, paused and resumed in the browser. The backend integration suite separately runs the recurring-invoice worker routine against a test session and asserts invoice creation/schedule advancement; the deployed scheduler cadence is not exercised.</p><p><em>Viewport: 1280 × 720</em></p></td></tr>
<tr><td width="50%" valign="top"><h3>18. Maintenance plan generation</h3><a href="visuals/18-maintenance-plan-generation.png"><img src="visuals/18-maintenance-plan-generation.png" alt="Maintenance plan after idempotent order generation" width="100%"/></a><p>A plan with a checklist is created. Generating the same occurrence twice returns the same work-order ID, and the duplicate returns HTTP 200.</p><p><em>Viewport: 1280 × 720</em></p></td></tr>
</tbody></table>

### CSV reporting and import recovery

<table><tbody><tr><td width="50%" valign="top"><h3>13. Reports and CSV exports</h3><a href="visuals/13-reports-and-csv-exports.png"><img src="visuals/13-reports-and-csv-exports.png" alt="Reports and exported CSV records" width="100%"/></a><p>Four CSV exports download with expected filenames and contain test records created in the same journey.</p><p><em>Viewport: 1280 × 886</em></p></td><td width="50%" valign="top"><h3>14. Customer import recovery</h3><a href="visuals/14-customer-import-recovery.png"><img src="visuals/14-customer-import-recovery.png" alt="Customer CSV import recovery" width="100%"/></a><p>Preview flags a duplicate, valid rows import, the failed row is corrected and retried, and the job ends with 3 imported and 0 failed.</p><p><em>Viewport: 1280 × 720</em></p></td></tr></tbody></table>

### Notifications and provider configuration

<table><tbody><tr><td width="50%" valign="top"><h3>15. Email queued</h3><a href="visuals/15-email-queued.png"><img src="visuals/15-email-queued.png" alt="Email notification queued" width="100%"/></a><p>The email request persists with queued status. No sender worker is started and no email is delivered.</p><p><em>Viewport: 1280 × 720</em></p></td></tr></tbody></table>

### Branch administration

<table><tbody><tr><td width="50%" valign="top"><h3>17. Branch hours and closures</h3><a href="visuals/17-branch-hours-and-closures.png"><img src="visuals/17-branch-hours-and-closures.png" alt="Branch operating hours and closure date" width="100%"/></a><p>A branch is created, Monday is updated to 08:00–17:00, persisted hours are checked, and a closure record is created.</p><p><em>Viewport: 1280 × 720</em></p></td></tr></tbody></table>

### Extended finance, integrations and session security

<table><tbody>
<tr>
<td width="50%" valign="top"><h3>19. Invoice partial payment and reconciliation</h3><a href="visuals/19-invoice-partially-paid.png"><img src="visuals/19-invoice-partially-paid.png" alt="Invoice visible in the app during partial payment state" width="100%"/></a><p>A $100 invoice is issued and a $30 payment leaves a persisted partial balance. The same idempotency key replays the original payment; changed-content reuse and overpayment are rejected. The full API sequence then settles, refunds and credits the invoice.</p><p><em>Viewport: 1280 × 720</em></p></td>
<td width="50%" valign="top"><h3>20. Integrations / webhook administration</h3><a href="visuals/20-integrations-webhooks.png"><img src="visuals/20-integrations-webhooks.png" alt="Integrations page after webhook endpoint verification" width="100%"/></a><p>The actual integrations screen shows the newly created HTTPS endpoint as Active after API-driven secret rotation. Assertions also verify HTTP URLs are rejected, the plaintext secret is absent from list responses, tenant isolation returns 404, and deactivation succeeds after the screenshot. No external receiver is called.</p><p><em>Viewport: 1280 × 720</em></p></td>
</tr>
<tr>
<td width="50%" valign="top"><h3>21. Session cleared after logout</h3><a href="visuals/21-session-after-logout.png"><img src="visuals/21-session-after-logout.png" alt="Login screen after the browser session is revoked" width="100%"/></a><p>The cookie-authenticated refresh flow succeeds before logout. Logout returns 204, the authenticated identity endpoint then returns 401, and reopening the protected dashboard routes back to login. Password-recovery responses for known and unknown addresses are also checked for indistinguishable public messages.</p><p><em>Viewport: 1280 × 720</em></p></td>

</tr>
</tbody></table>

### Invoice payment, refund and credit — UI trail

<table><tbody>
<tr>
<td width="50%" valign="top"><h3>25. Payment, refund and credit history</h3><a href="visuals/25-invoice-adjustments-ui.png"><img src="visuals/25-invoice-adjustments-ui.png" alt="Invoice detail dialog showing payment, refund and credit history after UI actions" width="100%"/></a><p>The remaining payment is submitted through the invoice dialog, followed by a partial refund and a credit through their actual UI forms. API assertions then verify refund/credit idempotency, reject over-refund and excess-credit requests, and confirm a zero balance. The screenshot captures the resulting payment/refund/credit history.</p><p><em>Viewport: 1280 × 720</em></p></td>

</tr>
</tbody></table>

### Account recovery

<table><tbody>
<tr>
<td width="50%" valign="top"><h3>22. Password-reset request</h3><a href="visuals/22-password-reset-request.png"><img src="visuals/22-password-reset-request.png" alt="Password reset request page showing a generic confirmation" width="100%"/></a><p>The real form accepts a synthetic email and displays the same generic response used for an unknown email; the API assertions compare both messages to guard against account enumeration.</p><p><em>Viewport: 1280 × 720</em></p></td>

</tr>

</tbody></table>

## Feature coverage inventory

| Feature area | Coverage status | What was actually verified |
|---|---|---|
| Registration / sessions / recovery | **Partial pass — extended** | UI registration, session identity/refresh, logout/revocation, protected-route redirect, password reset request UI, anti-enumeration and removal of one-time token fragments from the address bar. Valid token/password flows are covered by the backend suite; actual email inbox delivery is not tested. |
| Customers / contacts / locations | **Partial pass** | Customer, billing-contact, location creation and CSV import/recovery. Edit/deactivate/search/pagination, attachments and all validations are not tested. |
| Agreements | **Partial pass** | Draft → proposed → effective-today active → suspend/resume; modal defect reproduced/fixed. Cancel, renewals, expiry, future-start acceptance and all invalid transitions are not tested. |
| Invoices / payments | **Partial pass — extended** | Draft/issue/full payment in the original UI journey; extended UI journey records a partial then final payment, performs a partial refund and applies a credit through the invoice dialogs, and inspects the payment/refund/credit activity UI. API assertions cover idempotency replay/conflict, overpayment/refund/credit cap rejection, void transition and PDF response. Tax/discount combinations, provider payment gateways and all race conditions are not all exercised. |
| Equipment / service catalogue | **Partial pass** | One equipment record and one service item created and persisted. Update, deactivate/decommission, delete and filter paths are not tested. |
| Work orders / technician access | **Partial pass** | Create → assign → start → complete using owner session and synthetic technician. Technician self-login, edit/cancel, appointment validation and checklist enforcement are not tested. |
| Maintenance plans | **Partial pass** | Plan created, order generated and repeated occurrence is idempotent. Schedule editing/deactivation and due-date/checklist edge cases are not tested. |
| Branches | **Partial pass** | Branch creation, Monday hours and closure creation. Duplicate codes, invalid timezones, closure deletion and primary-branch changes are not tested. |
| Recurring invoices | **Partial pass — UI + backend worker** | The browser creates, pauses and resumes a schedule. Backend integration tests execute the recurring-invoice worker routine and verify invoice creation plus next-date advancement. The live deployed scheduler cadence/worker service is not tested. |
| Reports / CSV | **Partial pass** | Four CSV exports and their contents; import duplicate recovery. All filters, pagination boundaries and formula-injection cases are not tested. |
| Email / SMS | **Partial pass** | Email outbox queue persistence and SMS composer preparation; backend suite checks queue/business rules. Live SMTP inbox delivery and provider-enabled SMS are not tested. |
| Webhooks / attachments | **Partial pass — extended** | Browser-origin API flow verifies attachment upload/list/update/download checksum/delete and tenant isolation; webhook HTTPS-only validation, CRUD, secret redaction/rotation, tenant isolation and deactivation. Backend tests cover webhook signature/retry worker behavior. A live external webhook receiver and production object storage are not exercised. |
| Authorization / security | **Partial pass** | Cross-tenant customer lookup returns 404; untrusted Origin returns 403. Full RBAC matrix, rate limits and all tenant-scoped endpoints are not tested. |
| Hosted production | **Not tested** | The suite used a local production build, local API and disposable PostgreSQL, not the hosted domain. |

## Explicit scope boundaries

- This is broad cross-layer coverage, not a claim that every feature, role, validation branch or production scenario has been exhaustively tested.
- Live Vercel-to-backend connectivity, production HTTPS cookies, proxy/CORS behavior and production configuration remain unverified.
- Email is queued but not delivered; SMS takes the provider-disabled path. No live payment, refund, carrier, email, SMS or webhook provider was exercised.
- All test records use a disposable database and synthetic data; no production customer data was used.

---

**Evidence policy:** images are captured after successful checkpoint assertions. Failed and historical defect screenshots are excluded from the recruiter-facing gallery. Playwright traces and service logs remain in CI artifacts, not in this visual gallery.
