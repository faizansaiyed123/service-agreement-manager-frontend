import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { endpoints } from "../lib/api";
import { Button, Input, Spinner } from "../components/ui";

type InvitationPreview = {
  email: string;
  full_name: string;
  company_name: string;
  expires_at: string;
};

export function TechnicianInvitationPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    if (!token) {
      setError("This invitation link is missing its security token.");
      setLoading(false);
      return;
    }
    endpoints.team.previewInvitation(token)
      .then((item) => { if (live) setPreview(item); })
      .catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : "This invitation is invalid or has expired."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token || !preview || busy) return;
    setBusy(true);
    setError("");
    try {
      await endpoints.team.acceptInvitation(token, { password });
      navigate("/my-work", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to activate your technician account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-art">
        <div className="auth-brand"><span className="brand-mark">SA</span><strong>Service Agreement Manager</strong></div>
        <div className="auth-copy">
          <span className="eyebrow">Technician onboarding</span>
          <h1>Set up your own secure login.</h1>
          <p>Your company assigns your work based on your skills and eligible branches. You only see the service work assigned to your technician account.</p>
        </div>
      </div>
      <div className="auth-panel"><div className="auth-form-wrap">
        <span className="eyebrow">One-time invitation</span>
        {loading ? <div className="center-load"><Spinner /></div> : preview ? <>
          <h2>Join {preview.company_name}</h2>
          <p className="muted">Confirm the invitation and choose your own password. The company administrator will not know your password.</p>
          <div className="form-grid">
            <div><span className="eyebrow">Name</span><strong>{preview.full_name}</strong></div>
            <div><span className="eyebrow">Invited email</span><strong>{preview.email}</strong></div>
            <div><span className="eyebrow">Expires</span><strong>{new Date(preview.expires_at).toLocaleString()}</strong></div>
          </div>
          <form className="form-grid" onSubmit={submit}>
            <label>Choose a password<Input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} required /></label>
            <p className="muted">Use at least 12 characters. This invitation can be accepted only once and expires automatically.</p>
            {error && <div className="error-banner" role="alert">{error}</div>}
            <Button disabled={busy || password.length < 12}>{busy ? "Activating account…" : "Activate technician account"}</Button>
          </form>
        </> : <>
          <h2>Invitation unavailable</h2>
          <p className="muted">{error || "This invitation is invalid or expired. Ask the company owner to send a new one."}</p>
        </>}
        <div className="auth-switch"><Link to="/login">Staff sign in</Link> · <Link to="/">Home</Link></div>
      </div></div>
    </div>
  );
}
