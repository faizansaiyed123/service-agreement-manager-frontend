const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8000';

async function chooseOption(page, control, value) {
  await control.click();
  const escaped = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const option = page.locator('.select-menu .select-option[data-value="' + escaped + '"]');
  await expect(option).toBeVisible();
  await option.click();
}

async function capture(page, name) {
  const target = path.join(process.cwd(), 'test-results', 'screenshots', name);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: true, animations: 'disabled' });
}

function readNotificationBody(recipientEmail, eventType) {
  const script = String.raw`import os, sys
from sqlalchemy import create_engine, text
url = os.environ["DATABASE_URL"]
engine = create_engine(url)
with engine.connect() as connection:
    body = connection.execute(text("""
        SELECT body FROM notification_outbox
        WHERE recipient_email = :recipient_email AND event_type = :event_type
        ORDER BY created_at DESC, id DESC LIMIT 1
    """), {"recipient_email": sys.argv[1], "event_type": sys.argv[2]}).scalar()
print(body or "")
`;
  return execFileSync('python', ['-c', script, recipientEmail, eventType], {
    encoding: 'utf8',
    env: process.env,
  }).trim();
}

async function readApiFromBrowser(page, route) {
  return page.evaluate(async (args) => {
    const response = await fetch(args.api + '/api/v1' + args.route, { credentials: 'include' });
    let body;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { status: response.status, body };
  }, { api: API, route });
}

test('Service Agreement Manager customer-to-cash journey persists customer, agreement and invoice lifecycle data', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const unique = String(Date.now());
  const email = 'sam-e2e-' + unique + '@example.com';
  const customerName = 'E2E HVAC Customer ' + unique;
  const locationName = 'Primary Service Site ' + unique;
  const agreementTitle = 'Annual HVAC Service ' + unique;

  // Public entry point.
  await page.goto('/');
  await expect(page.locator('h1').first()).toBeVisible();
  await capture(page, '01-public-homepage.png');

  // Incorrect credentials should produce a readable error rather than a blank or stuck form.
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('demo@example.com');
  await capture(page, '26-sign-in-screen.png');
  await page.getByLabel('Email', { exact: true }).fill('not-registered-' + unique + '@example.com');
  await page.locator('input[autocomplete="current-password"]').fill('Incorrect-Password-2026');
  const badLoginPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/auth/login' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const badLogin = await badLoginPromise;
  expect(badLogin.status()).toBe(401);
  await expect(page.getByRole('alert')).toContainText(/Email or password is incorrect/i);
  await capture(page, '02-login-invalid-credentials.png');

  // Create a disposable test owner. The CI API runs in development mode so verification mail is not required.
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Create your company' })).toBeVisible();
  await capture(page, '27-create-workspace-form.png');
  await page.getByLabel('Company name', { exact: true }).fill('Northstar Mechanical Services ' + unique);
  await page.getByLabel('Your name', { exact: true }).fill('Morgan Ellis');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.locator('input[autocomplete="new-password"]').fill('Northstar-Test-Pass!2026');
  const registerPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/auth/register' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  const registration = await registerPromise;
  expect(registration.status()).toBe(201);
  const registrationBody = await registration.json();
  expect(registrationBody.authenticated).toBe(true);
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.locator('h1').first()).toBeVisible();
  await capture(page, '03-dashboard-after-registration.png');

  // Create a customer and a service location through the frontend API client.
  await page.goto('/customers');
  await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
  await page.getByRole('button', { name: 'Add customer', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill(customerName);
  await page.getByLabel('Email', { exact: true }).fill('customer-' + unique + '@example.com');
  await page.getByLabel('Notes', { exact: true }).fill('Synthetic record created by automated end-to-end testing.');
  const customerPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/customers' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create customer', exact: true }).click();
  const customerResponse = await customerPromise;
  expect(customerResponse.status()).toBe(201);
  const customer = await customerResponse.json();
  expect(customer.name).toBe(customerName);
  expect(customer.status).toBe('active');
  await expect(page.getByRole('dialog').last()).toContainText(customerName);

  await page.getByRole('button', { name: /Contacts/ }).click();
  await page.getByRole('button', { name: 'Add contact', exact: true }).click();
  const contactName = 'E2E Billing Contact ' + unique;
  await page.getByRole('dialog').last().getByLabel('Full name', { exact: true }).fill(contactName);
  await page.getByRole('dialog').last().getByLabel('Email', { exact: true }).fill('billing-' + unique + '@example.com');
  await page.getByRole('dialog').last().getByLabel('Phone', { exact: true }).fill('5550101');
  await page.getByRole('dialog').last().getByLabel('Billing contact', { exact: true }).check();
  const contactPromise = page.waitForResponse(response => response.url() === API + '/api/v1/customers/' + customer.id + '/contacts' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Add contact', exact: true }).last().click();
  const contactResponse = await contactPromise;
  expect(contactResponse.status()).toBe(201);
  expect((await contactResponse.json()).full_name).toBe(contactName);
  await expect(page.getByRole('dialog').last()).toContainText(contactName);

  await page.getByRole('button', { name: /Locations/ }).click();
  await page.getByRole('button', { name: 'Add location', exact: true }).click();
  await page.getByLabel('Location name', { exact: true }).fill(locationName);
  await page.getByLabel('Address line 1', { exact: true }).fill('123 E2E Test Avenue');
  await page.getByLabel('City', { exact: true }).fill('Tampa');
  await page.getByLabel('Region/state', { exact: true }).fill('FL');
  await page.getByLabel('Postal code', { exact: true }).fill('33602');
  await page.getByLabel('Country code', { exact: true }).fill('US');
  const locationPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/customers/' + customer.id + '/service-locations' &&
    response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create location', exact: true }).click();
  const locationResponse = await locationPromise;
  expect(locationResponse.status()).toBe(201);
  const location = await locationResponse.json();
  expect(location.customer_id).toBe(customer.id);
  expect(location.name).toBe(locationName);
  await expect(page.getByRole('dialog').last()).toContainText(locationName);
  await capture(page, '04-customer-and-service-location.png');

  // Create an agreement and complete draft -> proposed -> accepted -> active.
  await page.goto('/agreements');
  await expect(page.getByRole('heading', { name: 'Agreements' })).toBeVisible();
  await page.getByRole('button', { name: 'New agreement', exact: true }).click();
  await chooseOption(page, page.getByLabel('Customer', { exact: true }), customer.id);
  await expect(page.getByLabel('Service location', { exact: true })).toHaveAttribute('data-value', location.id);
  await chooseOption(page, page.getByLabel('Service location', { exact: true }), location.id);
  await page.getByLabel('Agreement title', { exact: true }).fill(agreementTitle);
  await page.getByLabel('Service name', { exact: true }).fill('Preventive HVAC maintenance');
  await page.getByLabel('Unit price', { exact: true }).fill('120.00');
  await page.getByLabel('Terms', { exact: true }).fill('Synthetic end-to-end test agreement; no real service is scheduled.');
  const agreementPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/agreements' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create draft agreement', exact: true }).click();
  const agreementResponse = await agreementPromise;
  expect(agreementResponse.status()).toBe(201);
  const agreement = await agreementResponse.json();
  expect(agreement.customer_id).toBe(customer.id);
  expect(Number(agreement.total_amount)).toBe(120);
  expect(agreement.status).toBe('draft');
  await capture(page, '05-agreement-draft.png');

  const proposePromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/agreements/' + agreement.id + '/propose' &&
    response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Propose', exact: true }).click();
  const proposedResponse = await proposePromise;
  expect(proposedResponse.status()).toBe(200);
  expect((await proposedResponse.json()).status).toBe('proposed');

  await page.getByRole('button', { name: 'Record manual acceptance', exact: true }).click();
  await page.getByLabel('Accepted by', { exact: true }).fill('Morgan Ellis');
  const acceptPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/agreements/' + agreement.id + '/accept' &&
    response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save manual acceptance', exact: true }).click();
  const acceptedResponse = await acceptPromise;
  expect(acceptedResponse.status()).toBe(200);
  expect((await acceptedResponse.json()).status).toBe('active');
  await expect(page.getByLabel('Accepted by', { exact: true })).toHaveCount(0);

  // Agreements effective today activate when accepted; verify subsequent suspend/resume transitions.
  const suspendPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/agreements/' + agreement.id + '/suspend' &&
    response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Suspend', exact: true }).click();
  await page.getByLabel('Reason', { exact: true }).fill('Suspend and resume lifecycle verification');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const suspendedResponse = await suspendPromise;
  expect(suspendedResponse.status()).toBe(200);
  expect((await suspendedResponse.json()).status).toBe('suspended');

  const resumePromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/agreements/' + agreement.id + '/resume' &&
    response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  const activeResponse = await resumePromise;
  expect(activeResponse.status()).toBe(200);
  expect((await activeResponse.json()).status).toBe('active');
  const persistedAgreement = await readApiFromBrowser(page, '/agreements/' + agreement.id);
  expect(persistedAgreement.status).toBe(200);
  expect(persistedAgreement.body.status).toBe('active');
  expect(persistedAgreement.body.lines[0].name).toBe('Preventive HVAC maintenance');
  await capture(page, '06-agreement-active.png');

  // Create, issue and pay an invoice through the browser. Verify server-calculated totals and persisted balance.
  await page.goto('/invoices');
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
  await page.getByRole('button', { name: 'New invoice', exact: true }).click();
  await chooseOption(page, page.getByLabel('Customer', { exact: true }), customer.id);
  await chooseOption(page, page.getByLabel('Service location', { exact: true }), location.id);
  await page.getByLabel('Service code', { exact: true }).fill('E2E-HVAC');
  await page.getByLabel('Description', { exact: true }).fill('Preventive HVAC maintenance');
  await page.getByLabel('Unit price', { exact: true }).fill('120.00');
  const invoicePromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/invoices' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create draft invoice', exact: true }).click();
  const invoiceResponse = await invoicePromise;
  expect(invoiceResponse.status()).toBe(201);
  const invoice = await invoiceResponse.json();
  expect(invoice.customer_id).toBe(customer.id);
  expect(Number(invoice.total_amount)).toBe(120);
  expect(invoice.status).toBe('draft');
  await capture(page, '07-invoice-draft.png');

  const issuePromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/invoices/' + invoice.id + '/issue' &&
    response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Issue invoice', exact: true }).click();
  const issuedResponse = await issuePromise;
  expect(issuedResponse.status()).toBe(200);
  expect((await issuedResponse.json()).status).toBe('issued');

  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  await page.getByLabel('Amount', { exact: true }).fill('120.00');
  const paymentPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/invoices/' + invoice.id + '/payments' &&
    response.request().method() === 'POST');
  await page.getByRole('dialog').last().getByRole('button', { name: 'Record payment', exact: true }).click();
  const paymentResponse = await paymentPromise;
  expect([200, 201]).toContain(paymentResponse.status());
  expect(Number((await paymentResponse.json()).amount)).toBe(120);

  const persistedInvoice = await readApiFromBrowser(page, '/invoices/' + invoice.id);
  expect(persistedInvoice.status).toBe(200);
  expect(persistedInvoice.body.status).toBe('paid');
  expect(Number(persistedInvoice.body.balance_due)).toBe(0);
  await expect(page.getByRole('dialog').last().getByText('paid', { exact: true })).toBeVisible();
  await capture(page, '08-invoice-paid.png');

  // Equipment and catalog creation.
  await page.goto('/assets');
  await expect(page.getByRole('heading', { name: 'Equipment' })).toBeVisible();
  await page.getByRole('button', { name: 'Add equipment', exact: true }).click();
  await chooseOption(page, page.getByLabel('Customer', { exact: true }), customer.id);
  await chooseOption(page, page.getByLabel('Service location', { exact: true }), location.id);
  await page.getByLabel('Category', { exact: true }).fill('HVAC system');
  await page.getByLabel('Manufacturer', { exact: true }).fill('E2E Systems');
  await page.getByLabel('Model number', { exact: true }).fill('QA-120');
  await page.getByLabel('Serial number', { exact: true }).fill('SERIAL-' + unique);
  const equipmentPromise = page.waitForResponse(response => response.url() === API + '/api/v1/equipment' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create equipment', exact: true }).click();
  const equipmentResponse = await equipmentPromise;
  expect(equipmentResponse.status()).toBe(201);
  const equipment = await equipmentResponse.json();
  expect(equipment.customer_id).toBe(customer.id);
  expect(equipment.service_location_id).toBe(location.id);
  expect(equipment.serial_number).toBe('SERIAL-' + unique);
  await expect(page.getByText('SERIAL-' + unique)).toBeVisible();
  await capture(page, '09-equipment-created.png');

  await page.goto('/catalog');
  await expect(page.getByRole('heading', { name: 'Service catalog' })).toBeVisible();
  await page.getByRole('button', { name: 'Add service', exact: true }).click();
  await page.getByLabel('Service code', { exact: true }).fill('e2e-' + unique);
  await page.getByLabel('Category', { exact: true }).fill('Maintenance');
  await page.getByLabel('Name', { exact: true }).fill('QA HVAC inspection');
  await page.getByLabel('Description', { exact: true }).fill('Synthetic catalog item from end-to-end testing.');
  await page.getByLabel('Unit price', { exact: true }).fill('150.00');
  await page.getByLabel('Duration, minutes', { exact: true }).fill('60');
  const catalogPromise = page.waitForResponse(response => response.url() === API + '/api/v1/service-catalog' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create service', exact: true }).click();
  const catalogResponse = await catalogPromise;
  expect(catalogResponse.status()).toBe(201);
  const catalogItem = await catalogResponse.json();
  expect(catalogItem.service_code).toBe(('e2e-' + unique).toUpperCase());
  expect(Number(catalogItem.unit_price)).toBe(150);
  await expect(page.getByText(('e2e-' + unique).toUpperCase())).toBeVisible();
  await capture(page, '10-service-catalog-created.png');

  // Create an active branch first; technician invitations require at least one eligible branch.
  await page.goto('/operations');
  await expect(page.getByRole('heading', { name: 'Operations' })).toBeVisible();
  await page.getByRole('button', { name: 'Branches', exact: true }).click();
  await page.getByRole('button', { name: 'Add branch', exact: true }).click();
  const branchDialog = page.getByRole('dialog').last();
  const branchName = 'E2E Branch ' + unique;
  const branchCode = 'E2E-' + unique.slice(-8);
  await branchDialog.getByLabel('Name', { exact: true }).fill(branchName);
  await branchDialog.getByLabel('Code', { exact: true }).fill(branchCode);
  await branchDialog.getByLabel('Timezone', { exact: true }).fill('America/Chicago');
  await branchDialog.getByLabel('Country code', { exact: true }).fill('US');
  await branchDialog.getByLabel('City', { exact: true }).fill('Austin');
  const branchPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/branches' && response.request().method() === 'POST');
  await branchDialog.getByRole('button', { name: 'Create branch', exact: true }).click();
  const branchResponse = await branchPromise;
  expect(branchResponse.status()).toBe(201);
  expect((await branchResponse.json()).is_active).toBe(true);

  // Invite a technician through the new one-time activation flow.
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Team', exact: true }).click();
  await page.getByRole('button', { name: 'Invite technician', exact: true }).click();
  const technicianEmail = 'sam-tech-' + unique + '@example.com';
  const technicianPassword = 'Northstar-Team-Member!2026';
  await page.getByLabel('Full name', { exact: true }).fill('E2E Technician');
  await page.getByLabel('Email', { exact: true }).fill(technicianEmail);
  await page.getByLabel('Skills / specializations', { exact: true }).fill('HVAC');
  const technicianPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/team/invitations' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
  const technicianResponse = await technicianPromise;
  expect(technicianResponse.status()).toBe(201);
  const invitation = await technicianResponse.json();
  expect(invitation.status).toBe('pending');
  const invitationNotificationBody = readNotificationBody(technicianEmail, 'team.technician_invited');
  const inviteMatch = invitationNotificationBody.match(/\/team\/invitation\/([^\s/]+)/);
  expect(inviteMatch, invitationNotificationBody).not.toBeNull();
  const activation = await page.request.post(
    API + '/api/v1/team/invitations/public/' + encodeURIComponent(inviteMatch[1]) + '/accept',
    { data: { password: technicianPassword } },
  );
  expect(activation.status()).toBe(201);
  const session = await activation.json();
  const meResponse = await page.request.get(API + '/api/v1/auth/me', {
    headers: { Authorization: 'Bearer ' + session.access_token },
  });
  expect(meResponse.status()).toBe(200);
  const technician = await meResponse.json();
  expect(technician.role).toBe('technician');
  expect(technician.is_active).toBe(true);

  await page.goto('/operations');
  await expect(page.getByRole('heading', { name: 'Operations' })).toBeVisible();
  await page.getByRole('button', { name: 'New work order', exact: true }).click();
  await chooseOption(page, page.getByLabel('Customer', { exact: true }), customer.id);
  await chooseOption(page, page.getByLabel('Service location', { exact: true }), location.id);
  await chooseOption(page, page.getByLabel('Equipment', { exact: true }), equipment.id);
  await chooseOption(page, page.getByRole('dialog').last().getByLabel('Agreement', { exact: true }), agreement.id);
  const workOrderTitle = 'E2E HVAC service visit ' + unique;
  await page.getByLabel('Title', { exact: true }).fill(workOrderTitle);
  await page.getByLabel('Scheduled date', { exact: true }).fill(new Date().toISOString().slice(0, 10));
  await chooseOption(page, page.getByLabel('Priority', { exact: true }), 'high');
  await page.getByLabel('Description', { exact: true }).fill('Synthetic job; no field visit will be performed.');
  await page.getByLabel('Required skill (optional)', { exact: true }).fill('HVAC');
  const workOrderPromise = page.waitForResponse(response => response.url() === API + '/api/v1/work-orders' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create work order', exact: true }).click();
  const workOrderResponse = await workOrderPromise;
  expect(workOrderResponse.status()).toBe(201);
  const workOrder = await workOrderResponse.json();
  expect(workOrder.customer_id).toBe(customer.id);
  expect(workOrder.equipment_id).toBe(equipment.id);
  expect(workOrder.agreement_id).toBe(agreement.id);
  expect(workOrder.status).toBe('scheduled');
  const workOrderRow = page.getByRole('row').filter({ hasText: workOrderTitle });
  const assignPromise = page.waitForResponse(response => response.url() === API + '/api/v1/work-orders/' + workOrder.id + '/assign' && response.request().method() === 'POST');
  await workOrderRow.getByRole('button', { name: 'Assign', exact: true }).click();
  await chooseOption(page, page.getByLabel('Technician', { exact: true }), technician.id);
  await page.getByRole('button', { name: 'Assign technician', exact: true }).click();
  const assignedResponse = await assignPromise;
  expect(assignedResponse.status()).toBe(200);
  expect((await assignedResponse.json()).status).toBe('assigned');
  const startPromise = page.waitForResponse(response => response.url() === API + '/api/v1/work-orders/' + workOrder.id + '/start' && response.request().method() === 'POST');
  await workOrderRow.getByRole('button', { name: 'Start', exact: true }).click();
  const startedResponse = await startPromise;
  expect(startedResponse.status()).toBe(200);
  expect((await startedResponse.json()).status).toBe('in_progress');
  await workOrderRow.getByRole('button', { name: 'Complete', exact: true }).click();
  await page.getByLabel('Completion notes', { exact: true }).fill('End-to-end completion verified.');
  await page.getByLabel('Technician findings', { exact: true }).fill('Synthetic test record.');
  await page.getByLabel('Customer sign-off', { exact: true }).fill('E2E Test Customer');
  const completePromise = page.waitForResponse(response => response.url() === API + '/api/v1/work-orders/' + workOrder.id + '/complete' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Complete work order', exact: true }).click();
  const completeResponse = await completePromise;
  expect(completeResponse.status()).toBe(200);
  const completedOrder = await completeResponse.json();
  expect(completedOrder.status).toBe('completed');
  expect(completedOrder.completion_notes).toBe('End-to-end completion verified.');
  await expect(workOrderRow).toContainText('completed');
  await capture(page, '11-work-order-completed.png');

  // Recurring billing lifecycle: create, pause and resume a synthetic schedule.
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Recurring billing', exact: true }).click();
  await page.getByRole('button', { name: 'Add recurring schedule', exact: true }).click();
  await chooseOption(page, page.getByLabel('Customer', { exact: true }), customer.id);
  await chooseOption(page, page.getByLabel('Service location', { exact: true }), location.id);
  await chooseOption(page, page.getByRole('dialog').last().getByLabel('Agreement', { exact: true }), agreement.id);
  const scheduleName = 'E2E HVAC Monthly ' + unique;
  await page.getByLabel('Name', { exact: true }).fill(scheduleName);
  await chooseOption(page, page.getByLabel('Frequency', { exact: true }), 'monthly');
  await page.getByLabel('Next invoice', { exact: true }).fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel('Due days', { exact: true }).fill('30');
  await page.getByLabel('Service code', { exact: true }).fill('E2E-RECURRING');
  await page.getByLabel('Description', { exact: true }).fill('Synthetic monthly HVAC service');
  await page.getByLabel('Unit price', { exact: true }).fill('50.00');
  const recurringPromise = page.waitForResponse(response => response.url() === API + '/api/v1/recurring-invoices' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create schedule', exact: true }).click();
  const recurringResponse = await recurringPromise;
  expect(recurringResponse.status()).toBe(201);
  const recurring = await recurringResponse.json();
  expect(recurring.customer_id).toBe(customer.id);
  expect(recurring.agreement_id).toBe(agreement.id);
  expect(recurring.is_active).toBe(true);
  const recurringRow = page.getByRole('row').filter({ hasText: scheduleName });
  await expect(recurringRow).toContainText('Active');
  const pausePromise = page.waitForResponse(response => response.url() === API + '/api/v1/recurring-invoices/' + recurring.id + '/pause' && response.request().method() === 'POST');
  await recurringRow.getByRole('button', { name: 'Pause', exact: true }).click();
  const pausedResponse = await pausePromise;
  expect(pausedResponse.status()).toBe(200);
  expect((await pausedResponse.json()).is_active).toBe(false);
  const recurringResumePromise = page.waitForResponse(response => response.url() === API + '/api/v1/recurring-invoices/' + recurring.id + '/resume' && response.request().method() === 'POST');
  await recurringRow.getByRole('button', { name: 'Resume', exact: true }).click();
  const resumedResponse = await recurringResumePromise;
  expect(resumedResponse.status()).toBe(200);
  expect((await resumedResponse.json()).is_active).toBe(true);
  await capture(page, '12-recurring-billing-active.png');

  // Download reporting CSVs and verify that the records created by this browser run are exported.
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
  const customerDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Customers CSV', exact: true }).click();
  const customerDownload = await customerDownloadPromise;
  expect(customerDownload.suggestedFilename()).toBe('customers.csv');
  const customerCsv = await fs.readFile(await customerDownload.path(), 'utf8');
  expect(customerCsv).toContain('id,customer_number,kind,name,email,phone,status,created_at');
  expect(customerCsv).toContain(customerName);
  const agreementDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Agreements CSV', exact: true }).click();
  const agreementDownload = await agreementDownloadPromise;
  expect(agreementDownload.suggestedFilename()).toBe('agreements.csv');
  expect(await fs.readFile(await agreementDownload.path(), 'utf8')).toContain(agreementTitle);
  const invoiceDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Invoices CSV', exact: true }).click();
  const invoiceDownload = await invoiceDownloadPromise;
  expect(invoiceDownload.suggestedFilename()).toBe('invoices.csv');
  expect(await fs.readFile(await invoiceDownload.path(), 'utf8')).toContain(invoice.invoice_number);
  const orderDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Work orders CSV', exact: true }).click();
  const orderDownload = await orderDownloadPromise;
  expect(orderDownload.suggestedFilename()).toBe('work-orders.csv');
  expect(await fs.readFile(await orderDownload.path(), 'utf8')).toContain(workOrderTitle);
  await capture(page, '13-reports-and-csv-exports.png');

  // CSV import path includes preview validation, partial success, row correction and retry.
  await page.goto('/customers');
  await page.getByRole('button', { name: 'Import CSV', exact: true }).click();
  const importedName = 'CSV Import Customer ' + unique;
  const importCsv = 'name,kind,email,phone,notes\n' +
    importedName + ',commercial,csv-' + unique + '@example.com,5550101,Imported by E2E\n' +
    'Duplicate Import Customer ' + unique + ',commercial,dup-' + unique + '@example.com,5550102,First duplicate\n' +
    'Duplicate Import Customer ' + unique + ',commercial,dup-' + unique + '@example.com,5550103,Duplicate row';
  const previewPromise = page.waitForResponse(response => response.url() === API + '/api/v1/customers/imports/preview' && response.request().method() === 'POST');
  await page.locator('input[type=file]').setInputFiles({ name: 'northstar-customers.csv', mimeType: 'text/csv', buffer: Buffer.from(importCsv) });
  const previewResponse = await previewPromise;
  expect(previewResponse.status()).toBe(200);
  const previewBody = await previewResponse.json();
  expect(previewBody.total_rows).toBe(3);
  expect(previewBody.valid_rows).toBe(2);
  expect(previewBody.invalid_rows).toBe(1);
  await expect(page.getByText('2 valid', { exact: true })).toBeVisible();
  const importPromise = page.waitForResponse(response => response.url() === API + '/api/v1/customers/imports' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Import valid customers', exact: true }).click();
  const importResponse = await importPromise;
  expect(importResponse.status()).toBe(201);
  const importJob = await importResponse.json();
  expect(importJob.total_rows).toBe(3);
  expect(importJob.imported_rows).toBe(2);
  expect(importJob.failed_rows).toBe(1);
  expect(importJob.status).toBe('partial');
  await expect(page.getByText(importedName, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Import history', exact: true }).click();
  const importRow = page.getByRole('row').filter({ hasText: 'partial' });
  await importRow.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  const recoveredName = 'Recovered CSV Customer ' + unique;
  await page.getByRole('dialog').last().getByLabel('Customer name', { exact: true }).fill(recoveredName);
  await chooseOption(page, page.getByRole('dialog').last().getByLabel('Customer type', { exact: true }), 'commercial');
  await page.getByRole('dialog').last().getByLabel('Email', { exact: true }).fill('recovered-' + unique + '@example.com');
  await page.getByRole('dialog').last().getByLabel('Phone', { exact: true }).fill('5550104');
  await page.getByRole('dialog').last().locator('textarea').fill('Corrected during E2E import recovery.');
  const correctedRowPromise = page.waitForResponse(response =>
    response.url().includes('/api/v1/customers/imports/' + importJob.id + '/rows/') &&
    response.request().method() === 'PUT');
  const refreshedJobPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/customers/imports/' + importJob.id &&
    response.request().method() === 'GET');
  await page.getByRole('button', { name: 'Save corrected row', exact: true }).click();
  const correctedRowResponse = await correctedRowPromise;
  expect(correctedRowResponse.status()).toBe(200);
  const refreshedJobResponse = await refreshedJobPromise;
  expect(refreshedJobResponse.status()).toBe(200);
  const refreshedJob = await refreshedJobResponse.json();
  expect(refreshedJob.rows.some(row => row.status === 'pending')).toBe(true);
  const retryButton = page.getByRole('button', { name: 'Retry pending rows', exact: true });
  await expect(retryButton).toBeEnabled();
  const retryPromise = page.waitForResponse(response => response.url() === API + '/api/v1/customers/imports/' + importJob.id + '/retry' && response.request().method() === 'POST');
  await retryButton.click();
  const retryResponse = await retryPromise;
  expect(retryResponse.status()).toBe(200);
  const recoveredJob = await retryResponse.json();
  expect(recoveredJob.status).toBe('completed');
  expect(recoveredJob.imported_rows).toBe(3);
  expect(recoveredJob.failed_rows).toBe(0);
  await expect(page.getByRole('dialog').last()).toContainText('3 imported');
  await capture(page, '14-customer-import-recovery.png');

  // Email is safely queued to the outbox; no sender worker runs in this test environment.
  await page.goto('/integrations');
  await expect(page.getByRole('heading', { name: 'Delivery & integrations' })).toBeVisible();
  await page.getByRole('button', { name: 'Queue email', exact: true }).click();
  const queuedEmail = 'sam-notify-' + unique + '@example.com';
  const emailSubject = 'Northstar Service Update ' + unique;
  await page.getByRole('dialog').last().getByLabel('Recipient', { exact: true }).fill(queuedEmail);
  await page.getByRole('dialog').last().getByLabel('Subject', { exact: true }).fill(emailSubject);
  await page.getByRole('dialog').last().getByLabel('Event type', { exact: true }).fill('manual.notification');
  await page.getByRole('dialog').last().getByLabel('Body', { exact: true }).fill('Follow-up notification for the service agreement.');
  const notificationPromise = page.waitForResponse(response => response.url() === API + '/api/v1/notifications' && response.request().method() === 'POST');
  await page.getByRole('dialog').last().getByRole('button', { name: 'Queue email', exact: true }).click();
  const notificationResponse = await notificationPromise;
  expect(notificationResponse.status()).toBe(201);
  const notification = await notificationResponse.json();
  expect(notification.status).toBe('queued');
  expect(notification.recipient_email).toBe(queuedEmail);
  await expect(page.getByText(queuedEmail, { exact: true })).toBeVisible();
  await expect(page.getByText(emailSubject, { exact: true })).toBeVisible();
  await capture(page, '15-email-queued.png');

  // SMS is intentionally not delivered when the provider is disabled; the UI must expose the backend error.
  await page.getByRole('button', { name: 'SMS', exact: true }).click();
  await page.getByRole('button', { name: 'Queue SMS', exact: true }).click();
  await page.getByRole('dialog').last().getByLabel('Phone', { exact: true }).fill('+15550101010');
  await page.getByRole('dialog').last().getByLabel('Event type', { exact: true }).fill('manual.notification');
  await page.getByRole('dialog').last().getByLabel('Message', { exact: true }).fill('Synthetic SMS provider configuration check.');
  const smsPromise = page.waitForResponse(response => response.url() === API + '/api/v1/sms' && response.request().method() === 'POST');
  await page.getByRole('dialog').last().getByRole('button', { name: 'Queue SMS', exact: true }).click();
  const smsResponse = await smsPromise;
  expect(smsResponse.status()).toBe(503);
  expect((await smsResponse.json()).error.code).toBe('sms_provider_disabled');
  await expect(page.getByRole('dialog').last().getByText('SMS delivery is not configured')).toBeVisible();
  await capture(page, '16-sms-provider-disabled.png');

  // Maintenance plan generation is idempotent for the same scheduled occurrence.
  await page.goto('/operations');
  await page.getByRole('button', { name: 'Maintenance', exact: true }).click();
  await page.getByRole('button', { name: 'New maintenance plan', exact: true }).click();
  await chooseOption(page, page.getByRole('dialog').last().getByLabel('Customer', { exact: true }), customer.id);
  await chooseOption(page, page.getByRole('dialog').last().getByLabel('Service location', { exact: true }), location.id);
  const maintenanceName = 'E2E Quarterly HVAC Plan ' + unique;
  await chooseOption(page, page.getByRole('dialog').last().getByLabel('Frequency', { exact: true }), 'quarterly');
  await page.getByRole('dialog').last().getByLabel('Plan name', { exact: true }).fill(maintenanceName);
  await page.getByRole('dialog').last().getByLabel('Next due date', { exact: true }).fill(new Date().toISOString().slice(0, 10));
  await page.getByRole('dialog').last().getByLabel('Checklist, one item per line', { exact: true }).fill('Inspect HVAC filter\nVerify thermostat');
  const maintenancePromise = page.waitForResponse(response => response.url() === API + '/api/v1/maintenance/schedules' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create maintenance plan', exact: true }).click();
  const maintenanceResponse = await maintenancePromise;
  expect(maintenanceResponse.status()).toBe(201);
  const maintenanceSchedule = await maintenanceResponse.json();
  expect(maintenanceSchedule.customer_id).toBe(customer.id);
  expect(maintenanceSchedule.checklist_template).toEqual(['Inspect HVAC filter', 'Verify thermostat']);
  const maintenanceRow = page.getByRole('row').filter({ hasText: maintenanceName });
  const generatePromise = page.waitForResponse(response => response.url() === API + '/api/v1/maintenance/schedules/' + maintenanceSchedule.id + '/generate' && response.request().method() === 'POST');
  await maintenanceRow.getByRole('button', { name: 'Generate order', exact: true }).click();
  const generateResponse = await generatePromise;
  expect(generateResponse.status()).toBe(201);
  const generatedWorkOrder = await generateResponse.json();
  expect(generatedWorkOrder.maintenance_schedule_id).toBe(maintenanceSchedule.id);
  expect(generatedWorkOrder.status).toBe('scheduled');
  const duplicateGeneratePromise = page.waitForResponse(response => response.url() === API + '/api/v1/maintenance/schedules/' + maintenanceSchedule.id + '/generate' && response.request().method() === 'POST');
  await maintenanceRow.getByRole('button', { name: 'Generate order', exact: true }).click();
  const duplicateGenerateResponse = await duplicateGeneratePromise;
  expect(duplicateGenerateResponse.status()).toBe(200);
  expect((await duplicateGenerateResponse.json()).id).toBe(generatedWorkOrder.id);
  await capture(page, '18-maintenance-plan-generation.png');

  // Branch administration: create a branch, persist business hours and add a closure date.
  await page.getByRole('button', { name: 'Branches', exact: true }).click();
  await page.getByRole('button', { name: 'Add branch', exact: true }).click();
  const branchName = 'E2E Tampa Branch ' + unique;
  const branchCode = 'QA' + unique;
  await page.getByRole('dialog').last().getByLabel('Name', { exact: true }).fill(branchName);
  await page.getByRole('dialog').last().getByLabel('Code', { exact: true }).fill(branchCode);
  await page.getByRole('dialog').last().getByLabel('Timezone', { exact: true }).fill('America/New_York');
  await page.getByRole('dialog').last().getByLabel('Country code', { exact: true }).fill('US');
  await page.getByRole('dialog').last().getByLabel('City', { exact: true }).fill('Tampa');
  await page.getByRole('dialog').last().getByLabel('Email', { exact: true }).fill('branch-' + unique + '@example.com');
  const branchCreatePromise = page.waitForResponse(response => response.url() === API + '/api/v1/branches' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create branch', exact: true }).click();
  const branchCreateResponse = await branchCreatePromise;
  expect(branchCreateResponse.status()).toBe(201);
  const newBranch = await branchCreateResponse.json();
  expect(newBranch.name).toBe(branchName);
  expect(newBranch.code).toBe(branchCode);
  const branchRow = page.getByRole('row').filter({ hasText: branchName });
  await branchRow.getByRole('button', { name: 'Open', exact: true }).click();
  const mondayHours = page.locator('.hours-row').filter({ hasText: 'Monday' });
  await expect(mondayHours).toBeVisible();
  await mondayHours.getByLabel('Closed', { exact: true }).uncheck();
  await mondayHours.locator('input[type=time]').nth(0).fill('08:00');
  await mondayHours.locator('input[type=time]').nth(1).fill('17:00');
  const hoursPromise = page.waitForResponse(response => response.url() === API + '/api/v1/branches/' + newBranch.id + '/business-hours' && response.request().method() === 'PUT');
  await page.getByRole('dialog').last().getByRole('button', { name: 'Save hours', exact: true }).click();
  const hoursResponse = await hoursPromise;
  expect(hoursResponse.status()).toBe(200);
  const savedHours = await hoursResponse.json();
  expect(savedHours).toHaveLength(7);
  const savedMonday = savedHours.find(item => item.day_of_week === 0);
  expect(savedMonday.is_closed).toBe(false);
  expect(savedMonday.opens_at).toContain('08:00');
  expect(savedMonday.closes_at).toContain('17:00');
  const closureName = 'E2E maintenance closure ' + unique;
  await page.getByRole('dialog').last().getByLabel('Date', { exact: true }).fill(new Date().toISOString().slice(0, 10));
  await page.getByRole('dialog').last().getByLabel('Name', { exact: true }).fill(closureName);
  await page.getByRole('dialog').last().getByLabel('Description', { exact: true }).fill('Synthetic closure record for integration testing.');
  const closurePromise = page.waitForResponse(response => response.url() === API + '/api/v1/branches/' + newBranch.id + '/closures' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Add closure', exact: true }).click();
  const closureResponse = await closurePromise;
  expect(closureResponse.status()).toBe(201);
  expect((await closureResponse.json()).name).toBe(closureName);
  await expect(page.getByRole('dialog').last()).toContainText(closureName);
  await capture(page, '17-branch-hours-and-closures.png');

  // Smoke-check every remaining protected route after authentication.
  const routes = [
    ['/operations', 'Operations'],
    ['/assets', 'Equipment'],
    ['/catalog', 'Service catalog'],
    ['/settings', 'Settings'],
    ['/reports', 'Reports'],
    ['/integrations', 'Integrations'],
  ];
  for (const item of routes) {
    await page.goto(item[0]);
    await expect(page).toHaveURL(new RegExp(item[0]));
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  }

  expect(pageErrors, 'Unexpected uncaught browser errors: ' + pageErrors.join(' | ')).toEqual([]);
  testInfo.annotations.push({ type: 'synthetic-data', description: 'All records are generated for this disposable CI database.' });
});

test('API rejects cross-tenant record access and untrusted origins', async ({ request }) => {
  const unique = String(Date.now());
  const register = async (name) => {
    const response = await request.post(API + '/api/v1/auth/register', {
      data: {
        company_name: 'Northstar Isolation ' + name + ' ' + unique,
        full_name: 'Isolation Test ' + name,
        email: 'sam-isolation-' + name + '-' + unique + '@example.com',
        password: 'Northstar-Isolation!2026',
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.access_token).toBeTruthy();
    return body.access_token;
  };

  const ownerA = await register('A');
  const ownerB = await register('B');
  const createResponse = await request.post(API + '/api/v1/customers', {
    headers: { Authorization: 'Bearer ' + ownerA },
    data: { name: 'Private Tenant A Customer ' + unique, kind: 'commercial' },
  });
  expect(createResponse.status()).toBe(201);
  const customer = await createResponse.json();

  const crossTenantResponse = await request.get(API + '/api/v1/customers/' + customer.id, {
    headers: { Authorization: 'Bearer ' + ownerB },
  });
  expect(crossTenantResponse.status()).toBe(404);
  expect((await crossTenantResponse.json()).error.code).toBe('customer_not_found');

  const untrustedOriginResponse = await request.get(API + '/health/live', {
    headers: { Origin: 'https://untrusted.example' },
  });
  expect(untrustedOriginResponse.status()).toBe(403);
  expect((await untrustedOriginResponse.json()).error.code).toBe('origin_not_allowed');
});


test('API lifecycle covers partial payments, refunds, credits, voiding, attachments and webhooks', async ({ request }) => {
  const unique = String(Date.now());
  const registered = await request.post(API + '/api/v1/auth/register', {
    data: {
      company_name: 'Northstar Adjustment Services ' + unique,
      full_name: 'Adjustment QA Owner',
      email: 'sam-adjustment-' + unique + '@example.com',
      password: 'Northstar-Adjustment!2026',
    },
  });
  expect(registered.status()).toBe(201);
  const auth = await registered.json();
  const headers = { Authorization: 'Bearer ' + auth.access_token };
  const customerResponse = await request.post(API + '/api/v1/customers', {
    headers,
    data: { name: 'Adjustment Customer ' + unique, email: 'adjustment-' + unique + '@example.com' },
  });
  expect(customerResponse.status()).toBe(201);
  const customer = await customerResponse.json();

  const invoiceResponse = await request.post(API + '/api/v1/invoices', {
    headers,
    data: {
      customer_id: customer.id,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      lines: [{ service_code: 'QA-ADJUST', description: 'Adjustment lifecycle test', quantity: '1', unit_price: '100.00' }],
    },
  });
  expect(invoiceResponse.status()).toBe(201);
  const invoice = await invoiceResponse.json();
  expect(Number(invoice.total_amount)).toBe(100);

  const issuedResponse = await request.post(API + '/api/v1/invoices/' + invoice.id + '/issue', { headers });
  expect(issuedResponse.status()).toBe(200);
  expect((await issuedResponse.json()).status).toBe('issued');

  const paymentHeaders = { ...headers, 'Idempotency-Key': 'partial-pay-' + unique };
  const paymentResponse = await request.post(API + '/api/v1/invoices/' + invoice.id + '/payments', {
    headers: paymentHeaders,
    data: { amount: '40.00', payment_method: 'bank_transfer', reference: 'QA-PARTIAL-' + unique },
  });
  expect(paymentResponse.status()).toBe(201);
  const payment = await paymentResponse.json();

  const replayResponse = await request.post(API + '/api/v1/invoices/' + invoice.id + '/payments', {
    headers: paymentHeaders,
    data: { amount: '40.00', payment_method: 'bank_transfer', reference: 'QA-PARTIAL-' + unique },
  });
  expect(replayResponse.status()).toBe(200);
  expect((await replayResponse.json()).id).toBe(payment.id);

  let currentResponse = await request.get(API + '/api/v1/invoices/' + invoice.id, { headers });
  let current = await currentResponse.json();
  expect(current.status).toBe('partially_paid');
  expect(Number(current.amount_paid)).toBe(40);
  expect(Number(current.balance_due)).toBe(60);

  const refundResponse = await request.post(API + '/api/v1/invoices/' + invoice.id + '/payments/' + payment.id + '/refunds', {
    headers: { ...headers, 'Idempotency-Key': 'partial-refund-' + unique },
    data: { amount: '10.00', refund_method: 'bank_transfer', reference: 'QA-REFUND-' + unique, reason: 'Partial refund verification' },
  });
  expect(refundResponse.status()).toBe(201);
  currentResponse = await request.get(API + '/api/v1/invoices/' + invoice.id, { headers });
  current = await currentResponse.json();
  expect(current.status).toBe('partially_paid');
  expect(Number(current.amount_refunded)).toBe(10);
  expect(Number(current.balance_due)).toBe(70);

  const creditResponse = await request.post(API + '/api/v1/invoices/' + invoice.id + '/credits', {
    headers: { ...headers, 'Idempotency-Key': 'partial-credit-' + unique },
    data: { amount: '20.00', reason: 'Credit balance verification' },
  });
  expect(creditResponse.status()).toBe(201);
  currentResponse = await request.get(API + '/api/v1/invoices/' + invoice.id, { headers });
  current = await currentResponse.json();
  expect(Number(current.credits_applied)).toBe(20);
  expect(Number(current.balance_due)).toBe(50);

  const excessiveCredit = await request.post(API + '/api/v1/invoices/' + invoice.id + '/credits', {
    headers: { ...headers, 'Idempotency-Key': 'excess-credit-' + unique },
    data: { amount: '100.00', reason: 'Must exceed outstanding balance' },
  });
  expect(excessiveCredit.status()).toBe(409);
  expect((await excessiveCredit.json()).error.code).toBe('credit_exceeds_balance');

  const draftForVoid = await request.post(API + '/api/v1/invoices', {
    headers,
    data: {
      customer_id: customer.id,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      lines: [{ service_code: 'QA-VOID', description: 'Void lifecycle test', quantity: '1', unit_price: '25.00' }],
    },
  });
  expect(draftForVoid.status()).toBe(201);
  const voidInvoice = await draftForVoid.json();
  const voidResponse = await request.post(API + '/api/v1/invoices/' + voidInvoice.id + '/void', {
    headers,
    data: { reason: 'QA verified void path' },
  });
  expect(voidResponse.status()).toBe(200);
  expect((await voidResponse.json()).status).toBe('void');

  const attachmentContent = 'Northstar attachment lifecycle ' + unique;
  const attachmentUpload = await request.post(API + '/api/v1/attachments/customer/' + customer.id, {
    headers,
    multipart: {
      file: { name: 'qa-attachment.txt', mimeType: 'text/plain', buffer: Buffer.from(attachmentContent) },
      description: 'QA attachment lifecycle',
    },
  });
  expect(attachmentUpload.status()).toBe(201);
  const attachment = await attachmentUpload.json();
  expect(attachment.sha256).toBeTruthy();
  const attachmentList = await request.get(API + '/api/v1/attachments?entity_type=customer&entity_id=' + customer.id, { headers });
  expect(attachmentList.status()).toBe(200);
  expect(attachmentList.json ? (await attachmentList.json()).some(item => item.id === attachment.id) : false).toBe(true);
  const attachmentDownload = await request.get(API + '/api/v1/attachments/' + attachment.id + '/download', { headers });
  expect(attachmentDownload.status()).toBe(200);
  expect(await attachmentDownload.text()).toBe(attachmentContent);
  const attachmentDelete = await request.delete(API + '/api/v1/attachments/' + attachment.id, { headers });
  expect(attachmentDelete.status()).toBe(200);
  expect((await request.get(API + '/api/v1/attachments/' + attachment.id, { headers })).status()).toBe(404);

  const webhookCreate = await request.post(API + '/api/v1/webhooks', {
    headers,
    data: { name: 'QA webhook ' + unique, url: 'https://example.com/service-agreement-manager-hook', events: ['customer.created', 'payment.received'] },
  });
  expect(webhookCreate.status()).toBe(201);
  const webhook = await webhookCreate.json();
  expect(webhook.secret.length).toBeGreaterThanOrEqual(32);
  const webhookList = await request.get(API + '/api/v1/webhooks', { headers });
  expect(webhookList.status()).toBe(200);
  const listedWebhook = (await webhookList.json()).find(item => item.id === webhook.id);
  expect(listedWebhook).toBeTruthy();
  expect(listedWebhook.secret).toBeUndefined();

  const rotated = await request.post(API + '/api/v1/webhooks/' + webhook.id + '/rotate-secret', { headers });
  expect(rotated.status()).toBe(200);
  expect((await rotated.json()).secret).not.toBe(webhook.secret);
  const disabled = await request.delete(API + '/api/v1/webhooks/' + webhook.id, { headers });
  expect(disabled.status()).toBe(200);
  expect((await disabled.json()).is_active).toBe(false);
});
