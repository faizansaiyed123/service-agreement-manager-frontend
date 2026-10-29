import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiBlob, endpoints } from "../lib/api";
import type { Customer, Invoice, ServiceLocation, User } from "../types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  TextArea,
} from "../components/ui";
import { Attachments } from "../components/Attachments";
const money = (value: string, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    Number(value),
  );

const statusTone = (status: Invoice["status"]) =>
  status === "paid"
    ? "success"
    : status === "void"
      ? "danger"
      : status === "overdue"
        ? "danger"
        : status === "partially_paid"
          ? "warning"
          : "info";

const key = () => `sam-${crypto.randomUUID()}`;

export function InvoicesPage() {
  const { user } = useOutletContext<{ user: User | null }>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    Promise.all([
      endpoints.invoices.list("limit=100"),
      endpoints.customers.list("limit=100"),
    ])
      .then(([i, c]) => {
        setInvoices(i);
        setCustomers(c);
      })
      .catch((c) =>
        setError(c instanceof Error ? c.message : "Unable to load invoices"),
      )
      .finally(() => setLoading(false));
  }, []);

  const visible = filter
    ? invoices.filter((item) => item.status === filter)
    : invoices;

  async function refresh() {
    setInvoices(await endpoints.invoices.list("limit=100"));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        description="Issue invoices, collect payments, apply credits, refund safely and download customer-ready PDFs."
        actions={
          <Button onClick={() => setCreateOpen(true)}>New invoice</Button>
        }
      />
      <div className="filter-bar">
        <Select
          aria-label="Filter invoices"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="partially_paid">Partially paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="void">Void</option>
        </Select>
        <div className="filter-summary">{visible.length} invoices</div>
      </div>
      {error && <div className="error-banner page-error">{error}</div>}
      <Card>
        {loading ? (
          <div className="center-load">
            <Spinner />
          </div>
        ) : visible.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Due</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        className="table-link"
                        onClick={() => setSelected(item)}
                      >
                        <strong>{item.invoice_number}</strong>
                        <span>{item.invoice_date}</span>
                      </button>
                    </td>
                    <td>
                      {customers.find((c) => c.id === item.customer_id)?.name ||
                        "Customer"}
                    </td>
                    <td>{item.due_date}</td>
                    <td>{money(item.total_amount, item.currency)}</td>
                    <td>
                      <strong>{money(item.balance_due, item.currency)}</strong>
                    </td>
                    <td>
                      <Badge tone={statusTone(item.status)}>
                        {item.is_overdue ? "Overdue" : item.status}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setSelected(item)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No invoices"
            description="Create a draft invoice to begin the billing lifecycle."
          />
        )}
      </Card>
      {createOpen && (
        <InvoiceCreateModal
          customers={customers}
          onClose={() => setCreateOpen(false)}
          onCreated={(invoice) => {
            setInvoices((current) => [invoice, ...current]);
            setCreateOpen(false);
            setSelected(invoice);
          }}
        />
      )}
      {selected && (
        <InvoiceDetail
          invoice={selected}
          onClose={() => setSelected(null)}
          onChanged={async () => {
            await refresh();
            const fresh = await endpoints.invoices.get(selected.id);
            setSelected(fresh);
          }}
          canSendPaymentLink={Boolean(
            user && ["owner", "admin", "manager", "billing"].includes(user.role),
          )}
        />
      )}
    </div>
  );
}

function InvoiceCreateModal({
  customers,
  onClose,
  onCreated,
}: {
  customers: Customer[];
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}) {
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [form, setForm] = useState({
    customerId: customers[0]?.id || "",
    locationId: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    notes: "",
    discount: "0",
    tax: "0",
    code: "SERVICE",
    description: "",
    quantity: "1",
    unitPrice: "0",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!form.customerId) return;
    endpoints.customers
      .locations(form.customerId)
      .then((items) => {
        setLocations(items);
        setForm((current) => ({
          ...current,
          locationId: items[0]?.id || "",
        }));
      })
      .catch((c) =>
        setError(c instanceof Error ? c.message : "Unable to load service locations"),
      );
  }, [form.customerId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      onCreated(
        await endpoints.invoices.create({
          customer_id: form.customerId,
          service_location_id: form.locationId || null,
          invoice_date: form.invoiceDate,
          due_date: form.dueDate,
          notes: form.notes || null,
          discount_percent: form.discount,
          tax_percent: form.tax,
          lines: [
            {
              service_code: form.code,
              description: form.description,
              quantity: form.quantity,
              unit_price: form.unitPrice,
            },
          ],
        }),
      );
    } catch (c) {
      setError(c instanceof Error ? c.message : "Unable to create invoice");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New invoice" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="form-two">
          <label>
            Customer
            <Select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Service location
            <Select
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
            >
              <option value="">None</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="form-two">
          <label>
            Invoice date
            <Input
              type="date"
              value={form.invoiceDate}
              onChange={(e) =>
                setForm({ ...form, invoiceDate: e.target.value })
              }
              required
            />
          </label>
          <label>
            Due date
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="form-three">
          <label>
            Service code
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
          </label>
          <label>
            Description
            <Input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              required
            />
          </label>
          <label>
            Unit price
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="form-three">
          <label>
            Discount %
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: e.target.value })}
            />
          </label>
          <label>
            Tax %
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.tax}
              onChange={(e) => setForm({ ...form, tax: e.target.value })}
            />
          </label>
          <div />
        </div>
        <label>
          Notes
          <TextArea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        {error && <div className="error-banner">{error}</div>}
        <Button disabled={busy}>
          {busy ? "Creating…" : "Create draft invoice"}
        </Button>
      </form>
    </Modal>
  );
}

type InvoicePaymentHistory = {
  id: string;
  amount: string;
  payment_method: string;
  reference: string | null;
  received_at: string;
  notes: string | null;
};
type InvoiceRefundHistory = {
  id: string;
  payment_id: string;
  amount: string;
  refund_method: string;
  reference: string | null;
  reason: string;
  refunded_at: string;
};
type InvoiceCreditHistory = {
  id: string;
  amount: string;
  reason: string;
  created_at: string;
};
type InvoiceEventHistory = {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
};

function InvoiceDetail({
  invoice,
  onClose,
  onChanged,
  canSendPaymentLink,
}: {
  invoice: Invoice;
  onClose: () => void;
  onChanged: () => Promise<void>;
  canSendPaymentLink: boolean;
}) {
  const [tab, setTab] = useState<"summary" | "payments">("summary");
  const [action, setAction] = useState<
    "payment" | "refund" | "credit" | "void" | "payment-link" | null
  >(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [history, setHistory] = useState<{
    payments: InvoicePaymentHistory[];
    refunds: InvoiceRefundHistory[];
    credits: InvoiceCreditHistory[];
    events: InvoiceEventHistory[];
  }>({ payments: [], refunds: [], credits: [], events: [] });

  useEffect(() => {
    if (tab !== "payments") return;
    let live = true;
    setHistoryLoading(true);
    setHistoryError("");

    Promise.all([
      endpoints.invoices.payments(invoice.id),
      endpoints.invoices.credits(invoice.id),
      endpoints.invoices.events(invoice.id),
    ])
      .then(async ([paymentData, creditData, eventData]) => {
        const payments = paymentData as InvoicePaymentHistory[];
        const refundGroups = await Promise.all(
          payments.map(async (payment) => {
            try {
              return (await endpoints.invoices.refunds(
                invoice.id,
                payment.id,
              )) as InvoiceRefundHistory[];
            } catch {
              return [];
            }
          }),
        );

        if (live) {
          setHistory({
            payments,
            refunds: refundGroups.flat(),
            credits: creditData as InvoiceCreditHistory[],
            events: eventData as InvoiceEventHistory[],
          });
        }
      })
      .catch((cause) => {
        if (live) {
          setHistoryError(
            cause instanceof Error
              ? cause.message
              : "Unable to load invoice history",
          );
        }
      })
      .finally(() => {
        if (live) setHistoryLoading(false);
      });

    return () => {
      live = false;
    };
  }, [tab, invoice.id, invoice.updated_at]);

  async function run(name: string, body?: unknown, idempotency = true) {
    setBusy(true);
    setError("");

    try {
      await endpoints.invoices.action(
        invoice.id,
        name,
        body,
        idempotency ? key() : undefined,
      );
      await onChanged();
      setAction(null);
    } catch (c) {
      setError(c instanceof Error ? c.message : "Billing action failed");
    } finally {
      setBusy(false);
    }
  }

  async function pdf() {
    setError("");

    try {
      const blob = await apiBlob(`/invoices/${invoice.id}/pdf`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${invoice.invoice_number}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (c) {
      setError(c instanceof Error ? c.message : "Unable to download PDF");
    }
  }

  return (
    <Modal title={invoice.invoice_number} onClose={onClose}>
      <div className="drawer-meta">
        <div>
          <strong>{invoice.invoice_number}</strong>
          <span className="muted">
            Issued{" "}
            {invoice.issued_at
              ? new Date(invoice.issued_at).toLocaleDateString()
              : "Draft"}
          </span>
        </div>
        <Badge tone={statusTone(invoice.status)}>
          {invoice.is_overdue ? "Overdue" : invoice.status}
        </Badge>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="tabs">
        <button
          className={tab === "summary" ? "tab active" : "tab"}
          onClick={() => setTab("summary")}
        >
          Invoice
        </button>
        <button
          className={tab === "payments" ? "tab active" : "tab"}
          onClick={() => setTab("payments")}
        >
          Payments & activity
        </button>
      </div>

      {tab === "summary" && (
        <div>
          <div className="invoice-summary-grid">
            <div>
              <span className="eyebrow">Subtotal</span>
              <strong>{money(invoice.subtotal, invoice.currency)}</strong>
            </div>
            <div>
              <span className="eyebrow">Tax</span>
              <strong>{money(invoice.tax_amount, invoice.currency)}</strong>
            </div>
            <div>
              <span className="eyebrow">Total</span>
              <strong>{money(invoice.total_amount, invoice.currency)}</strong>
            </div>
            <div>
              <span className="eyebrow">Balance due</span>
              <strong>{money(invoice.balance_due, invoice.currency)}</strong>
            </div>
          </div>
          <Attachments entityType="invoice" entityId={invoice.id} />
          <div className="line-items">
            <strong>Line items</strong>
            {invoice.lines.map((line) => (
              <div className="list-row" key={line.id}>
                <div>
                  <strong>{line.description}</strong>
                  <span>
                    {line.service_code} · {line.quantity} × {line.unit_price}
                  </span>
                </div>
                <strong>{money(line.line_total, invoice.currency)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "payments" && (
        <div>
          <div className="detail-grid">
            <div>
              <span className="eyebrow">Net paid</span>
              <strong>{money(invoice.amount_paid, invoice.currency)}</strong>
            </div>
            <div>
              <span className="eyebrow">Refunded</span>
              <strong>{money(invoice.amount_refunded, invoice.currency)}</strong>
            </div>
            <div>
              <span className="eyebrow">Credits applied</span>
              <strong>{money(invoice.credits_applied, invoice.currency)}</strong>
            </div>
            <div>
              <span className="eyebrow">Balance due</span>
              <strong>{money(invoice.balance_due, invoice.currency)}</strong>
            </div>
          </div>
          {historyError && <div className="error-banner">{historyError}</div>}
          {historyLoading ? (
            <div className="center-load">
              <Spinner />
            </div>
          ) : (
            <div className="invoice-history-grid">
              <section className="invoice-history-card">
                <div className="invoice-history-heading">
                  <h3>Payments</h3>
                  <span>{history.payments.length}</span>
                </div>
                {history.payments.length ? (
                  <div className="invoice-history-list">
                    {history.payments.map((item) => (
                      <div className="invoice-history-row" key={item.id}>
                        <div>
                          <strong>
                            {money(item.amount, invoice.currency)} ·{" "}
                            {item.payment_method.replace("_", " ")}
                          </strong>
                          <span>
                            {new Date(item.received_at).toLocaleString()}
                            {item.notes ? " · " + item.notes : ""}
                          </span>
                        </div>
                        {item.reference && <code>{item.reference}</code>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No payments yet"
                    description="Recorded payments will appear here."
                  />
                )}
              </section>
              <section className="invoice-history-card">
                <div className="invoice-history-heading">
                  <h3>Refunds</h3>
                  <span>{history.refunds.length}</span>
                </div>
                {history.refunds.length ? (
                  <div className="invoice-history-list">
                    {history.refunds.map((item) => (
                      <div className="invoice-history-row" key={item.id}>
                        <div>
                          <strong>
                            {money(item.amount, invoice.currency)} ·{" "}
                            {item.refund_method.replace("_", " ")}
                          </strong>
                          <span>
                            {item.reason} ·{" "}
                            {new Date(item.refunded_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No refunds"
                    description="Refunds against recorded payments appear here."
                  />
                )}
              </section>
              <section className="invoice-history-card">
                <div className="invoice-history-heading">
                  <h3>Credits</h3>
                  <span>{history.credits.length}</span>
                </div>
                {history.credits.length ? (
                  <div className="invoice-history-list">
                    {history.credits.map((item) => (
                      <div className="invoice-history-row" key={item.id}>
                        <div>
                          <strong>{money(item.amount, invoice.currency)}</strong>
                          <span>
                            {item.reason} ·{" "}
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No credits"
                    description="Applied invoice credits appear here."
                  />
                )}
              </section>
              <section className="invoice-history-card">
                <div className="invoice-history-heading">
                  <h3>Invoice activity</h3>
                  <span>{history.events.length}</span>
                </div>
                {history.events.length ? (
                  <div className="invoice-history-list">
                    {history.events.map((item) => (
                      <div className="invoice-history-row" key={item.id}>
                        <div>
                          <strong>{item.event_type.replaceAll("_", " ")}</strong>
                          <span>
                            {[item.from_status, item.to_status]
                              .filter(Boolean)
                              .join(" → ") ||
                              new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No activity yet"
                    description="Invoice lifecycle events appear here."
                  />
                )}
              </section>
            </div>
          )}
        </div>
      )}

      <div className="modal-actions">
        <Button className="btn-secondary" onClick={() => void pdf()}>
          Download PDF
        </Button>
        {invoice.status === "draft" && (
          <Button onClick={() => void run("issue", undefined, false)}>
            Issue invoice
          </Button>
        )}
        {["issued", "partially_paid"].includes(invoice.status) &&
          invoice.balance_due !== "0.00" && (
            <>
              <Button onClick={() => setAction("payment")}>Record payment</Button>
              {canSendPaymentLink && (
                <Button
                  className="btn-primary"
                  onClick={() => setAction("payment-link")}
                >
                  Send payment link
                </Button>
              )}
            </>
          )}
        {invoice.status !== "void" && invoice.status !== "paid" && (
          <Button
            className="btn-secondary"
            onClick={() => setAction("credit")}
          >
            Add credit
          </Button>
        )}
        {invoice.status === "issued" && (
          <Button className="btn-danger" onClick={() => setAction("void")}>
            Void
          </Button>
        )}
        {invoice.amount_paid !== "0.00" && (
          <Button
            className="btn-secondary"
            onClick={() => setAction("refund")}
          >
            Refund payment
          </Button>
        )}
      </div>
      {action === "payment" && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setAction(null)}
          onSubmit={(body) => void run("payments", body)}
        />
      )}
      {action === "payment-link" && (
        <SendPaymentLinkModal
          invoice={invoice}
          onClose={() => setAction(null)}
          onSent={onChanged}
        />
      )}
      {action === "credit" && (
        <ReasonAmountModal
          title="Add invoice credit"
          submitLabel="Apply credit"
          onClose={() => setAction(null)}
          onSubmit={(amount, reason) =>
            void run("credits", { amount, reason })
          }
        />
      )}
      {action === "void" && (
        <ReasonModal
          title="Void invoice"
          submitLabel="Void invoice"
          danger
          onClose={() => setAction(null)}
          onSubmit={(reason) => void run("void", { reason }, false)}
        />
      )}
      {action === "refund" && (
        <RefundModal
          invoice={invoice}
          onClose={() => setAction(null)}
          onSubmit={(body) =>
            void run(
              "payments/" + String(body.payment_id) + "/refunds",
              Object.fromEntries(
                Object.entries(body).filter(([key]) => key !== "payment_id"),
              ),
            )
          }
        />
      )}
      {busy && <div className="muted busy-line">Saving…</div>}
    </Modal>
  );
}

function SendPaymentLinkModal({
  invoice,
  onClose,
  onSent,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSent: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    notification_status: string;
    recipient_name: string;
    recipient_email: string;
    balance_due: string;
    expires_at: string;
  } | null>(null);

  async function send() {
    setBusy(true);
    setError("");
    try {
      const response = await endpoints.invoicePortal.send(invoice.id);
      setResult(response);
      await onSent();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send the invoice payment link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Send secure payment link" onClose={onClose}>
      <p className="muted">The customer will receive an expiring link to review this invoice and pay the outstanding balance securely through Stripe. The payment form will not appear in the admin workspace.</p>
      <div className="invoice-portal-send-summary">
        <div><span className="eyebrow">Invoice</span><strong>{invoice.invoice_number}</strong></div>
        <div><span className="eyebrow">Outstanding balance</span><strong>{money(invoice.balance_due, invoice.currency)}</strong></div>
      </div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {result && (
        <div className="success-banner" role="status">
          <strong>Payment link email {result.notification_status === "sent" ? "sent" : result.notification_status === "queued" ? "queued" : result.notification_status}.</strong>
          <span>Recipient: {result.recipient_name} ({result.recipient_email})</span>
          <span>Balance: {money(result.balance_due, invoice.currency)}</span>
          <span>Link expires: {new Date(result.expires_at).toLocaleString()}</span>
          <p className="muted">Delivery depends on the configured notification worker and email provider.</p>
        </div>
      )}
      {!result ? (
        <div className="modal-actions">
          <Button disabled={busy || Number(invoice.balance_due) <= 0} onClick={() => void send()}>{busy ? "Queuing email…" : "Send payment link"}</Button>
          <Button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>Cancel</Button>
        </div>
      ) : (
        <div className="modal-actions"><Button onClick={onClose}>Close</Button></div>
      )}
    </Modal>
  );
}

function PaymentModal({
  invoice,
  onClose,
  onSubmit,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSubmit: (body: unknown) => void;
}) {
  const [form, setForm] = useState({
    amount: invoice.balance_due,
    method: "bank_transfer",
    reference: "",
    notes: "",
  });

  return (
    <Modal title="Record payment" onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            amount: form.amount,
            payment_method: form.method,
            reference: form.reference || null,
            notes: form.notes || null,
          });
        }}
      >
        <label>
          Amount
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={invoice.balance_due}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </label>
        <label>
          Payment method
          <Select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
          >
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </Select>
        </label>
        <label>
          Reference
          <Input
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
          />
        </label>
        <label>
          Notes
          <TextArea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        <Button>Record payment</Button>
      </form>
    </Modal>
  );
}

function RefundModal({
  invoice,
  onClose,
  onSubmit,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSubmit: (body: any) => void;
}) {
  const [payments, setPayments] = useState<{ id: string; amount: string }[]>([]);
  const [paymentId, setPaymentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [reason, setReason] = useState("");

  useEffect(() => {
    endpoints.invoices.payments(invoice.id).then((items) => {
      const values = items as { id: string; amount: string }[];
      setPayments(values);
      setPaymentId(values[0]?.id || "");
      setAmount(values[0]?.amount || "");
    });
  }, [invoice.id]);

  return (
    <Modal title="Refund payment" onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            payment_id: paymentId,
            amount,
            refund_method: method,
            reason,
          });
        }}
      >
        <label>
          Payment
          <Select
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
          >
            {payments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id.slice(0, 8)}… · {money(item.amount, invoice.currency)}
              </option>
            ))}
          </Select>
        </label>
        <label>
          Amount
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          Refund method
          <Select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </Select>
        </label>
        <label>
          Reason
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={3}
            required
          />
        </label>
        <Button disabled={!paymentId}>Refund payment</Button>
      </form>
    </Modal>
  );
}

function ReasonAmountModal({
  title,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (amount: string, reason: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(amount, reason);
        }}
      >
        <label>
          Amount
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          Reason
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={3}
            required
          />
        </label>
        <Button>{submitLabel}</Button>
      </form>
    </Modal>
  );
}

function ReasonModal({
  title,
  submitLabel,
  danger,
  onClose,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  danger?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(reason);
        }}
      >
        <label>
          Reason
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={3}
            required
          />
        </label>
        <Button className={danger ? "btn-danger" : ""}>{submitLabel}</Button>
      </form>
    </Modal>
  );
}
