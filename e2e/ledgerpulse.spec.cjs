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

test('LedgerPulse browser journey persists customer, agreement and invoice lifecycle data', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const unique = String(Date.now());
  const email = 'ledgerpulse-e2e-' + unique + '@example.com';
  const customerName = 'E2E HVAC Customer ' + unique;
  const locationName = 'Primary Service Site ' + unique;
  const agreementTitle = 'Annual HVAC Service ' + unique;

  // Public entry point.
  await page.goto('/');
  await expect(page.locator('h1').first()).toBeVisible();
  await capture(page, '01-public-homepage.png');

  // Incorrect credentials should produce a readable error rather than a blank or stuck form.
  await page.goto('/login');
  await page.getByLabel('Email').fill('not-registered-' + unique + '@example.com');
  await page.getByLabel('Password').fill('Incorrect-Password-2026');
  const badLoginPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/auth/login' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const badLogin = await badLoginPromise;
  expect(badLogin.status()).toBe(401);
  await expect(page.getByRole('alert')).toContainText(/Email or password is incorrect/i);
  await capture(page, '02-login-invalid-credentials.png');

  // Create a disposable test owner. The CI API runs in development mode so verification mail is not required.
  await page.goto('/register');
  await page.getByLabel('Company name').fill('LedgerPulse E2E Company ' + unique);
  await page.getByLabel('Your name').fill('LedgerPulse E2E Owner');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('LedgerPulse-Test-Pass!2026');
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
  await page.getByLabel('Notes').fill('Synthetic record created by automated end-to-end testing.');
  const customerPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/customers' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create customer', exact: true }).click();
  const customerResponse = await customerPromise;
  expect(customerResponse.status()).toBe(201);
  const customer = await customerResponse.json();
  expect(customer.name).toBe(customerName);
  expect(customer.status).toBe('active');
  await expect(page.getByRole('dialog').last()).toContainText(customerName);

  await page.getByRole('button', { name: /Locations/ }).click();
  await page.getByRole('button', { name: 'Add location', exact: true }).click();
  await page.getByLabel('Location name').fill(locationName);
  await page.getByLabel('Address line 1').fill('123 E2E Test Avenue');
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
  await page.getByLabel('Accepted by').fill('LedgerPulse E2E Owner');
  const acceptPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/agreements/' + agreement.id + '/accept' &&
    response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save acceptance', exact: true }).click();
  const acceptedResponse = await acceptPromise;
  expect(acceptedResponse.status()).toBe(200);
  expect((await acceptedResponse.json()).status).toBe('accepted');

  const activatePromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/agreements/' + agreement.id + '/activate' &&
    response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Activate', exact: true }).click();
  const activeResponse = await activatePromise;
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
  await page.getByLabel('Service code').fill('E2E-HVAC');
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
  await expect(page.getByText('paid', { exact: true })).toBeVisible();
  await capture(page, '08-invoice-paid.png');

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
        company_name: 'LedgerPulse Isolation ' + name + ' ' + unique,
        full_name: 'Isolation Test ' + name,
        email: 'ledgerpulse-isolation-' + name + '-' + unique + '@example.com',
        password: 'LedgerPulse-Isolation!2026',
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
