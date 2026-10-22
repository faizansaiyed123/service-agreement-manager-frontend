const { test, expect } = require('@playwright/test');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8000';

async function browserApi(page, method, route, body, extraHeaders = {}) {
  return page.evaluate(async (args) => {
    const headers = { ...args.extraHeaders };
    const options = {
      method: args.method,
      credentials: 'include',
      headers,
    };
    if (args.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(args.body);
    }
    const response = await fetch(args.api + '/api/v1' + args.route, options);
    const raw = await response.text();
    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = raw;
    }
    return {
      status: response.status,
      body: parsed,
      text: raw,
      contentType: response.headers.get('content-type'),
      checksum: response.headers.get('x-attachment-sha256'),
    };
  }, { api: API, method, route, body, extraHeaders });
}

async function capture(page, name) {
  const target = path.join(process.cwd(), 'test-results', 'screenshots', name);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: true, animations: 'disabled' });
}

test('Service Agreement Manager account security, attachments, webhooks and finance journey', async ({ page, request }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const unique = String(Date.now());
  const ownerEmail = 'morgan.ellis+extended-' + unique + '@example.com';
  const password = 'Northstar-Extended!2026';

  // Create a browser-cookie session rather than relying on a bearer token in the UI.
  await page.goto('/register');
  await page.getByLabel('Company name').fill('Northstar Facility Services ' + unique);
  await page.getByLabel('Your name').fill('Morgan Ellis');
  await page.getByLabel('Email').fill(ownerEmail);
  await page.getByLabel('Password').fill(password);
  const registerPromise = page.waitForResponse(response =>
    response.url() === API + '/api/v1/auth/register' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  const registered = await registerPromise;
  expect(registered.status()).toBe(201);
  expect((await registered.json()).authenticated).toBe(true);
  await expect(page).toHaveURL(/\/dashboard\/?$/);

  const me = await browserApi(page, 'GET', '/auth/me');
  expect(me.status).toBe(200);
  expect(me.body.email).toBe(ownerEmail);

  const refreshed = await browserApi(page, 'POST', '/auth/refresh');
  expect(refreshed.status).toBe(200);
  const meAfterRefresh = await browserApi(page, 'GET', '/auth/me');
  expect(meAfterRefresh.status).toBe(200);
  expect(meAfterRefresh.body.email).toBe(ownerEmail);

  // Public reset responses must not disclose whether an email exists.
  const existingRecovery = await browserApi(page, 'POST', '/auth/forgot-password', { email: ownerEmail });
  const unknownRecovery = await browserApi(page, 'POST', '/auth/forgot-password', {
    email: 'unknown-reset-' + unique + '@example.com',
  });
  expect(existingRecovery.status).toBe(202);
  expect(unknownRecovery.status).toBe(202);
  expect(existingRecovery.body.message).toBe(unknownRecovery.body.message);
  expect(existingRecovery.body.message).toMatch(/If an account exists/i);

  const invalidReset = await browserApi(page, 'POST', '/auth/reset-password', {
    token: 'invalid-reset-token-' + unique + '-0123456789abcdef',
    new_password: 'Northstar-New-Password!2026',
  });
  expect(invalidReset.status).toBe(400);
  expect(invalidReset.body.error.code).toBe('invalid_reset_token');

  // Exercise the real recovery screens as a user, including invalid/expired one-time token errors.
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(ownerEmail);
  await page.getByRole('button', { name: 'Send reset link', exact: true }).click();
  await expect(page.locator('.success-banner')).toContainText(/If an account exists/i);
  await capture(page, '22-password-reset-request.png');

  const uiResetToken = 'invalid-ui-reset-' + unique + '-0123456789abcdef';
  await page.goto('/reset-password#token=' + encodeURIComponent(uiResetToken));
  await page.getByLabel('New password').fill('Northstar-Reset-UI!2026');
  await page.getByLabel('Confirm password').fill('Northstar-Reset-UI!2026');
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('');
  await page.getByRole('button', { name: 'Set new password', exact: true }).click();
  await expect(page.getByText(/password reset token is invalid or expired/i)).toBeVisible();
  await capture(page, '23-password-reset-invalid-token.png');

  const uiVerificationToken = 'invalid-ui-verification-' + unique + '-0123456789abcdef';
  await page.goto('/verify-email#token=' + encodeURIComponent(uiVerificationToken));
  await page.getByLabel('Choose password').fill('Northstar-Verify-UI!2026');
  await page.getByLabel('Confirm password').fill('Northstar-Verify-UI!2026');
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('');
  await page.getByRole('button', { name: 'Verify email and set password', exact: true }).click();
  await expect(page.getByText(/email verification link is invalid or expired/i)).toBeVisible();
  await capture(page, '24-email-verification-invalid-token.png');

  // Create a customer and exercise real upload, metadata update, checksum-protected download and deletion.
  const customerResponse = await browserApi(page, 'POST', '/customers', {
    name: 'Extended QA Customer ' + unique,
    email: 'customer-' + unique + '@example.com',
    kind: 'commercial',
  });
  expect(customerResponse.status).toBe(201);
  const customer = customerResponse.body;

  const fileContent = 'Northstar test attachment ' + unique;
  const expectedSha256 = createHash('sha256').update(fileContent).digest('hex');
  const upload = await page.evaluate(async ({ api, customerId, content }) => {
    const form = new FormData();
    form.append('file', new Blob([content], { type: 'text/plain' }), 'agreement-e2e.txt');
    form.append('description', 'Created by isolated end-to-end testing');
    const response = await fetch(api + '/api/v1/attachments/customer/' + customerId, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    return { status: response.status, body: await response.json() };
  }, { api: API, customerId: customer.id, content: fileContent });
  expect(upload.status).toBe(201);
  expect(upload.body.sha256).toBe(expectedSha256);
  expect(upload.body.size_bytes).toBe(Buffer.byteLength(fileContent));
  const attachmentId = upload.body.id;

  const attachmentList = await browserApi(page, 'GET',
    '/attachments?entity_type=customer&entity_id=' + encodeURIComponent(customer.id));
  expect(attachmentList.status).toBe(200);
  expect(attachmentList.body.map(item => item.id)).toContain(attachmentId);

  const attachmentUpdate = await browserApi(page, 'PATCH', '/attachments/' + attachmentId, {
    description: 'Updated description after upload',
  });
  expect(attachmentUpdate.status).toBe(200);
  expect(attachmentUpdate.body.description).toBe('Updated description after upload');

  const download = await page.evaluate(async ({ api, id }) => {
    const response = await fetch(api + '/api/v1/attachments/' + id + '/download', {
      credentials: 'include',
    });
    return {
      status: response.status,
      content: await response.text(),
      checksum: response.headers.get('x-attachment-sha256'),
    };
  }, { api: API, id: attachmentId });
  expect(download.status).toBe(200);
  expect(download.content).toBe(fileContent);
  expect(download.checksum).toBe(expectedSha256);

  // Use an independent tenant to prove that attachment and webhook IDs cannot cross company boundaries.
  const secondOwnerResponse = await request.post(API + '/api/v1/auth/register', {
    data: {
      company_name: 'Bluewater Service Group ' + unique,
      full_name: 'Isolated Tenant Owner',
      email: 'bluewater-tenant-' + unique + '@example.com',
      password: 'Northstar-Second-Tenant!2026',
    },
  });
  expect(secondOwnerResponse.status()).toBe(201);
  const secondOwner = await secondOwnerResponse.json();
  const secondOwnerHeaders = { Authorization: 'Bearer ' + secondOwner.access_token };

  const crossTenantAttachment = await request.get(API + '/api/v1/attachments/' + attachmentId, {
    headers: secondOwnerHeaders,
  });
  expect(crossTenantAttachment.status()).toBe(404);

  const attachmentDelete = await browserApi(page, 'DELETE', '/attachments/' + attachmentId);
  expect(attachmentDelete.status).toBe(200);
  expect(attachmentDelete.body.status).toBe('deleted');
  expect((await browserApi(page, 'GET', '/attachments/' + attachmentId)).status).toBe(404);
  expect((await browserApi(page, 'GET', '/attachments/' + attachmentId + '/download')).status).toBe(404);

  // Webhook management and secret safety. No external receiver is contacted by this test.
  const insecureWebhook = await browserApi(page, 'POST', '/webhooks', {
    name: 'Insecure endpoint ' + unique,
    url: 'http://example.com/webhook',
    events: ['customer.created'],
  });
  expect(insecureWebhook.status).toBe(422);

  const webhookResponse = await browserApi(page, 'POST', '/webhooks', {
    name: 'QA endpoint ' + unique,
    url: 'https://example.com/service-agreement-manager-hook',
    events: ['customer.created', 'payment.received'],
  });
  expect(webhookResponse.status).toBe(201);
  expect(webhookResponse.body.secret).toBeTruthy();
  const firstSecret = webhookResponse.body.secret;
  const webhookId = webhookResponse.body.id;

  const webhookList = await browserApi(page, 'GET', '/webhooks');
  expect(webhookList.status).toBe(200);
  expect(JSON.stringify(webhookList.body)).not.toContain(firstSecret);
  expect(webhookList.body.find(item => item.id === webhookId)).toBeTruthy();

  const crossTenantWebhook = await request.get(API + '/api/v1/webhooks/' + webhookId, {
    headers: secondOwnerHeaders,
  });
  expect(crossTenantWebhook.status()).toBe(404);

  const rotation = await browserApi(page, 'POST', '/webhooks/' + webhookId + '/rotate-secret');
  expect(rotation.status).toBe(200);
  expect(rotation.body.secret).toBeTruthy();
  expect(rotation.body.secret).not.toBe(firstSecret);
  // Capture an actually active endpoint in the real integrations UI, after the secret rotation.
  await page.goto('/integrations');
  await expect(page.locator('h1').first()).toBeVisible();
  await page.getByRole('button', { name: 'Webhooks', exact: true }).click();
  const webhookRow = page.locator('tr').filter({ hasText: 'QA endpoint ' + unique });
  await expect(webhookRow).toBeVisible();
  await expect(webhookRow).toContainText('Active');
  await expect(page.locator('body')).not.toContainText('Internal Server Error');
  await capture(page, '20-integrations-webhooks.png');

  const webhookDelete = await browserApi(page, 'DELETE', '/webhooks/' + webhookId);
  expect(webhookDelete.status).toBe(200);
  expect(webhookDelete.body.is_active).toBe(false);

  // Exercise a complete invoice adjustment sequence against the same browser-cookie session.
  const locationResponse = await browserApi(page, 'POST',
    '/customers/' + customer.id + '/service-locations', {
      name: 'Extended QA billing site ' + unique,
      address_line1: '50 Verification Avenue',
      city: 'Austin',
      region: 'TX',
      postal_code: '78701',
      country_code: 'US',
    });
  expect(locationResponse.status).toBe(201);
  const location = locationResponse.body;
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const invoiceResponse = await browserApi(page, 'POST', '/invoices', {
    customer_id: customer.id,
    service_location_id: location.id,
    invoice_date: today,
    due_date: dueDate,
    lines: [{
      service_code: 'QA-' + unique.slice(-8),
      description: 'Extended integration invoice',
      quantity: '1',
      unit_price: '100.00',
    }],
  });
  expect(invoiceResponse.status).toBe(201);
  const invoice = invoiceResponse.body;
  expect(Number(invoice.total_amount)).toBe(100);
  expect(invoice.status).toBe('draft');

  const issued = await browserApi(page, 'POST', '/invoices/' + invoice.id + '/issue');
  expect(issued.status).toBe(200);
  expect(issued.body.status).toBe('issued');

  const partialKey = 'pay-partial-' + unique;
  const partialPayload = { amount: '30.00', payment_method: 'bank_transfer', reference: 'QA-PARTIAL-' + unique };
  const partialPayment = await browserApi(page, 'POST',
    '/invoices/' + invoice.id + '/payments', partialPayload, { 'Idempotency-Key': partialKey });
  expect(partialPayment.status).toBe(201);
  const partialReplay = await browserApi(page, 'POST',
    '/invoices/' + invoice.id + '/payments', partialPayload, { 'Idempotency-Key': partialKey });
  expect(partialReplay.status).toBe(200);
  expect(partialReplay.body.id).toBe(partialPayment.body.id);

  const changedReplay = await browserApi(page, 'POST', '/invoices/' + invoice.id + '/payments', {
    ...partialPayload,
    amount: '31.00',
  }, { 'Idempotency-Key': partialKey });
  expect(changedReplay.status).toBe(409);
  const overpayment = await browserApi(page, 'POST', '/invoices/' + invoice.id + '/payments', {
    amount: '70.01',
    payment_method: 'bank_transfer',
    reference: 'QA-OVERPAY-' + unique,
  }, { 'Idempotency-Key': 'pay-over-' + unique });
  expect(overpayment.status).toBe(409);
  expect(overpayment.body.error.code).toBe('overpayment');

  const partialInvoiceRead = await browserApi(page, 'GET', '/invoices/' + invoice.id);
  expect(partialInvoiceRead.status).toBe(200);
  expect(partialInvoiceRead.body.status).toBe('partially_paid');
  expect(Number(partialInvoiceRead.body.amount_paid)).toBe(30);
  expect(Number(partialInvoiceRead.body.balance_due)).toBe(70);

  await page.goto('/invoices');
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
  await expect(page.getByText(invoice.invoice_number, { exact: true })).toBeVisible();
  await capture(page, '19-invoice-partially-paid.png');

  // Complete the invoice using the visible UI, not only the API helper.
  await page.locator('button.table-link').filter({ hasText: invoice.invoice_number }).click();
  let invoiceDialog = page.getByRole('dialog').last();
  await expect(invoiceDialog).toContainText(invoice.invoice_number);
  await invoiceDialog.getByRole('button', { name: 'Record payment', exact: true }).click();
  const paymentDialog = page.getByRole('dialog').last();
  await paymentDialog.getByLabel('Amount').fill('70.00');
  await paymentDialog.getByLabel('Reference').fill('QA-UI-FINAL-' + unique);
  await paymentDialog.getByRole('button', { name: 'Record payment', exact: true }).click();
  await expect.poll(async () => (await browserApi(page, 'GET', '/invoices/' + invoice.id)).body.status).toBe('paid');

  // Refund a small amount through the UI, explicitly selecting the original $30 payment.
  invoiceDialog = page.getByRole('dialog').last();
  await invoiceDialog.getByRole('button', { name: 'Refund payment', exact: true }).click();
  const refundDialog = page.getByRole('dialog').last();
  await refundDialog.getByLabel('Payment').selectOption(partialPayment.body.id);
  await refundDialog.getByLabel('Amount').fill('5.00');
  await refundDialog.getByLabel('Reason').fill('UI refund regression check');
  await refundDialog.getByRole('button', { name: 'Refund payment', exact: true }).click();
  await expect.poll(async () => Number((await browserApi(page, 'GET', '/invoices/' + invoice.id)).body.balance_due)).toBe(5);

  // Repeat a second refund through the API to verify idempotency and reject an over-refund.
  const refundRoute = '/invoices/' + invoice.id + '/payments/' + partialPayment.body.id + '/refunds';
  const refundPayload = {
    amount: '5.00',
    refund_method: 'bank_transfer',
    reference: 'QA-REFUND-' + unique,
    reason: 'Verify refund idempotency in E2E',
  };
  const refundKey = 'refund-' + unique;
  const refund = await browserApi(page, 'POST', refundRoute, refundPayload, { 'Idempotency-Key': refundKey });
  expect(refund.status).toBe(201);
  const refundReplay = await browserApi(page, 'POST', refundRoute, refundPayload, { 'Idempotency-Key': refundKey });
  expect(refundReplay.status).toBe(200);
  expect(refundReplay.body.id).toBe(refund.body.id);
  const excessRefund = await browserApi(page, 'POST', refundRoute, {
    ...refundPayload,
    amount: '21.00',
  }, { 'Idempotency-Key': 'refund-excess-' + unique });
  expect(excessRefund.status).toBe(409);
  expect(excessRefund.body.error.code).toBe('refund_exceeds_payment');

  const excessiveCredit = await browserApi(page, 'POST', '/invoices/' + invoice.id + '/credits', {
    amount: '11.00', reason: 'Deliberately exceeds remaining invoice balance',
  }, { 'Idempotency-Key': 'credit-excess-' + unique });
  expect(excessiveCredit.status).toBe(409);
  expect(excessiveCredit.body.error.code).toBe('credit_exceeds_balance');

  // Apply a credit through the UI and a second credit through the API to test idempotent replay.
  invoiceDialog = page.getByRole('dialog').last();
  await invoiceDialog.getByRole('button', { name: 'Add credit', exact: true }).click();
  const creditDialog = page.getByRole('dialog').last();
  await creditDialog.getByLabel('Amount').fill('5.00');
  await creditDialog.getByLabel('Reason').fill('UI credit regression check');
  await creditDialog.getByRole('button', { name: 'Apply credit', exact: true }).click();
  await expect.poll(async () => Number((await browserApi(page, 'GET', '/invoices/' + invoice.id)).body.balance_due)).toBe(5);

  const creditPayload = { amount: '5.00', reason: 'Verify credit idempotency in E2E' };
  const creditKey = 'credit-' + unique;
  const credit = await browserApi(page, 'POST', '/invoices/' + invoice.id + '/credits',
    creditPayload, { 'Idempotency-Key': creditKey });
  expect(credit.status).toBe(201);
  const creditReplay = await browserApi(page, 'POST', '/invoices/' + invoice.id + '/credits',
    creditPayload, { 'Idempotency-Key': creditKey });
  expect(creditReplay.status).toBe(200);
  expect(creditReplay.body.id).toBe(credit.body.id);
  const reconciledInvoice = await browserApi(page, 'GET', '/invoices/' + invoice.id);
  expect(reconciledInvoice.status).toBe(200);
  expect(Number(reconciledInvoice.body.balance_due)).toBe(0);
  expect(Number(reconciledInvoice.body.amount_refunded)).toBe(10);
  expect(Number(reconciledInvoice.body.credits_applied)).toBe(10);
  expect(reconciledInvoice.body.status).toBe('paid');

  // Leave visible evidence of payment, refund and credit history in the invoice details UI.
  invoiceDialog = page.getByRole('dialog').last();
  await invoiceDialog.getByRole('button', { name: 'Payments & activity', exact: true }).click();
  await expect(invoiceDialog.getByText('UI refund regression check')).toBeVisible();
  await expect(invoiceDialog.getByText('UI credit regression check')).toBeVisible();
  await capture(page, '25-invoice-adjustments-ui.png');

  // PDF generation and the invalid void -> issue transition.
  const pdf = await page.evaluate(async ({ api, id }) => {
    const response = await fetch(api + '/api/v1/invoices/' + id + '/pdf', {
      credentials: 'include',
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      status: response.status,
      contentType: response.headers.get('content-type'),
      prefix: Array.from(bytes.slice(0, 4)).map(value => String.fromCharCode(value)).join(''),
    };
  }, { api: API, id: invoice.id });
  expect(pdf.status).toBe(200);
  expect(pdf.contentType).toContain('application/pdf');
  expect(pdf.prefix).toBe('%PDF');

  const voidDraft = await browserApi(page, 'POST', '/invoices', {
    customer_id: customer.id,
    service_location_id: location.id,
    invoice_date: today,
    due_date: dueDate,
    lines: [{
      service_code: 'VOID-' + unique.slice(-8),
      description: 'Draft for void transition',
      quantity: '1',
      unit_price: '5.00',
    }],
  });
  expect(voidDraft.status).toBe(201);
  const voided = await browserApi(page, 'POST', '/invoices/' + voidDraft.body.id + '/void', {
    reason: 'Synthetic E2E void verification',
  });
  expect(voided.status).toBe(200);
  expect(voided.body.status).toBe('void');
  const issueVoided = await browserApi(page, 'POST', '/invoices/' + voidDraft.body.id + '/issue');
  expect(issueVoided.status).toBe(409);

  // Revoke the browser session and prove the same cookie cannot authenticate afterward.
  const logout = await browserApi(page, 'POST', '/auth/logout');
  expect(logout.status).toBe(204);
  expect((await browserApi(page, 'GET', '/auth/me')).status).toBe(401);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\/?$/);
  await expect(page.locator('h1').first()).toBeVisible();
  await capture(page, '21-session-after-logout.png');

  expect(pageErrors, 'Unexpected uncaught browser errors: ' + pageErrors.join(' | ')).toEqual([]);
  test.info().annotations.push({
    type: 'synthetic-data',
    description: 'The database and local attachment files are ephemeral CI test data; no real providers are contacted.',
  });
});
