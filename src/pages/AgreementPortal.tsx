import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { endpoints } from "../lib/api";
import type { AgreementPortal } from "../types";
import { Badge, Button, Spinner, TextArea } from "../components/ui";

const money = (value: string, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value));

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function PortalShell({ children }: { children: ReactNode }) {
  return <div className="agreement-portal"><div className="agreement-portal-inner">{children}</div></div>;
}

export function AgreementPortalPage() {
  const { token = "" } = useParams();
  const [agreement, setAgreement] = useState<AgreementPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!token) {
      setError("This agreement link is missing its security token.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setAgreement(await endpoints.agreementPortal.get(token));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This agreement link is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [token]);

  async function respond(decision: "accept" | "reject") {
    if (!token || busy) return;
    if (decision === "accept" && !reviewed) {
      setError("Please confirm that you reviewed the agreement before accepting it.");
      return;
    }
    setBusy(decision);
    setError("");
    try {
      const result = await endpoints.agreementPortal.respond(token, {
        decision,
        rejection_reason: decision === "reject" ? rejectionReason.trim() || null : null,
      });
      setAgreement(result);
      setRejectOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to record your response.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <PortalShell><div className="agreement-portal-state"><Spinner /><p>Loading your agreement…</p></div></PortalShell>;
  }

  if (!agreement) {
    return <PortalShell><div className="agreement-portal-card agreement-portal-state"><Badge tone="danger">Unavailable</Badge><h1>Agreement link unavailable</h1><p className="muted">{error || "This secure agreement link is invalid or has expired."}</p></div></PortalShell>;
  }

  const finalState = agreement.portal_status === "accepted" || agreement.portal_status === "rejected";
  const unavailable = agreement.portal_status === "unavailable";
  const expiresAt = new Date(agreement.expires_at);

  return <PortalShell>
    <header className="agreement-portal-brand">
      <div className="brand-mark">SA</div>
      <div><strong>{agreement.company_name}</strong><span>Service agreement review</span></div>
    </header>

    <main className="agreement-portal-card">
      <div className="agreement-portal-heading">
        <div>
          <span className="eyebrow">Agreement {agreement.agreement_number}</span>
          <h1>{agreement.title}</h1>
          <p className="muted">For {agreement.customer_name} · {agreement.recipient_email}</p>
        </div>
        <Badge tone={agreement.portal_status === "accepted" ? "success" : agreement.portal_status === "rejected" || unavailable ? "danger" : "warning"}>
          {unavailable ? "Unavailable" : agreement.portal_status}
        </Badge>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <div className="agreement-portal-summary">
        <div><span className="eyebrow">Term</span><strong>{formatDate(agreement.start_date)} → {formatDate(agreement.end_date)}</strong></div>
        <div><span className="eyebrow">Value</span><strong>{money(agreement.total_amount, agreement.currency)}</strong></div>
        <div><span className="eyebrow">Billing</span><strong className="capitalize">{agreement.billing_frequency.replace("_", " ")}</strong></div>
        <div><span className="eyebrow">Auto renew</span><strong>{agreement.auto_renew ? "Yes" : "No"}</strong></div>
      </div>

      <section className="agreement-portal-section">
        <div className="card-title-row"><div><span className="eyebrow">Services</span><h2>Pricing snapshot</h2></div></div>
        <div className="agreement-portal-lines">
          {agreement.lines.map(line => <div className="agreement-portal-line" key={line.service_code + line.name}><div><strong>{line.name}</strong><span>{line.service_code} · {line.quantity} × {line.unit_price}</span>{line.description && <small>{line.description}</small>}</div><strong>{money(line.line_total, agreement.currency)}</strong></div>)}
        </div>
      </section>

      <section className="agreement-portal-section">
        <span className="eyebrow">Service location</span>
        <strong>{agreement.service_location_name}</strong>
        <p className="muted">{agreement.service_location_city}{agreement.service_location_region ? ", " + agreement.service_location_region : ""} · {agreement.service_location_country}</p>
      </section>

      <section className="agreement-portal-section">
        <span className="eyebrow">Terms</span>
        <div className="agreement-portal-terms">{agreement.terms_text || "No additional contract terms were entered for this agreement."}</div>
      </section>

      {finalState && <div className={agreement.portal_status === "accepted" ? "success-banner" : "error-banner"} role="status">
        {agreement.portal_status === "accepted"
          ? <>You accepted this agreement on {agreement.accepted_at ? formatDate(agreement.accepted_at) : "the recorded acceptance date"}.</>
          : <>You rejected this agreement{agreement.rejection_reason ? ": " + agreement.rejection_reason : "."}</>}
      </div>}

      {unavailable && <div className="error-banner">This agreement is no longer open for a customer response. Contact the service provider if you need a current version.</div>}

      {!finalState && !unavailable && <section className="agreement-portal-decision">
        <label className="portal-check">
          <input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />
          <span>I have reviewed the agreement details and pricing above.</span>
        </label>
        {!rejectOpen
          ? <div className="agreement-portal-actions">
              <Button disabled={busy !== null || !reviewed} onClick={() => void respond("accept")}>{busy === "accept" ? "Accepting…" : "Accept agreement"}</Button>
              <Button className="btn-secondary" disabled={busy !== null} onClick={() => { setError(""); setRejectOpen(true); }}>Reject</Button>
            </div>
          : <div className="agreement-portal-reject">
              <label>Reason for rejection <span className="muted">(optional)</span><TextArea maxLength={2000} value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} placeholder="Tell the provider why this agreement is not accepted." /></label>
              <div className="agreement-portal-actions">
                <Button className="btn-danger" disabled={busy !== null} onClick={() => void respond("reject")}>{busy === "reject" ? "Rejecting…" : "Confirm rejection"}</Button>
                <Button className="btn-secondary" disabled={busy !== null} onClick={() => setRejectOpen(false)}>Keep reviewing</Button>
              </div>
            </div>}
        <p className="portal-expiry">This secure response link expires {expiresAt.toLocaleString()}.</p>
      </section>}
    </main>

    <footer className="agreement-portal-footer">Electronic responses are recorded against this agreement version. You do not need to create an account.</footer>
  </PortalShell>;
}
