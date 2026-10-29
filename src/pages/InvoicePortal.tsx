import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Badge, Button, Spinner } from "../components/ui";
import { endpoints } from "../lib/api";
import type { InvoicePortal, InvoicePortalPaymentIntent } from "../types";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const money = (value: string, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value));

function formatDate(value: string) {
  const parts = value.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(parts[0], parts[1] - 1, parts[2]),
  );
}

function PortalShell({ children }: { children: ReactNode }) {
  return <div className="agreement-portal invoice-portal"><div className="agreement-portal-inner">{children}</div></div>;
}

export function InvoicePortalPage() {
  const { token = "" } = useParams();
  const [invoice, setInvoice] = useState<InvoicePortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingPayment, setStartingPayment] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<InvoicePortalPaymentIntent | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const redirectHandled = useRef(false);
  const [stripeReturn] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      paymentIntentId: params.get("payment_intent"),
      redirectStatus: params.get("redirect_status"),
      hasStripeQuery: params.has("payment_intent") || params.has("payment_intent_client_secret"),
    };
  });

  useEffect(() => {
    let live = true;
    async function load() {
      if (!token) {
        setError("This invoice link is missing its security token.");
        setLoading(false);
        return;
      }

      if (stripeReturn.hasStripeQuery) {
        // Remove Stripe's query parameters, including the client secret, from the address bar.
        window.history.replaceState(null, "", window.location.pathname);
      }

      setLoading(true);
      setError("");
      try {
        const current = await endpoints.invoicePortal.get(token);
        if (!live) return;
        setInvoice(current);

        if (
          stripeReturn.paymentIntentId
          && stripeReturn.redirectStatus === "succeeded"
          && !redirectHandled.current
        ) {
          redirectHandled.current = true;
          setMessage("Verifying your card payment with Stripe…");
          try {
            const updated = await endpoints.invoicePortal.confirm(token, stripeReturn.paymentIntentId);
            if (live) {
              setInvoice(updated);
              setPaymentIntent(null);
              setMessage(
                updated.portal_status === "paid"
                  ? "Payment confirmed. Thank you."
                  : "Your payment was recorded. The remaining balance is shown below.",
              );
            }
          } catch (cause) {
            if (live) setError(cause instanceof Error ? cause.message : "Unable to verify this payment yet.");
          }
        } else if (
          stripeReturn.paymentIntentId
          && stripeReturn.redirectStatus
          && stripeReturn.redirectStatus !== "succeeded"
        ) {
          setMessage("The payment was not completed. Review the balance and try again.");
        }
      } catch (cause) {
        if (live) setError(cause instanceof Error ? cause.message : "This invoice link is unavailable.");
      } finally {
        if (live) setLoading(false);
      }
    }
    void load();
    return () => { live = false; };
  }, [token, stripeReturn]);

  async function startPayment() {
    if (!token || startingPayment || invoice?.portal_status !== "payable") return;
    if (!stripePublishableKey) {
      setError("Online card payments are not configured for this site. Contact the service provider to arrange payment.");
      return;
    }
    setStartingPayment(true);
    setError("");
    setMessage("");
    try {
      const intent = await endpoints.invoicePortal.createPaymentIntent(token);
      setPaymentIntent(intent);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start the card payment.");
    } finally {
      setStartingPayment(false);
    }
  }

  function onPaymentConfirmed(updated: InvoicePortal) {
    setInvoice(updated);
    setPaymentIntent(null);
    setError("");
    setMessage(
      updated.portal_status === "paid"
        ? "Payment confirmed. Thank you."
        : "Your payment was recorded. The remaining balance is shown below.",
    );
  }

  if (loading) {
    return <PortalShell><div className="agreement-portal-state"><Spinner /><p>Loading your invoice…</p></div></PortalShell>;
  }

  if (!invoice) {
    return (
      <PortalShell>
        <div className="agreement-portal-card agreement-portal-state">
          <Badge tone="danger">Unavailable</Badge>
          <h1>Invoice link unavailable</h1>
          <p className="muted">{error || "This secure invoice link is invalid or has expired."}</p>
        </div>
      </PortalShell>
    );
  }

  const isPaid = invoice.portal_status === "paid" || Number(invoice.balance_due) <= 0;
  const expiresAt = new Date(invoice.expires_at);

  return (
    <PortalShell>
      <header className="agreement-portal-brand">
        <div className="brand-mark">SA</div>
        <div><strong>{invoice.company_name}</strong><span>Secure invoice payment</span></div>
      </header>

      <main className="agreement-portal-card">
        <div className="agreement-portal-heading">
          <div>
            <span className="eyebrow">Invoice {invoice.invoice_number}</span>
            <h1>Your invoice</h1>
            <p className="muted">For {invoice.customer_name} · Sent to {invoice.recipient_email}</p>
          </div>
          <Badge tone={isPaid ? "success" : invoice.status === "void" ? "danger" : "warning"}>
            {isPaid ? "Paid" : invoice.status.replaceAll("_", " ")}
          </Badge>
        </div>

        {error && <div className="error-banner" role="alert">{error}</div>}
        {message && <div className={isPaid ? "success-banner" : "invoice-portal-notice"} role="status">{message}</div>}

        <div className="agreement-portal-summary">
          <div><span className="eyebrow">Invoice date</span><strong>{formatDate(invoice.invoice_date)}</strong></div>
          <div><span className="eyebrow">Due date</span><strong>{formatDate(invoice.due_date)}</strong></div>
          <div><span className="eyebrow">Invoice total</span><strong>{money(invoice.total_amount, invoice.currency)}</strong></div>
          <div><span className="eyebrow">Balance due</span><strong>{money(invoice.balance_due, invoice.currency)}</strong></div>
        </div>

        <section className="agreement-portal-section">
          <div className="card-title-row"><div><span className="eyebrow">Details</span><h2>Line items</h2></div></div>
          <div className="agreement-portal-lines">
            {invoice.lines.map((line, index) => (
              <div className="agreement-portal-line" key={line.service_code + line.description + index}>
                <div>
                  <strong>{line.description}</strong>
                  <span>{line.service_code} · {line.quantity} × {money(line.unit_price, invoice.currency)}</span>
                  {line.details && <small>{line.details}</small>}
                </div>
                <strong>{money(line.line_total, invoice.currency)}</strong>
              </div>
            ))}
          </div>

          <div className="invoice-portal-totals">
            <div><span>Subtotal</span><strong>{money(invoice.subtotal, invoice.currency)}</strong></div>
            {Number(invoice.discount_amount) > 0 && (
              <div><span>Discount</span><strong>−{money(invoice.discount_amount, invoice.currency)}</strong></div>
            )}
            <div><span>Tax</span><strong>{money(invoice.tax_amount, invoice.currency)}</strong></div>
            <div><span>Invoice total</span><strong>{money(invoice.total_amount, invoice.currency)}</strong></div>
            {Number(invoice.amount_paid) > 0 && (
              <div><span>Payments received</span><strong>{money(invoice.amount_paid, invoice.currency)}</strong></div>
            )}
            {Number(invoice.amount_refunded) > 0 && (
              <div><span>Refunds</span><strong>{money(invoice.amount_refunded, invoice.currency)}</strong></div>
            )}
            {Number(invoice.credits_applied) > 0 && (
              <div><span>Credits applied</span><strong>{money(invoice.credits_applied, invoice.currency)}</strong></div>
            )}
            <div className="invoice-portal-balance"><span>Balance due</span><strong>{money(invoice.balance_due, invoice.currency)}</strong></div>
          </div>
        </section>

        {invoice.notes && (
          <section className="agreement-portal-section">
            <span className="eyebrow">Notes</span>
            <p>{invoice.notes}</p>
          </section>
        )}

        <section className="invoice-portal-payment">
          {isPaid ? (
            <div className="invoice-portal-paid"><strong>Nothing else is due.</strong><span>This invoice has no outstanding balance.</span></div>
          ) : paymentIntent && stripePromise ? (
            <div>
              <span className="eyebrow">Secure checkout</span>
              <h2>Pay {money(paymentIntent.amount, paymentIntent.currency)}</h2>
              {paymentIntent.test_mode && (
                <div className="invoice-portal-test-notice">
                  Stripe test mode is enabled. Use test card <code>4242 4242 4242 4242</code>, any future expiry, and CVV <code>123</code>. No real charge will be made in test mode.
                </div>
              )}
              <Elements stripe={stripePromise} options={{ clientSecret: paymentIntent.client_secret }}>
                <StripeInvoicePaymentForm
                  token={token}
                  amount={paymentIntent.amount}
                  currency={paymentIntent.currency}
                  onCancel={() => setPaymentIntent(null)}
                  onConfirmed={onPaymentConfirmed}
                  onError={setError}
                  onProcessing={setMessage}
                />
              </Elements>
              <p className="muted invoice-portal-secure-note">Card details are processed by Stripe. This application does not receive your card number or CVV.</p>
            </div>
          ) : (
            <div className="invoice-portal-pay-row">
              <div><span className="eyebrow">Outstanding balance</span><strong>{money(invoice.balance_due, invoice.currency)}</strong></div>
              <Button disabled={startingPayment || isPaid} onClick={() => void startPayment()}>
                {startingPayment ? "Preparing secure checkout…" : "Pay with card"}
              </Button>
            </div>
          )}
        </section>
        <p className="portal-expiry">This secure invoice link expires {expiresAt.toLocaleString()}.</p>
      </main>
      <footer className="agreement-portal-footer">This is a secure payment link for the invoice shown above. If you were not expecting this invoice, contact {invoice.company_name} before paying.</footer>
    </PortalShell>
  );
}

function StripeInvoicePaymentForm({
  token,
  amount,
  currency,
  onCancel,
  onConfirmed,
  onError,
  onProcessing,
}: {
  token: string;
  amount: string;
  currency: string;
  onCancel: () => void;
  onConfirmed: (invoice: InvoicePortal) => void;
  onError: (message: string) => void;
  onProcessing: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    onError("");
    onProcessing("");
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + window.location.pathname + "?payment_return=1",
        },
        redirect: "if_required",
      });
      if (result.error) {
        onError(result.error.message || "The card payment could not be completed. Check the details and try again.");
        return;
      }

      const intent = result.paymentIntent;
      if (intent?.status === "succeeded") {
        const updated = await endpoints.invoicePortal.confirm(token, intent.id);
        onConfirmed(updated);
      } else if (intent?.status === "processing") {
        onProcessing("Stripe is still processing this payment. The invoice will update when the result is confirmed.");
      } else if (intent?.status === "requires_action") {
        onProcessing("Additional card authentication is required. Complete the authentication window to continue.");
      } else {
        onError("The payment has not been completed. Review the card details and try again.");
      }
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Unable to verify your payment. Please refresh the invoice before retrying.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="invoice-portal-checkout" onSubmit={submit}>
      <p>Amount to pay: <strong>{money(amount, currency)}</strong></p>
      <div className="card-element-wrapper"><PaymentElement /></div>
      <div className="modal-actions">
        <Button disabled={busy || !stripe || !elements}>{busy ? "Processing…" : "Pay securely"}</Button>
        <Button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
