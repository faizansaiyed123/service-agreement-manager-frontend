import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { endpoints } from "../lib/api";
import type {
  CustomerPortalAgreement,
  CustomerPortalEquipment,
  CustomerPortalInvoice,
  CustomerPortalInvitePreview,
  CustomerPortalLocation,
  CustomerPortalMe,
  CustomerPortalOverview,
  CustomerPortalPaymentIntent,
  CustomerPortalPayment,
  CustomerPortalDocument,
  CustomerPortalWorkOrder,
} from "../types";
import { Badge, Button, Card, EmptyState, Input, Modal, Spinner } from "../components/ui";

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

type PortalTab = "overview" | "agreements" | "locations" | "equipment" | "work-orders" | "invoices" | "payments" | "documents";

function money(value: string, currency: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function dateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function PortalShell({ children }: { children: ReactNode }) {
  return <div className="agreement-portal invoice-portal customer-portal"><div className="agreement-portal-inner">{children}</div></div>;
}

export function CustomerPortalLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await endpoints.customerPortal.login({ email: email.trim(), password });
      navigate("/customer-portal", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Check your credentials and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell>
      <div className="agreement-portal-card customer-portal-auth">
        <div className="eyebrow">Customer access</div>
        <h1>Sign in to your customer portal</h1>
        <p className="muted">Use the email address that received your service provider's invitation. Customer access is separate from staff accounts.</p>
        <form className="form-grid" onSubmit={submit}>
          <label>Email<Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <Button disabled={busy || !email.trim() || !password}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
        <p className="muted">Need access? Ask your service provider to invite your customer record to the portal.</p>
        <div className="auth-switch"><Link to="/login">Staff sign in</Link> · <Link to="/">Home</Link></div>
      </div>
    </PortalShell>
  );
}

export function CustomerPortalInvitationPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<CustomerPortalInvitePreview | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    if (!token) {
      setError("This invitation link is missing its security token.");
      setLoading(false);
      return;
    }
    endpoints.customerPortal.previewInvitation(token)
      .then((result) => {
        if (!live) return;
        setPreview(result);
        setFullName(result.full_name);
      })
      .catch((cause) => {
        if (live) setError(cause instanceof Error ? cause.message : "This invitation is invalid or has expired.");
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token || !preview || busy) return;
    setBusy(true);
    setError("");
    try {
      await endpoints.customerPortal.acceptInvitation(token, {
        full_name: fullName.trim(),
        password,
      });
      navigate("/customer-portal", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to activate customer portal access.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell>
      <div className="agreement-portal-card customer-portal-auth">
        <div className="eyebrow">Customer portal invitation</div>
        {loading ? <div className="agreement-portal-state"><Spinner /><p>Checking your invitation…</p></div> : preview ? <>
          <h1>Activate your portal access</h1>
          <p className="muted"><strong>{preview.company_name}</strong> invited you to access records for <strong>{preview.customer_name}</strong>.</p>
          <div className="detail-grid">
            <div><span className="eyebrow">Invited email</span><strong>{preview.email}</strong></div>
            <div><span className="eyebrow">Invitation expires</span><strong>{dateLabel(preview.expires_at)}</strong></div>
          </div>
          <form className="form-grid" onSubmit={submit}>
            <label>Your name<Input value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={2} maxLength={160} required /></label>
            <label>Password
              <Input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <p className="muted">Choose a password of at least 12 characters. If you already have a customer portal account with this email, enter its existing password to connect this customer record.</p>
            {error && <div className="error-banner" role="alert">{error}</div>}
            <Button disabled={busy || !fullName.trim() || password.length < 12}>{busy ? "Activating…" : "Activate customer portal"}</Button>
          </form>
        </> : <>
          <Badge tone="danger">Unavailable</Badge>
          <h1>Invitation unavailable</h1>
          <p className="muted">{error || "This invitation is invalid or has expired. Ask the service provider to send a new invitation."}</p>
          <Link to="/customer-portal/login">Go to customer sign in</Link>
        </>}
        <div className="auth-switch"><Link to="/">Home</Link></div>
      </div>
    </PortalShell>
  );
}

export function CustomerPortalPage() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState<CustomerPortalMe | null>(null);
  const [membershipId, setMembershipId] = useState("");
  const [overview, setOverview] = useState<CustomerPortalOverview | null>(null);
  const [agreements, setAgreements] = useState<CustomerPortalAgreement[]>([]);
  const [locations, setLocations] = useState<CustomerPortalLocation[]>([]);
  const [equipment, setEquipment] = useState<CustomerPortalEquipment[]>([]);
  const [workOrders, setWorkOrders] = useState<CustomerPortalWorkOrder[]>([]);
  const [invoices, setInvoices] = useState<CustomerPortalInvoice[]>([]);
  const [payments, setPayments] = useState<CustomerPortalPayment[]>([]);
  const [documents, setDocuments] = useState<CustomerPortalDocument[]>([]);
  const [activeTab, setActiveTab] = useState<PortalTab>("overview");
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerPortalInvoice | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<CustomerPortalPaymentIntent | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const handledReturn = useRef(false);
  const [stripeReturn] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      paymentIntentId: params.get("payment_intent"),
      redirectStatus: params.get("redirect_status"),
      membershipId: params.get("membership"),
      invoiceId: params.get("invoice"),
      hasStripeParams: params.has("payment_intent") || params.has("payment_intent_client_secret"),
    };
  });

  useEffect(() => {
    if (stripeReturn.hasStripeParams || window.location.search.includes("payment_return")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    let live = true;
    endpoints.customerPortal.me()
      .then((result) => {
        if (!live) return;
        setIdentity(result);
        const preferred = stripeReturn.membershipId && result.memberships.some((item) => item.membership_id === stripeReturn.membershipId)
          ? stripeReturn.membershipId
          : result.memberships[0]?.membership_id || "";
        setMembershipId(preferred);
        if (!result.memberships.length) setError("This login does not currently have an active customer portal membership. Ask the service provider to check your access.");
      })
      .catch((cause) => {
        if (live) setError(cause instanceof Error ? cause.message : "Unable to load your customer portal. Sign in again.");
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);


  useEffect(() => {
    if (!membershipId) return;
    let live = true;
    setDataLoading(true);
    setError("");
    Promise.all([
      endpoints.customerPortal.overview(membershipId),
      endpoints.customerPortal.agreements(membershipId),
      endpoints.customerPortal.locations(membershipId),
      endpoints.customerPortal.equipment(membershipId),
      endpoints.customerPortal.workOrders(membershipId),
      endpoints.customerPortal.invoices(membershipId),
      endpoints.customerPortal.payments(membershipId),
      endpoints.customerPortal.documents(membershipId),
    ]).then(async ([overviewData, agreementData, locationData, equipmentData, workOrderData, invoiceData, paymentData, documentData]) => {
      if (!live) return;
      setOverview(overviewData);
      setAgreements(agreementData);
      setLocations(locationData);
      setEquipment(equipmentData);
      setWorkOrders(workOrderData);
      setInvoices(invoiceData);
      setPayments(paymentData);
      setDocuments(documentData);
      if (
        stripeReturn.paymentIntentId &&
        stripeReturn.redirectStatus === "succeeded" &&
        stripeReturn.invoiceId &&
        stripeReturn.membershipId === membershipId &&
        !handledReturn.current
      ) {
        handledReturn.current = true;
        try {
          const updated = await endpoints.customerPortal.confirmPayment(membershipId, stripeReturn.invoiceId, stripeReturn.paymentIntentId);
          const updatedInvoices = await endpoints.customerPortal.invoices(membershipId);
          if (live) {
            setInvoices(updatedInvoices);
            setSelectedInvoice(updated);
            setMessage("Payment confirmation received. The invoice balance has been refreshed.");
          }
        } catch (cause) {
          if (live) setError(cause instanceof Error ? cause.message : "The payment result could not be verified yet. Refresh the page to check the invoice balance.");
        }
      } else if (stripeReturn.paymentIntentId && stripeReturn.redirectStatus && stripeReturn.redirectStatus !== "succeeded" && stripeReturn.membershipId === membershipId) {
        setMessage("The payment was not completed. Review the balance and try again.");
      }
    }).catch((cause) => {
      if (live) setError(cause instanceof Error ? cause.message : "Unable to load your customer records.");
    }).finally(() => { if (live) setDataLoading(false); });
    return () => { live = false; };
  }, [membershipId]);

  async function logout() {
    try { await endpoints.customerPortal.logout(); } catch { /* Expired sessions are already unusable. */ }
    navigate("/customer-portal/login", { replace: true });
  }

  async function startPayment(invoice: CustomerPortalInvoice) {
    if (!membershipId || paymentBusy || invoice.portal_status !== "payable" || Number(invoice.balance_due) <= 0) return;
    setPaymentBusy(true);
    setError("");
    setMessage("");
    try {
      if (!stripeKey) throw new Error("Online card payments are not configured. Contact the service provider to arrange payment.");
      const intent = await endpoints.customerPortal.createPaymentIntent(membershipId, invoice.id);
      setSelectedInvoice(invoice);
      setPaymentIntent(intent);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start card payment.");
    } finally {
      setPaymentBusy(false);
    }
  }

  async function downloadInvoice(invoice: CustomerPortalInvoice) {
    if (!membershipId) return;
    setError("");
    try {
      const blob = await endpoints.customerPortal.invoicePdf(membershipId, invoice.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to download this invoice.");
    }
  }

  function onPaymentConfirmed(updated: CustomerPortalInvoice) {
    setPaymentIntent(null);
    setSelectedInvoice(updated);
    setInvoices((current) => current.map((item) => item.id === updated.id ? updated : item));
    setMessage(updated.portal_status === "paid" ? "Payment confirmed. Thank you." : "Payment recorded. The remaining balance is shown below.");
  }

  if (loading) return <PortalShell><div className="agreement-portal-state"><Spinner /><p>Loading your customer portal…</p></div></PortalShell>;
  if (!identity) return <PortalShell><div className="agreement-portal-card agreement-portal-state"><Badge tone="danger">Sign-in required</Badge><h1>Customer portal unavailable</h1><p className="muted">{error || "Sign in to access your customer records."}</p><Link to="/customer-portal/login">Customer sign in</Link></div></PortalShell>;
  if (!identity.memberships.length) return <PortalShell><div className="agreement-portal-card agreement-portal-state"><h1>No active customer access</h1><p className="muted">{error || "Ask your service provider to invite this email address to a customer record."}</p><Button onClick={() => void logout()}>Sign out</Button></div></PortalShell>;

  const activeMembership = identity.memberships.find((item) => item.membership_id === membershipId) || identity.memberships[0];

  return (
    <PortalShell>
      <header className="customer-portal-header">
        <div><div className="eyebrow">Customer portal</div><h1>{activeMembership.customer_name}</h1><p className="muted">{activeMembership.company_name} · {identity.email}</p></div>
        <Button className="btn-secondary" onClick={() => void logout()}>Sign out</Button>
      </header>
      {identity.memberships.length > 1 && (
        <Card>
          <label>Customer account
            <select className="input" value={membershipId} onChange={(event) => setMembershipId(event.target.value)}>
              {identity.memberships.map((item) => <option key={item.membership_id} value={item.membership_id}>{item.company_name} — {item.customer_name}</option>)}
            </select>
          </label>
          <p className="muted">Your email has access to more than one customer record. Each account is kept separate.</p>
        </Card>
      )}
      <nav className="module-tabs customer-portal-tabs" aria-label="Customer portal sections">
        {([
          ["overview", "Overview"], ["agreements", "Agreements"], ["locations", "Locations"],
          ["equipment", "Equipment"], ["work-orders", "Service work"], ["invoices", "Invoices"],
          ["payments", "Payments"], ["documents", "Documents"],
        ] as Array<[PortalTab, string]>).map(([key, label]) => (
          <button type="button" key={key} className={activeTab === key ? "module-tab active" : "module-tab"} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </nav>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {message && <div className="success-banner" role="status">{message}</div>}
      {dataLoading ? <div className="agreement-portal-state"><Spinner /><p>Loading your records…</p></div> : <>
        {activeTab === "overview" && overview && <div className="customer-portal-grid">
          <Card><span className="eyebrow">Service locations</span><strong className="customer-portal-metric">{overview.locations.length}</strong></Card>
          <Card><span className="eyebrow">Agreements</span><strong className="customer-portal-metric">{overview.agreement_count}</strong></Card>
          <Card><span className="eyebrow">Open service work</span><strong className="customer-portal-metric">{overview.open_work_order_count}</strong></Card>
          <Card><span className="eyebrow">Unpaid invoices</span><strong className="customer-portal-metric">{overview.unpaid_invoice_count}</strong></Card>
          <Card><h2>Account details</h2><p><strong>{overview.customer_name}</strong></p><p className="muted">Customer number: {overview.customer_number}</p><p className="muted">Account type: {overview.customer_kind}</p></Card>
          <Card><h2>Recent invoices</h2>{invoices.length ? <div className="list">{invoices.slice(0, 3).map((invoice) => <div key={invoice.id} className="list-row"><div><strong>{invoice.invoice_number}</strong><span>{dateLabel(invoice.due_date)} · {money(invoice.balance_due, invoice.currency)} due</span></div><Button className="btn-secondary" onClick={() => { setSelectedInvoice(invoice); setActiveTab("invoices"); }}>View</Button></div>)}</div> : <p className="muted">No issued invoices yet.</p>}</Card>
        </div>}

        {activeTab === "agreements" && <Card><h2>My agreements</h2>{agreements.length ? <div className="table-wrap"><table><thead><tr><th>Agreement</th><th>Period</th><th>Status</th><th>Total</th></tr></thead><tbody>{agreements.map((item) => <tr key={item.id}><td><strong>{item.agreement_number}</strong><span className="table-sub">{item.title}</span></td><td>{dateLabel(item.start_date)} – {dateLabel(item.end_date)}</td><td><Badge tone={item.status === "active" ? "success" : "neutral"}>{item.status}</Badge></td><td>{money(item.total_amount, item.currency)}</td></tr>)}</tbody></table></div> : <EmptyState title="No agreements available" description="Issued and accepted agreements will appear here." />}</Card>}

        {activeTab === "locations" && <Card><h2>My service locations</h2>{locations.length ? <div className="table-wrap"><table><thead><tr><th>Location</th><th>Address</th><th>Status</th></tr></thead><tbody>{locations.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{[item.address_line1, item.address_line2, item.city, item.region, item.postal_code, item.country_code].filter(Boolean).join(", ")}</td><td><Badge tone={item.is_active ? "success" : "neutral"}>{item.is_active ? "Active" : "Inactive"}</Badge></td></tr>)}</tbody></table></div> : <EmptyState title="No service locations" description="Your service provider has not added a location yet." />}</Card>}

        {activeTab === "equipment" && <Card><h2>Equipment</h2>{equipment.length ? <div className="table-wrap"><table><thead><tr><th>Asset</th><th>Type</th><th>Model</th><th>Serial</th><th>Warranty ends</th></tr></thead><tbody>{equipment.map((item) => <tr key={item.id}><td><strong>{item.asset_number}</strong></td><td>{item.category}</td><td>{[item.manufacturer, item.model_number].filter(Boolean).join(" ") || "—"}</td><td>{item.serial_number || "—"}</td><td>{dateLabel(item.warranty_expires_on)}</td></tr>)}</tbody></table></div> : <EmptyState title="No equipment listed" description="Equipment tracked by your service provider will appear here." />}</Card>}

        {activeTab === "work-orders" && <Card><h2>Service work</h2>{workOrders.length ? <div className="table-wrap"><table><thead><tr><th>Work order</th><th>Location / equipment</th><th>Scheduled</th><th>Status</th><th>Priority</th></tr></thead><tbody>{workOrders.map((item) => <tr key={item.id}><td><strong>{item.work_order_number}</strong><span className="table-sub">{item.title}</span></td><td>{item.service_location_name} · {item.service_location_city}<span className="table-sub">{item.equipment_label || "General service"}</span></td><td>{dateLabel(item.scheduled_for)}</td><td><Badge tone={item.status === "completed" ? "success" : item.status === "cancelled" ? "neutral" : "info"}>{item.status.replace("_", " ")}</Badge></td><td>{item.priority}</td></tr>)}</tbody></table></div> : <EmptyState title="No service work yet" description="Scheduled and completed service visits will appear here." />}</Card>}

        {activeTab === "payments" && <Card><h2>Payment history</h2>{payments.length ? <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Received</th><th>Method</th><th>Amount</th><th>Refunds</th><th>Reference</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><strong>{payment.invoice_number}</strong></td><td>{dateLabel(payment.received_at)}</td><td className="capitalize">{payment.payment_method.replace("_", " ")}</td><td>{money(payment.amount, invoices.find((item) => item.id === payment.invoice_id)?.currency || "USD")}</td><td>{money(payment.refunds.reduce((total, refund) => total + Number(refund.amount), 0).toFixed(2), invoices.find((item) => item.id === payment.invoice_id)?.currency || "USD")}{payment.refunds.length > 0 && <span className="table-sub">{payment.refunds.length} refund(s)</span>}</td><td>{payment.reference || "—"}</td></tr>)}</tbody></table></div> : <EmptyState title="No payments recorded" description="Payments associated with your issued invoices will appear here." />}</Card>}

        {activeTab === "documents" && <Card><h2>My documents</h2>{documents.length ? <div className="table-wrap"><table><thead><tr><th>Document</th><th>Related to</th><th>Uploaded</th><th>Size</th><th /></tr></thead><tbody>{documents.map((document) => <tr key={document.id}><td><strong>{document.original_filename}</strong><span className="table-sub">{document.description || document.content_type}</span></td><td className="capitalize">{document.entity_type.replace("_", " ")}</td><td>{dateLabel(document.created_at)}</td><td>{document.size_bytes < 1024 * 1024 ? `${Math.max(1, Math.round(document.size_bytes / 1024))} KB` : `${(document.size_bytes / (1024 * 1024)).toFixed(1)} MB`}</td><td><button className="text-button" onClick={async () => { setError(""); try { const blob = await endpoints.customerPortal.downloadDocument(membershipId, document.id); const url = URL.createObjectURL(blob); const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = document.original_filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to download this document."); } }}>Download</button></td></tr>)}</tbody></table></div> : <EmptyState title="No documents available" description="Supporting documents shared with your customer account will appear here." />}</Card>}

        {activeTab === "invoices" && <Card><h2>My invoices</h2>{invoices.length ? <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Issued</th><th>Due</th><th>Balance due</th><th>Status</th><th /></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.invoice_number}</strong></td><td>{dateLabel(invoice.invoice_date)}</td><td>{dateLabel(invoice.due_date)}</td><td><strong>{money(invoice.balance_due, invoice.currency)}</strong></td><td><Badge tone={invoice.portal_status === "paid" ? "success" : invoice.is_overdue ? "danger" : "info"}>{invoice.portal_status === "paid" ? "Paid" : invoice.is_overdue ? "Overdue" : invoice.status}</Badge></td><td><div className="row-actions"><button className="text-button" onClick={() => setSelectedInvoice(invoice)}>View</button><button className="text-button" onClick={() => void downloadInvoice(invoice)}>PDF</button>{invoice.portal_status === "payable" && Number(invoice.balance_due) > 0 && <button className="text-button" disabled={paymentBusy} onClick={() => void startPayment(invoice)}>{paymentBusy ? "Preparing…" : "Pay securely"}</button>}</div></td></tr>)}</tbody></table></div> : <EmptyState title="No issued invoices" description="Invoices issued by your service provider will appear here." />}</Card>}
      </>}
      {selectedInvoice && !paymentIntent && <Modal title={selectedInvoice.invoice_number} onClose={() => setSelectedInvoice(null)}>
        <div className="drawer-meta"><strong>{selectedInvoice.invoice_number}</strong><Badge tone={selectedInvoice.portal_status === "paid" ? "success" : selectedInvoice.is_overdue ? "danger" : "info"}>{selectedInvoice.portal_status === "paid" ? "Paid" : selectedInvoice.is_overdue ? "Overdue" : selectedInvoice.status}</Badge></div>
        <div className="invoice-summary-grid">
          <div><span className="eyebrow">Subtotal</span><strong>{money(selectedInvoice.subtotal, selectedInvoice.currency)}</strong></div>
          <div><span className="eyebrow">Discount</span><strong>{money(selectedInvoice.discount_amount, selectedInvoice.currency)}</strong></div>
          <div><span className="eyebrow">Tax</span><strong>{money(selectedInvoice.tax_amount, selectedInvoice.currency)}</strong></div>
          <div><span className="eyebrow">Total</span><strong>{money(selectedInvoice.total_amount, selectedInvoice.currency)}</strong></div>
          <div><span className="eyebrow">Amount paid</span><strong>{money(selectedInvoice.amount_paid, selectedInvoice.currency)}</strong></div>
          <div><span className="eyebrow">Balance due</span><strong>{money(selectedInvoice.balance_due, selectedInvoice.currency)}</strong></div>
        </div>
        <div className="line-items"><strong>Line items</strong>{selectedInvoice.lines.map((line, index) => <div className="list-row" key={`${selectedInvoice.id}-${index}`}><div><strong>{line.description}</strong><span>{line.service_code} · {line.quantity} × {money(line.unit_price, selectedInvoice.currency)}</span>{line.details && <span>{line.details}</span>}</div><strong>{money(line.line_total, selectedInvoice.currency)}</strong></div>)}</div>
        {selectedInvoice.notes && <div><span className="eyebrow">Notes</span><p className="muted">{selectedInvoice.notes}</p></div>}
        <div className="modal-actions"><Button className="btn-secondary" onClick={() => void downloadInvoice(selectedInvoice)}>Download PDF</Button>{selectedInvoice.portal_status === "payable" && Number(selectedInvoice.balance_due) > 0 && <Button onClick={() => void startPayment(selectedInvoice)}>Pay with card</Button>}</div>
      </Modal>}
      {paymentIntent && selectedInvoice && stripePromise && <Modal title={`Pay ${selectedInvoice.invoice_number}`} onClose={() => setPaymentIntent(null)}>
        <p className="muted">Pay the outstanding balance of <strong>{money(paymentIntent.amount, paymentIntent.currency)}</strong> securely through Stripe. Your service provider does not receive your raw card number.</p>
        {paymentIntent.test_mode && <p className="muted">Stripe is in test mode. Use the Stripe test card only in this test environment.</p>}
        <Elements stripe={stripePromise} options={{ clientSecret: paymentIntent.client_secret }}>
          <CustomerStripePaymentForm
            membershipId={membershipId}
            invoice={selectedInvoice}
            onCancel={() => setPaymentIntent(null)}
            onConfirmed={onPaymentConfirmed}
            onError={setError}
          />
        </Elements>
      </Modal>}
    </PortalShell>
  );
}

function CustomerStripePaymentForm({
  membershipId,
  invoice,
  onCancel,
  onConfirmed,
  onError,
}: {
  membershipId: string;
  invoice: CustomerPortalInvoice;
  onCancel: () => void;
  onConfirmed: (invoice: CustomerPortalInvoice) => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    onError("");
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/customer-portal?payment_return=1&membership=${encodeURIComponent(membershipId)}&invoice=${encodeURIComponent(invoice.id)}`,
        },
        redirect: "if_required",
      });
      if (result.error) {
        onError(result.error.message || "The card payment could not be completed. Check the details and try again.");
        return;
      }
      const intent = result.paymentIntent;
      if (intent?.status === "succeeded") {
        const updated = await endpoints.customerPortal.confirmPayment(membershipId, invoice.id, intent.id);
        onConfirmed(updated);
      } else if (intent?.status === "processing" || intent?.status === "requires_action") {
        onError("Stripe is still processing this payment. Refresh the invoice balance before trying again.");
      } else {
        onError("The payment has not completed. Review the card details and try again.");
      }
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Unable to verify the payment. Refresh the invoice before retrying.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="form-grid" onSubmit={submit}>
    <div className="card-element-wrapper"><PaymentElement /></div>
    <div className="modal-actions"><Button disabled={busy || !stripe || !elements}>{busy ? "Processing…" : "Pay securely"}</Button><Button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>Cancel</Button></div>
  </form>;
}
