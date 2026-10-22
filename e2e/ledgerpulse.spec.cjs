const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8000';

async function capture(page, name) {
  const target = path.join(process.cwd(), 'test-results', 'screenshots', name);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: true, animations: 'disabled' });
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

test('Service Agreement Manager browser journey persists customer, agreement and invoice lifecycle data', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const unique = String(Date.now());
  const email = 'morgan.ellis+' + unique + '@example.com';
  const customerName = 'Harborview Medical Offices';
  const locationName = 'Harborview Main Campus';
  const agreementTitle = 'Preventive HVAC Maintenance Agreement';

  // Public entry point.
  await page.goto('/');
  await expect(page.locator('h1').first()).toBeVisible();
  await capture(page, '01-public-homepage.png');

  // Incorrect credentials should produce a readable error rather than a blank or stuck form.
  await page.goto('/login');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await capture(page, '02-login-page.png');
  await page.getByLabel('Email').fill('not-registered-' + unique + '@example.com');
  await page.getByLabel('Password').fill('Incorrect-Password-2026');
  const badLoginPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/auth/login' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const badLogin = await badLoginPromise;
  expect(badLogin.status()).toBe(401);
  await expect(page.getByRole('alert')).toContainText(/Email or password is incorrect/i);

  // Create a disposable test owner. The CI API runs in development mode so verification mail is not required.
  await page.goto('/register');
  await page.getByLabel('Company name').fill('Northstar Facility Services' + unique);
  await page.getByLabel('Your name').fill('Morgan Ellis');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Northstar-Test-Pass!2026');
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
  await page.getByLabel('Name').fill(customerName);
  await page.getByLabel('Email').fill('customer-' + unique + '@example.com');
  await page.getByLabel('Notes').fill('Primary facilities contact for preventive maintenance and billing coordination.');
  const customerPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/customers' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create customer', exact: true }).click();
  const customerResponse = await customerPromise;
  expect(customerResponse.status()).toBe(201);
  const customer = await customerResponse.json();
  expect(customer.name).toBe(customerName);
  expect(customer.status).toBe('active');
  await expect(page.getByRole('dialog').last()).toContainText(customerName);

  await page.getByRole('button', { name: 'Edit customer', exact: true }).click();
  const customerEditDialog = page.getByRole('dialog').last();
  await customerEditDialog.getByLabel('Phone').fill('813-555-0148');
  await customerEditDialog.getByRole('button', { name: 'Save customer', exact: true }).click();
  await expect(page.getByRole('dialog').last()).toContainText('813-555-0148');
  await page.getByLabel('Attachment description').fill('HVAC service history and equipment documentation');
  await page.locator('.attachments input[type="file"]').setInputFiles({name:'Harborview-HVAC-Maintenance-Record.txt',mimeType:'text/plain',buffer:Buffer.from('Harborview Medical Offices\\nRooftop unit RTU-04\\nPreventive maintenance record.')});
  await expect(page.getByText('Harborview-HVAC-Maintenance-Record.txt', { exact: true })).toBeVisible();
  const attachmentRow = page.locator('.attachment-row').filter({ hasText: 'Harborview-HVAC-Maintenance-Record.txt' });
  await attachmentRow.getByRole('button', { name: 'Edit details', exact: true }).click();
  const attachmentEditDialog = page.getByRole('dialog').last();
  await attachmentEditDialog.getByLabel('Description').fill('Annual service history — rooftop unit RTU-04');
  await attachmentEditDialog.getByRole('button', { name: 'Save description', exact: true }).click();
  await expect(attachmentRow).toContainText('Annual service history — rooftop unit RTU-04');
  await capture(page, '04a-customer-documents.png');
  const attachmentDownload = page.waitForEvent('download');
  await attachmentRow.getByRole('button', { name: 'Download', exact: true }).click();
  expect((await attachmentDownload).suggestedFilename()).toBe('Harborview-HVAC-Maintenance-Record.txt');
  page.once('dialog', dialog => dialog.accept());
  await attachmentRow.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Harborview-HVAC-Maintenance-Record.txt', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /Contacts/ }).click();
  await page.getByRole('button', { name: 'Add contact', exact: true }).click();
  const contactName = 'Jordan Lee' + unique;
  await page.getByRole('dialog').last().getByLabel('Full name').fill(contactName);
  await page.getByRole('dialog').last().getByLabel('Email').fill('billing-' + unique + '@example.com');
  await page.getByRole('dialog').last().getByLabel('Phone').fill('5550101');
  await page.getByRole('dialog').last().getByLabel('Billing contact').check();
  const contactPromise = page.waitForResponse(response => response.url() === API + '/api/v1/customers/' + customer.id + '/contacts' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Add contact', exact: true }).last().click();
  const contactResponse = await contactPromise;
  expect(contactResponse.status()).toBe(201);
  expect((await contactResponse.json()).full_name).toBe(contactName);
  await expect(page.getByRole('dialog').last()).toContainText(contactName);

  await page.getByRole('button', { name: /Locations/ }).click();
  await page.getByRole('button', { name: 'Add location', exact: true }).click();
  await page.getByLabel('Location name').fill(locationName);
  await page.getByLabel('Address line 1').fill('1200 Bayshore Boulevard');
  await page.getByLabel('City').fill('Tampa');
  await page.getByLabel('Region/state').fill('FL');
  await page.getByLabel('Postal code').fill('33602');
  await page.getByLabel('Country code').fill('US');
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
  await page.getByLabel('Customer').selectOption(customer.id);
  await expect(page.getByLabel('Service location')).toHaveValue(location.id);
  await page.getByLabel('Service location').selectOption(location.id);
  await page.getByLabel('Agreement title').fill(agreementTitle);
  await page.getByLabel('Service name').fill('Preventive HVAC maintenance');
  await page.getByLabel('Unit price').fill('120.00');
  await page.getByLabel('Terms').fill('Synthetic end-to-end test agreement; no real service is scheduled.');
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

  await page.getByRole('button', { name: 'Record acceptance', exact: true }).click();
  await page.getByLabel('Accepted by').fill('Morgan Ellis');
  const acceptPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/agreements/' + agreement.id + '/accept' &&
    response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save acceptance', exact: true }).click();
  const acceptedResponse = await acceptPromise;
  expect(acceptedResponse.status()).toBe(200);
  expect((await acceptedResponse.json()).status).toBe('active');
  await expect(page.getByLabel('Accepted by')).toHaveCount(0);

  // Agreements effective today activate when accepted; verify subsequent suspend/resume transitions.
  const suspendPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/agreements/' + agreement.id + '/suspend' &&
    response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Suspend', exact: true }).click();
  await page.getByLabel('Reason').fill('Suspend and resume lifecycle verification');
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
  await page.getByLabel('Customer').selectOption(customer.id);
  await page.getByLabel('Service location').selectOption(location.id);
  await page.getByLabel('Service code').fill('HVAC-PREVENTIVE');
  await page.getByLabel('Description').fill('Preventive HVAC maintenance');
  await page.getByLabel('Unit price').fill('120.00');
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
  await page.getByLabel('Amount').fill('120.00');
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
  await page.getByLabel('Customer').selectOption(customer.id);
  await page.getByLabel('Service location').selectOption(location.id);
  await page.getByLabel('Category').fill('HVAC system');
  await page.getByLabel('Manufacturer').fill('Carrier');
  await page.getByLabel('Model number').fill('WeatherMaker 48TC');
  await page.getByLabel('Serial number').fill('RTU-04');
  const equipmentPromise = page.waitForResponse(response => response.url() === API + '/api/v1/equipment' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create equipment', exact: true }).click();
  const equipmentResponse = await equipmentPromise;
  expect(equipmentResponse.status()).toBe(201);
  const equipment = await equipmentResponse.json();
  expect(equipment.customer_id).toBe(customer.id);
  expect(equipment.service_location_id).toBe(location.id);
  expect(equipment.serial_number).toBe('RTU-04');
  await expect(page.getByText('RTU-04')).toBeVisible();
  await capture(page, '09-equipment-created.png');
  const equipmentRow = page.getByRole('row').filter({ hasText: 'RTU-04' });
  await equipmentRow.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Notes').fill('Rooftop unit serving the Harborview main campus; inspect each quarter.');
  await page.getByRole('button', { name: 'Save equipment', exact: true }).click();
  await expect(equipmentRow).toContainText('RTU-04');

  await page.goto('/catalog');
  await expect(page.getByRole('heading', { name: 'Service catalog' })).toBeVisible();
  await page.getByRole('button', { name: 'Add service', exact: true }).click();
  await page.getByLabel('Service code').fill('HVAC-INSPECT');
  await page.getByLabel('Category').fill('Maintenance');
  await page.getByLabel('Name').fill('Seasonal HVAC inspection');
  await page.getByLabel('Description').fill('Seasonal inspection, coil cleaning and safety checks for rooftop HVAC equipment.');
  await page.getByLabel('Unit price').fill('150.00');
  await page.getByLabel('Duration, minutes').fill('60');
  const catalogPromise = page.waitForResponse(response => response.url() === API + '/api/v1/service-catalog' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create service', exact: true }).click();
  const catalogResponse = await catalogPromise;
  expect(catalogResponse.status()).toBe(201);
  const catalogItem = await catalogResponse.json();
  expect(catalogItem.service_code).toBe(('HVAC-INSPECT').toUpperCase());
  expect(Number(catalogItem.unit_price)).toBe(150);
  await expect(page.getByText(('HVAC-INSPECT').toUpperCase())).toBeVisible();
  await capture(page, '10-service-catalog-created.png');
  const catalogRow = page.getByRole('row').filter({ hasText: 'HVAC-INSPECT' });
  await catalogRow.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Unit price').fill('165.00');
  await page.getByLabel('Description').fill('Seasonal inspection, coil cleaning and safety checks; updated service rate.');
  await page.getByRole('button', { name: 'Save service', exact: true }).click();
  await expect(catalogRow).toContainText('165.00');
  await capture(page, '10a-service-catalog-maintained.png');

  // Create a technician from Settings, then test the complete work-order lifecycle.
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Team', exact: true }).click();
  await page.getByRole('button', { name: 'Add team member', exact: true }).click();
  const technicianEmail = 'taylor.brooks+' + unique + '@example.com';
  await page.getByLabel('Full name').fill('Taylor Brooks');
  await page.getByLabel('Email').fill(technicianEmail);
  await page.getByLabel('Password').fill('Northstar-Team-Member!2026');
  await page.getByLabel('Role').selectOption('technician');
  const technicianPromise = page.waitForResponse(response => response.url() === API + '/api/v1/users' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create member', exact: true }).click();
  const technicianResponse = await technicianPromise;
  expect(technicianResponse.status()).toBe(201);
  const technician = await technicianResponse.json();
  expect(technician.role).toBe('technician');
  expect(technician.is_active).toBe(true);

  await page.goto('/operations');
  await expect(page.getByRole('heading', { name: 'Operations' })).toBeVisible();
  await page.getByRole('button', { name: 'New work order', exact: true }).click();
  await page.getByLabel('Customer').selectOption(customer.id);
  await page.getByLabel('Service location').selectOption(location.id);
  await page.getByLabel('Equipment').selectOption(equipment.id);
  await page.getByRole('dialog').last().getByLabel('Agreement').selectOption(agreement.id);
  const workOrderTitle = 'Quarterly rooftop HVAC inspection';
  await page.getByLabel('Title').fill(workOrderTitle);
  await page.getByLabel('Scheduled date').fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel('Priority').selectOption('high');
  await page.getByLabel('Description').fill('Inspect the rooftop unit, clean coils and record operating pressures.');
  const workOrderPromise = page.waitForResponse(response => response.url() === API + '/api/v1/work-orders' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create work order', exact: true }).click();
  const workOrderResponse = await workOrderPromise;
  expect(workOrderResponse.status()).toBe(201);
  const workOrder = await workOrderResponse.json();
  expect(workOrder.customer_id).toBe(customer.id);
  expect(workOrder.equipment_id).toBe(equipment.id);
  expect(workOrder.agreement_id).toBe(agreement.id);
  expect(workOrder.status).toBe('scheduled');
  let workOrderRow = page.getByRole('row').filter({ hasText: workOrderTitle });
  await workOrderRow.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Description').fill('Quarterly preventive maintenance: inspect coils, belts and operating pressures.');
  await page.getByRole('button', { name: 'Save work order', exact: true }).click();
  workOrderRow = page.getByRole('row').filter({ hasText: workOrderTitle });
  await expect(workOrderRow).toContainText(workOrderTitle);
  const assignPromise = page.waitForResponse(response => response.url() === API + '/api/v1/work-orders/' + workOrder.id + '/assign' && response.request().method() === 'POST');
  await workOrderRow.getByRole('button', { name: 'Assign', exact: true }).click();
  await page.getByLabel('Technician').selectOption(technician.id);
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
  await page.getByLabel('Completion notes').fill('End-to-end completion verified.');
  await page.getByLabel('Technician findings').fill('Synthetic test record.');
  await page.getByLabel('Customer sign-off').fill('E2E Test Customer');
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
  await page.getByLabel('Customer').selectOption(customer.id);
  await page.getByLabel('Service location').selectOption(location.id);
  await page.getByRole('dialog').last().getByLabel('Agreement').selectOption(agreement.id);
  const scheduleName = 'Harborview Monthly HVAC Maintenance';
  await page.getByLabel('Name').fill(scheduleName);
  await page.getByLabel('Frequency').selectOption('monthly');
  await page.getByLabel('Next invoice').fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel('Due days').fill('30');
  await page.getByLabel('Service code').fill('HVAC-MONTHLY');
  await page.getByLabel('Description').fill('Synthetic monthly HVAC service');
  await page.getByLabel('Unit price').fill('50.00');
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
  const importedName = 'Riverwalk Commerce Annex';
  const importCsv = 'name,kind,email,phone,notes\n' +
    importedName + ',commercial,csv-' + unique + '@example.com,5550101,Imported by E2E\n' +
    'Duplicate Prospect Record' + ',commercial,dup-' + unique + '@example.com,5550102,First duplicate\n' +
    'Duplicate Prospect Record' + ',commercial,dup-' + unique + '@example.com,5550103,Duplicate row';
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
  const recoveredName = 'Riverwalk Commerce Annex - Building B';
  await page.getByRole('dialog').last().getByLabel('Customer name').fill(recoveredName);
  await page.getByRole('dialog').last().getByLabel('Customer type').selectOption('commercial');
  await page.getByRole('dialog').last().getByLabel('Email').fill('recovered-' + unique + '@example.com');
  await page.getByRole('dialog').last().getByLabel('Phone').fill('5550104');
  await page.getByRole('dialog').last().getByLabel('Notes').fill('Corrected during E2E import recovery.');
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
  const queuedEmail = 'facilities+' + unique + '@harborview.example.com';
  const emailSubject = 'Preventive maintenance visit confirmation';
  await page.getByRole('dialog').last().getByLabel('Recipient').fill(queuedEmail);
  await page.getByRole('dialog').last().getByLabel('Subject').fill(emailSubject);
  await page.getByRole('dialog').last().getByLabel('Event type').fill('manual.notification');
  await page.getByRole('dialog').last().getByLabel('Body').fill('Your quarterly HVAC preventive-maintenance visit is scheduled. Reply to your service coordinator to arrange access.');
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
  await page.getByRole('dialog').last().getByLabel('Phone').fill('+15550101010');
  await page.getByRole('dialog').last().getByLabel('Event type').fill('manual.notification');
  await page.getByRole('dialog').last().getByLabel('Message').fill('Your next preventive-maintenance visit is scheduled for October 28 at 9:00 AM.');
  await capture(page, '16-sms-message-composer.png');
  const smsPromise = page.waitForResponse(response => response.url() === API + '/api/v1/sms' && response.request().method() === 'POST');
  await page.getByRole('dialog').last().getByRole('button', { name: 'Queue SMS', exact: true }).click();
  const smsResponse = await smsPromise;
  expect(smsResponse.status()).toBe(503);
  expect((await smsResponse.json()).error.code).toBe('sms_provider_disabled');
  await expect(page.getByRole('dialog').last().getByText('SMS delivery is not configured')).toBeVisible();

  // Maintenance plan generation is idempotent for the same scheduled occurrence.
  await page.goto('/operations');
  await page.getByRole('button', { name: 'Maintenance', exact: true }).click();
  await page.getByRole('button', { name: 'New maintenance plan', exact: true }).click();
  await page.getByRole('dialog').last().getByLabel('Customer').selectOption(customer.id);
  await page.getByRole('dialog').last().getByLabel('Service location').selectOption(location.id);
  const maintenanceName = 'Quarterly rooftop HVAC maintenance plan';
  await page.getByRole('dialog').last().getByLabel('Frequency').selectOption('quarterly');
  await page.getByRole('dialog').last().getByLabel('Plan name').fill(maintenanceName);
  await page.getByRole('dialog').last().getByLabel('Next due date').fill(new Date().toISOString().slice(0, 10));
  await page.getByRole('dialog').last().getByLabel('Checklist, one item per line').fill('Inspect HVAC filter\nVerify thermostat');
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
  await page.getByRole('dialog').last().getByLabel('Name').fill(branchName);
  await page.getByRole('dialog').last().getByLabel('Code', { exact: true }).fill(branchCode);
  await page.getByRole('dialog').last().getByLabel('Timezone').fill('America/New_York');
  await page.getByRole('dialog').last().getByLabel('Country code').fill('US');
  await page.getByRole('dialog').last().getByLabel('City').fill('Tampa');
  await page.getByRole('dialog').last().getByLabel('Email').fill('branch-' + unique + '@example.com');
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
  await mondayHours.getByLabel('Closed').uncheck();
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
  await page.getByRole('dialog').last().getByLabel('Date').fill(new Date().toISOString().slice(0, 10));
  await page.getByRole('dialog').last().getByLabel('Name').fill(closureName);
  await page.getByRole('dialog').last().getByLabel('Description').fill('Synthetic closure record for integration testing.');
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
        email: 'northstar-isolation-' + name + '-' + unique + '@example.com',
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
      company_name: 'Northstar Adjustment QA ' + unique,
      full_name: 'Adjustment QA Owner',
      email: 'northstar-adjustment-' + unique + '@example.com',
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
    data: { name: 'QA webhook ' + unique, url: 'https://example.com/northstar-hook', events: ['customer.created', 'payment.received'] },
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
