import type {
  Agreement,
  AgreementPortal,
  Branch,
  Company,
  Contact,
  Customer,
  Equipment,
  Invoice,
  RenewalOffer,
  ServiceCatalogItem,
  ServiceLocation,
  AuthSession,
  RegistrationPending,
  User,
  WorkOrder,
} from "../types";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "")
).replace(/\/$/, "");
const PREFIX = "/api/v1";
let refreshPromise: Promise<boolean> | null = null;

const NO_REFRESH_RETRY = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/change-password",
  "/auth/verify-email",
  "/auth/resend-verification",
]);

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(API_URL + PREFIX + "/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function normalizedPath(path: string): string {
  return path.startsWith("/") ? path : "/" + path;
}

function notifySessionExpired(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sam:session-expired"));
  }
}

async function parseError(response: Response) {
  let message = `Request failed (${response.status})`;

  try {
    const body = (await response.json()) as {
      error?: { message?: string };
      detail?: string | { message?: string };
    };
    message =
      body.error?.message ||
      (typeof body.detail === "string"
        ? body.detail
        : body.detail?.message) ||
      message;
  } catch {}

  return new Error(message);
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const requestPath = normalizedPath(path);
  const headers = new Headers(options.headers);

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(API_URL + PREFIX + requestPath, {
    ...options,
    headers,
    credentials: "include",
  });

  if (
    response.status === 401 &&
    retry &&
    !NO_REFRESH_RETRY.has(requestPath)
  ) {
    if (await refreshSession()) return api<T>(path, options, false);
    notifySessionExpired();
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiBlob(path: string, retry = true): Promise<Blob> {
  const requestPath = normalizedPath(path);
  const response = await fetch(API_URL + PREFIX + requestPath, {
    credentials: "include",
  });

  if (response.status === 401 && retry) {
    if (await refreshSession()) return apiBlob(path, false);
    notifySessionExpired();
  }

  if (!response.ok) throw await parseError(response);
  return response.blob();
}

async function publicApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const requestPath = normalizedPath(path);
  const headers = new Headers(options.headers);

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(API_URL + PREFIX + requestPath, {
    ...options,
    headers,
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const endpoints = {
  auth: {
    register: (b: unknown) =>
      api<AuthSession | RegistrationPending>("/auth/register", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    login: (b: unknown) =>
      api<AuthSession>("/auth/login", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    verifyEmail: (b: unknown) =>
      api<void>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    resendVerification: (b: unknown) =>
      api<RegistrationPending>("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    me: () => api<User>("/auth/me"),
    logout: () => api<void>("/auth/logout", { method: "POST" }),
    changePassword: (b: unknown) =>
      api<void>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    forgotPassword: (b: unknown) =>
      api<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    resetPassword: (b: unknown) =>
      api<void>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(b),
      }),
  },
  company: {
    get: () => api<Company>("/companies/current"),
    update: (b: unknown) =>
      api<Company>("/companies/current", {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
  },
  users: {
    list: (q = "") => api<User[]>(`/users${q ? `?${q}` : ""}`),
    create: (b: unknown) =>
      api<User>("/users", { method: "POST", body: JSON.stringify(b) }),
    update: (id: string, b: unknown) =>
      api<User>(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
    resetPassword: (id: string, b: unknown) =>
      api<User>(`/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify(b),
      }),
  },
  customers: {
    list: (q = "") => api<Customer[]>(`/customers${q ? `?${q}` : ""}`),
    get: (id: string) => api<Customer>(`/customers/${id}`),
    create: (b: unknown) =>
      api<Customer>("/customers", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    update: (id: string, b: unknown) =>
      api<Customer>(`/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
    deactivate: (id: string) =>
      api<void>(`/customers/${id}`, { method: "DELETE" }),
    contacts: (id: string) => api<Contact[]>(`/customers/${id}/contacts`),
    addContact: (id: string, b: unknown) =>
      api<Contact>(`/customers/${id}/contacts`, {
        method: "POST",
        body: JSON.stringify(b),
      }),
    locations: (id: string) =>
      api<ServiceLocation[]>(`/customers/${id}/service-locations`),
    addLocation: (id: string, b: unknown) =>
      api<ServiceLocation>(`/customers/${id}/service-locations`, {
        method: "POST",
        body: JSON.stringify(b),
      }),
  },
  equipment: {
    get: (id: string) => api<Equipment>(`/equipment/${id}`),
    list: (q = "") => api<Equipment[]>(`/equipment${q ? `?${q}` : ""}`),
    create: (b: unknown) =>
      api<Equipment>("/equipment", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    update: (id: string, b: unknown) =>
      api<Equipment>(`/equipment/${id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
  },
  catalog: {
    get: (id: string) => api<ServiceCatalogItem>(`/service-catalog/${id}`),
    list: (q = "") =>
      api<ServiceCatalogItem[]>(`/service-catalog${q ? `?${q}` : ""}`),
    create: (b: unknown) =>
      api<ServiceCatalogItem>("/service-catalog", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    update: (id: string, b: unknown) =>
      api<ServiceCatalogItem>(`/service-catalog/${id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
  },
  agreements: {
    list: (q = "") => api<Agreement[]>(`/agreements${q ? `?${q}` : ""}`),
    get: (id: string) => api<Agreement>(`/agreements/${id}`),
    create: (b: unknown) =>
      api<Agreement>("/agreements", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    update: (id: string, b: unknown) =>
      api<Agreement>(`/agreements/${id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
    action: (id: string, action: string, b?: unknown) =>
      api<Agreement>(`/agreements/${id}/${action}`, {
        method: "POST",
        ...(b === undefined ? {} : { body: JSON.stringify(b) }),
      }),
    versions: (id: string) => api<unknown[]>(`/agreements/${id}/versions`),
    events: (id: string) => api<unknown[]>(`/agreements/${id}/events`),
    renewals: (id: string) => api<RenewalOffer[]>(`/agreements/${id}/renewals`),
    createRenewal: (id: string, b: unknown) =>
      api<RenewalOffer>(`/agreements/${id}/renewals`, {
        method: "POST",
        body: JSON.stringify(b),
      }),
    renewalAction: (
      id: string,
      renewalId: string,
      action: string,
      b?: unknown,
    ) =>
      api<unknown>(`/agreements/${id}/renewals/${renewalId}/${action}`, {
        method: "POST",
        ...(b === undefined ? {} : { body: JSON.stringify(b) }),
      }),
  },
  workOrders: {
    get: (id: string) => api<WorkOrder>(`/work-orders/${id}`),
    events: (id: string) => api<unknown[]>(`/work-orders/${id}/events`),
    list: (q = "") => api<WorkOrder[]>(`/work-orders${q ? `?${q}` : ""}`),
    create: (b: unknown) =>
      api<WorkOrder>("/work-orders", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    update: (id: string, b: unknown) =>
      api<WorkOrder>(`/work-orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
    action: (id: string, action: string, b?: unknown) =>
      api<WorkOrder>(`/work-orders/${id}/${action}`, {
        method: "POST",
        ...(b === undefined ? {} : { body: JSON.stringify(b) }),
      }),
  },
  schedules: {
    list: (q = "") =>
      api<unknown[]>(`/maintenance/schedules${q ? `?${q}` : ""}`),
    create: (b: unknown) =>
      api<unknown>("/maintenance/schedules", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    update: (id: string, b: unknown) =>
      api<unknown>(`/maintenance/schedules/${id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
    generate: (id: string, b: unknown) =>
      api<WorkOrder>(`/maintenance/schedules/${id}/generate`, {
        method: "POST",
        body: JSON.stringify(b),
      }),
  },
  invoices: {
    list: (q = "") => api<Invoice[]>(`/invoices${q ? `?${q}` : ""}`),
    get: (id: string) => api<Invoice>(`/invoices/${id}`),
    create: (b: unknown) =>
      api<Invoice>("/invoices", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    update: (id: string, b: unknown) =>
      api<Invoice>(`/invoices/${id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
    action: (
      id: string,
      action: string,
      b?: unknown,
      idempotencyKey?: string,
    ) =>
      api<unknown>(`/invoices/${id}/${action}`, {
        method: "POST",
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
        ...(b === undefined ? {} : { body: JSON.stringify(b) }),
      }),
    payments: (id: string) => api<unknown[]>(`/invoices/${id}/payments`),
    refunds: (id: string, paymentId: string) =>
      api<unknown[]>(`/invoices/${id}/payments/${paymentId}/refunds`),
    credits: (id: string) => api<unknown[]>(`/invoices/${id}/credits`),
    events: (id: string) => api<unknown[]>(`/invoices/${id}/events`),
  },
  branches: {
    get: (id: string) => api<Branch>(`/branches/${id}`),
    list: (q = "") => api<Branch[]>(`/branches${q ? `?${q}` : ""}`),
    create: (b: unknown) =>
      api<Branch>("/branches", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    update: (id: string, b: unknown) =>
      api<Branch>(`/branches/${id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
    hours: (id: string) => api<unknown[]>(`/branches/${id}/business-hours`),
    replaceHours: (id: string, b: unknown) =>
      api<unknown[]>(`/branches/${id}/business-hours`, {
        method: "PUT",
        body: JSON.stringify(b),
      }),
    closures: (id: string) => api<unknown[]>(`/branches/${id}/closures`),
    addClosure: (id: string, b: unknown) =>
      api<unknown>(`/branches/${id}/closures`, {
        method: "POST",
        body: JSON.stringify(b),
      }),
    deleteClosure: (id: string, closureId: string) =>
      api<void>(`/branches/${id}/closures/${closureId}`, {
        method: "DELETE",
      }),
  },
  imports: {
    getCustomerImport: (id: string) =>
      api<unknown>(`/customers/imports/${id}`),
    updateCustomerImportRow: (
      jobId: string,
      rowId: string,
      body: unknown,
    ) =>
      api<unknown>(`/customers/imports/${jobId}/rows/${rowId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    previewCustomers: (rows: unknown[]) =>
      api<unknown>("/customers/imports/preview", {
        method: "POST",
        body: JSON.stringify({ rows }),
      }),
    createCustomers: (rows: unknown[], key?: string) =>
      api<unknown>("/customers/imports", {
        method: "POST",
        headers: key ? { "Idempotency-Key": key } : undefined,
        body: JSON.stringify({ rows }),
      }),
    listCustomers: () => api<unknown[]>("/customers/imports"),
    retryCustomers: (id: string) =>
      api<unknown>(`/customers/imports/${id}/retry`, { method: "POST" }),
  },
  agreementPortal: {
    get: (token: string) =>
      publicApi<AgreementPortal>(
        `/agreement-portal/public/${encodeURIComponent(token)}`,
      ),
    respond: (
      token: string,
      body: {
        decision: "accept" | "reject";
        acceptance_confirmation?: boolean;
        rejection_reason?: string | null;
      },
    ) =>
      publicApi<AgreementPortal>(
        `/agreement-portal/public/${encodeURIComponent(token)}/respond`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    send: (
      agreementId: string,
      body: { contact_id?: string | null },
    ) =>
      api<{
        notification_id: string;
        notification_status: string;
        recipient_name: string;
        recipient_email: string;
        agreement_version: number;
        expires_at: string;
      }>(`/agreement-portal/agreements/${agreementId}/send`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  notifications: {
    get: (id: string) => api<unknown>(`/notifications/${id}`),
    list: (q = "") => api<unknown[]>(`/notifications${q ? `?${q}` : ""}`),
    create: (b: unknown, key: string) =>
      api<unknown>("/notifications", {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify(b),
      }),
    retry: (id: string) =>
      api<unknown>(`/notifications/${id}/retry`, { method: "POST" }),
    attempts: (id: string) =>
      api<unknown[]>(`/notifications/${id}/attempts`),
  },
  sms: {
    list: () => api<unknown[]>("/sms"),
    create: (b: unknown, key: string) =>
      api<unknown>("/sms", {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify(b),
      }),
  },
  webhooks: {
    list: () => api<unknown[]>("/webhooks"),
    get: (id: string) => api<unknown>(`/webhooks/${id}`),
    create: (b: unknown) =>
      api<unknown>("/webhooks", { method: "POST", body: JSON.stringify(b) }),
    update: (id: string, b: unknown) =>
      api<unknown>(`/webhooks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
    rotate: (id: string) =>
      api<unknown>(`/webhooks/${id}/rotate-secret`, { method: "POST" }),
    deactivate: (id: string) =>
      api<unknown>(`/webhooks/${id}`, { method: "DELETE" }),
    deliveries: (id: string) =>
      api<unknown[]>(`/webhooks/${id}/deliveries`),
    delivery: (id: string) =>
      api<unknown>(`/webhooks/deliveries/${id}`),
    attempts: (id: string) =>
      api<unknown[]>(`/webhooks/deliveries/${id}/attempts`),
    retryDelivery: (id: string) =>
      api<unknown>(`/webhooks/deliveries/${id}/retry`, { method: "POST" }),
  },
  attachments: {
    get: (id: string) => api<unknown>(`/attachments/${id}`),
    update: (id: string, b: unknown) =>
      api<unknown>(`/attachments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
    list: (entityType: string, entityId: string) =>
      api<unknown[]>(
        `/attachments?entity_type=${entityType}&entity_id=${entityId}&limit=100`,
      ),
    upload: (
      entityType: string,
      entityId: string,
      file: File,
      description?: string,
    ) => {
      const form = new FormData();
      form.append("file", file);
      if (description) form.append("description", description);
      return api<unknown>(`/attachments/${entityType}/${entityId}`, {
        method: "POST",
        body: form,
      });
    },
    download: (id: string) => apiBlob(`/attachments/${id}/download`),
    remove: (id: string) =>
      api<unknown>(`/attachments/${id}`, { method: "DELETE" }),
  },
  recurring: {
    list: () => api<unknown[]>("/recurring-invoices"),
    create: (b: unknown) =>
      api<unknown>("/recurring-invoices", {
        method: "POST",
        body: JSON.stringify(b),
      }),
    action: (id: string, action: string, b?: unknown) =>
      api<unknown>(`/recurring-invoices/${id}/${action}`, {
        method: "POST",
        ...(b === undefined ? {} : { body: JSON.stringify(b) }),
      }),
    update: (id: string, b: unknown) =>
      api<unknown>(`/recurring-invoices/${id}`, {
        method: "PATCH",
        body: JSON.stringify(b),
      }),
  },
  exports: {
    customers: () => apiBlob("/exports/customers.csv"),
    invoices: () => apiBlob("/exports/invoices.csv"),
    workOrders: () => apiBlob("/exports/work-orders.csv"),
    agreements: () => apiBlob("/exports/agreements.csv"),
  },
  reports: {
    agreementSummary: () => api<unknown>("/reports/agreements/summary"),
    receivables: () => api<unknown>("/reports/billing/receivables"),
    workOrders: () => api<unknown>("/reports/work-orders"),
  },
  stripe: {
    createPaymentIntent: (invoiceId: string, idempotencyKey: string) =>
      api<unknown>(`/invoices/${invoiceId}/stripe-payment-intent`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ idempotency_key: idempotencyKey }),
      }),
    confirmPayment: (
      invoiceId: string,
      paymentIntentId: string,
      idempotencyKey: string,
    ) =>
      api<unknown>(`/invoices/${invoiceId}/stripe-confirm`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          idempotency_key: idempotencyKey,
        }),
      }),
    webhook: () => api<unknown>("/invoices/stripe/webhook", { method: "POST" }),
  },
};
