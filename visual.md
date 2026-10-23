# Service Agreement Manager — Product Walkthrough

Service Agreement Manager brings the day-to-day work of a service business into one connected workspace: customers and service locations, service agreements, equipment, field work, recurring maintenance, invoices, payment adjustments, reporting and integrations.

The guide follows a practical customer journey—from discovering the product and creating a workspace through managing service delivery and collecting payment. Each image is a genuine screenshot of the running application, captured only after its corresponding browser interaction completed successfully.

## 1. Start here: the workspace

<table><tbody>
<tr>
<td width="50%" valign="top"><h3>Discover the product</h3><a href="docs/testing/visuals/01-public-homepage.png"><img src="docs/testing/visuals/01-public-homepage.png" alt="Service Agreement Manager public homepage" width="100%"/></a><p>The public landing page introduces the product and the connected workflow it provides to service businesses.</p></td>
<td width="50%" valign="top"><h3>Sign in</h3><a href="docs/testing/visuals/26-sign-in-screen.png"><img src="docs/testing/visuals/26-sign-in-screen.png" alt="Sign-in screen for the Service Agreement Manager workspace" width="100%"/></a><p>Existing team members enter through the dedicated sign-in page to return to their workspace.</p></td>
</tr>
<tr>
<td width="50%" valign="top"><h3>Create a company workspace</h3><a href="docs/testing/visuals/27-create-workspace-form.png"><img src="docs/testing/visuals/27-create-workspace-form.png" alt="New company workspace registration form" width="100%"/></a><p>The workspace owner provides company, contact and account details before continuing into the application.</p></td>
<td width="50%" valign="top"><h3>Workspace overview</h3><a href="docs/testing/visuals/03-dashboard-after-registration.png"><img src="docs/testing/visuals/03-dashboard-after-registration.png" alt="Service Agreement Manager dashboard after registration" width="100%"/></a><p>The overview brings the user's operational workspace together after registration and sign-in.</p></td>
</tr>
</tbody></table>

## 2. Build the customer record

Customers are the foundation that connects service locations, equipment, agreements and billing. The application supports customer details, contacts, service addresses and bulk import workflows.

<table><tbody>
<tr>
<td width="50%" valign="top"><h3>Customer, contact and service location</h3><a href="docs/testing/visuals/04-customer-and-service-location.png"><img src="docs/testing/visuals/04-customer-and-service-location.png" alt="Customer record with billing contact and service location" width="100%"/></a><p>A customer record can be associated with its billing contact and the site where work is performed.</p></td>
<td width="50%" valign="top"><h3>Import customer records</h3><a href="docs/testing/visuals/14-customer-import-recovery.png"><img src="docs/testing/visuals/14-customer-import-recovery.png" alt="Customer CSV import with duplicate review and corrected row" width="100%"/></a><p>The import flow previews rows, identifies a duplicate and lets the user correct a failed row before completing the import.</p></td>
</tr>
</tbody></table>

## 3. Create and manage service agreements

Agreements define the service relationship with a customer. The workflow demonstrates a draft agreement moving through proposal and acceptance, then into an active state with lifecycle controls.

<table><tbody>
<tr>
<td width="50%" valign="top"><h3>Prepare an agreement</h3><a href="docs/testing/visuals/05-agreement-draft.png"><img src="docs/testing/visuals/05-agreement-draft.png" alt="Draft service agreement with customer and pricing" width="100%"/></a><p>Start with a draft, select the customer and prepare the commercial details before presenting the agreement.</p></td>
<td width="50%" valign="top"><h3>Active agreement</h3><a href="docs/testing/visuals/06-agreement-active.png"><img src="docs/testing/visuals/06-agreement-active.png" alt="Active service agreement after acceptance" width="100%"/></a><p>The accepted agreement reaches its active state; the workspace also supports suspension and resumption of the agreement lifecycle.</p></td>
</tr>
</tbody></table>

## 4. Coordinate service delivery

The same workspace keeps assets, the service catalogue, technician work and maintenance planning connected to the customer relationship.

<table><tbody>
<tr>
<td width="50%" valign="top"><h3>Equipment registry</h3><a href="docs/testing/visuals/09-equipment-created.png"><img src="docs/testing/visuals/09-equipment-created.png" alt="Equipment record associated with a customer and service location" width="100%"/></a><p>Register the equipment that technicians need to maintain at a customer's site.</p></td>
<td width="50%" valign="top"><h3>Service catalogue</h3><a href="docs/testing/visuals/10-service-catalog-created.png"><img src="docs/testing/visuals/10-service-catalog-created.png" alt="Service catalogue item with service code and price" width="100%"/></a><p>Reusable service items provide consistent descriptions and prices for agreements and operational work.</p></td>
</tr>
<tr>
<td width="50%" valign="top"><h3>Work order lifecycle</h3><a href="docs/testing/visuals/11-work-order-completed.png"><img src="docs/testing/visuals/11-work-order-completed.png" alt="Completed work order with technician assignment and status" width="100%"/></a><p>A work order can be created, assigned, started and completed so the operational status follows the real workflow.</p></td>
<td width="50%" valign="top"><h3>Maintenance plan generation</h3><a href="docs/testing/visuals/18-maintenance-plan-generation.png"><img src="docs/testing/visuals/18-maintenance-plan-generation.png" alt="Maintenance plan and generated work order" width="100%"/></a><p>Maintenance plans turn planned occurrences into work orders; repeating the same occurrence does not create a duplicate order.</p></td>
</tr>
<tr>
<td width="50%" valign="top"><h3>Branch hours and closures</h3><a href="docs/testing/visuals/17-branch-hours-and-closures.png"><img src="docs/testing/visuals/17-branch-hours-and-closures.png" alt="Branch operating hours and closure configuration" width="100%"/></a><p>Branch schedules and dated closures help represent when a service location is available.</p></td>
<td width="50%" valign="top"><h3>Recurring maintenance billing</h3><a href="docs/testing/visuals/12-recurring-billing-active.png"><img src="docs/testing/visuals/12-recurring-billing-active.png" alt="Active recurring invoice schedule" width="100%"/></a><p>Recurring invoice schedules can be created, paused and resumed as billing needs change.</p></td>
</tr>
</tbody></table>

## 5. Manage invoices and money movement

Invoices start as drafts, can be issued and paid, and retain their balance and adjustment history. These screens demonstrate both the straightforward payment path and a more detailed adjustment journey.

<table><tbody>
<tr>
<td width="50%" valign="top"><h3>Prepare an invoice</h3><a href="docs/testing/visuals/07-invoice-draft.png"><img src="docs/testing/visuals/07-invoice-draft.png" alt="Draft invoice associated with a customer" width="100%"/></a><p>Review the customer, invoice total and draft state before issuing a bill.</p></td>
<td width="50%" valign="top"><h3>Record a fully paid invoice</h3><a href="docs/testing/visuals/08-invoice-paid.png"><img src="docs/testing/visuals/08-invoice-paid.png" alt="Invoice displayed in a fully paid state" width="100%"/></a><p>After issuing and receiving payment, the invoice shows a paid state and no remaining balance.</p></td>
</tr>
<tr>
<td width="50%" valign="top"><h3>Partial payment and balance</h3><a href="docs/testing/visuals/19-invoice-partially-paid.png"><img src="docs/testing/visuals/19-invoice-partially-paid.png" alt="Invoice in partial-payment state with remaining balance" width="100%"/></a><p>Partial receipts leave a visible outstanding balance and preserve the payment history.</p></td>
<td width="50%" valign="top"><h3>Payments, refunds and credits</h3><a href="docs/testing/visuals/25-invoice-adjustments-ui.png"><img src="docs/testing/visuals/25-invoice-adjustments-ui.png" alt="Invoice details showing payment, refund and credit history" width="100%"/></a><p>The invoice detail workflow records additional payments, refunds and credits, keeping the resulting financial history in one place.</p></td>
</tr>
</tbody></table>

## 6. Review business activity and export data

Reports help the business review operational activity and take structured data into other tools.

<table><tbody><tr><td width="100%" align="center" valign="top"><a href="docs/testing/visuals/13-reports-and-csv-exports.png"><img src="docs/testing/visuals/13-reports-and-csv-exports.png" alt="Reports page and downloaded CSV exports" width="85%"/></a><p>Operational and finance reports provide downloadable CSV exports for further analysis and record keeping.</p></td></tr></tbody></table>

## 7. Notifications and integrations

The application includes durable notification queues and webhook endpoint management. The screenshots distinguish between application-side workflow and external provider delivery.

<table><tbody>
<tr>
<td width="50%" valign="top"><h3>Email notification queue</h3><a href="docs/testing/visuals/15-email-queued.png"><img src="docs/testing/visuals/15-email-queued.png" alt="Email notification in queued state" width="100%"/></a><p>The application persists an email request in its outbox. Actual delivery requires a configured sender and worker.</p></td>
<td width="50%" valign="top"><h3>SMS provider configuration</h3><a href="docs/testing/visuals/16-sms-provider-disabled.png"><img src="docs/testing/visuals/16-sms-provider-disabled.png" alt="Clear SMS provider disabled message" width="100%"/></a><p>When an SMS provider is not configured, the application surfaces the limitation rather than implying a message was sent.</p></td>
</tr>
<tr>
<td width="50%" valign="top"><h3>Webhook integration management</h3><a href="docs/testing/visuals/20-integrations-webhooks.png"><img src="docs/testing/visuals/20-integrations-webhooks.png" alt="Integrations screen showing an active webhook endpoint" width="100%"/></a><p>Webhook endpoints can be managed within the workspace, with checks for HTTPS URLs, secret handling and tenant isolation.</p></td>
<td width="50%" valign="top"></td>
</tr>
</tbody></table>

## 8. Account security and recovery

The account journey includes readable authentication feedback, password recovery and invalid-link handling. One-time tokens are removed from the browser address bar so they are not left visible in the page URL.

<table><tbody>
<tr>
<td width="50%" valign="top"><h3>Invalid sign-in feedback</h3><a href="docs/testing/visuals/02-login-invalid-credentials.png"><img src="docs/testing/visuals/02-login-invalid-credentials.png" alt="Sign-in form displaying clear feedback for incorrect credentials" width="100%"/></a><p>Incorrect credentials produce an explicit, user-readable message without leaving the form in a stuck state.</p></td>
<td width="50%" valign="top"><h3>Request password recovery</h3><a href="docs/testing/visuals/22-password-reset-request.png"><img src="docs/testing/visuals/22-password-reset-request.png" alt="Password recovery form with a generic confirmation message" width="100%"/></a><p>The same generic confirmation avoids disclosing whether an email address belongs to an account.</p></td>
</tr>
<tr>
<td width="50%" valign="top"><h3>Invalid password reset link</h3><a href="docs/testing/visuals/23-password-reset-invalid-token.png"><img src="docs/testing/visuals/23-password-reset-invalid-token.png" alt="Password reset screen with an invalid or expired link message" width="100%"/></a><p>An invalid or expired link is rejected with a clear message, while the single-use token is scrubbed from the address bar.</p></td>
<td width="50%" valign="top"><h3>Invalid email verification link</h3><a href="docs/testing/visuals/24-email-verification-invalid-token.png"><img src="docs/testing/visuals/24-email-verification-invalid-token.png" alt="Email verification screen explaining that the link is invalid or expired" width="100%"/></a><p>Expired or invalid verification links are handled safely without silently activating the account.</p></td>
</tr>
<tr>
<td width="50%" valign="top"><h3>Session after logout</h3><a href="docs/testing/visuals/21-session-after-logout.png"><img src="docs/testing/visuals/21-session-after-logout.png" alt="Login screen after logout revokes the browser session" width="100%"/></a><p>After logout, the revoked session no longer grants access to protected workspace pages.</p></td>
<td width="50%" valign="top"></td>
</tr>
</tbody></table>

## How the application fits together

- **Customer relationship management:** customer profiles, billing contacts, service locations and imports.
- **Agreement lifecycle:** pricing, proposals, acceptance, active status, lifecycle actions and renewals.
- **Service operations:** equipment, reusable catalogue items, work orders, maintenance schedules and branches.
- **Billing:** invoices, balances, payments, refunds, credits, PDFs and recurring invoices.
- **Visibility and integrations:** reports, CSV exports, queued notifications, SMS configuration and webhooks.
- **Security:** authenticated workspace access, session revocation, recovery links and tenant-scoped data.

The frontend uses React and Vite; the backend exposes the business API through FastAPI, with PostgreSQL persistence and database migrations. The frontend repository and backend repository each contain their own setup and deployment guidance.

## Evidence and practical limits

All images in this walkthrough are captured from the running application after the corresponding browser action succeeds. The walkthrough run uses a production-built frontend preview, the backend repository's `main` branch and an isolated PostgreSQL database with synthetic data. It demonstrates the connected application flows in this repository; it does **not** by itself prove that a hosted production deployment is reachable, that SMTP/SMS or external webhook recipients are configured, or that every possible role and edge case is covered.

**Source commit:** [`10a53ed34d97275a05c3de8f6c6267254506442e`](https://github.com/faizansaiyed123/service-agreement-manager-frontend/commit/10a53ed34d97275a05c3de8f6c6267254506442e) · **Successful walkthrough run:** [Run #39945081941](https://github.com/faizansaiyed123/service-agreement-manager-frontend/actions/runs/39945081941)

For setup details, architecture, API modules and deployment instructions, see the [frontend README](https://github.com/faizansaiyed123/service-agreement-manager-frontend/blob/main/README.md) and [backend README](https://github.com/faizansaiyed123/service-agreement-manager-backend/blob/main/README.md).
