import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { endpoints } from "../lib/api";
import { Button, Input } from "../components/ui";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError("");
    try {
      const result = await endpoints.auth.forgotPassword({ email });
      setMessage(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to request reset");
    } finally { setBusy(false); }
  }

  return <div className="auth-layout">
    <div className="auth-art"><div className="auth-brand"><span className="brand-mark">SA</span><strong>Service Agreement Manager</strong></div><div className="auth-copy"><span className="eyebrow">Account recovery</span><h1>Get back into your workspace securely.</h1><p>We will enqueue a reset message without revealing whether an account exists.</p></div></div>
    <div className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow">Password reset</span><h2>Request a reset link</h2><form className="form-grid" onSubmit={submit}><label>Email<Input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>{message && <div className="success-banner">{message}</div>}{error && <div className="error-banner">{error}</div>}<Button disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button></form><div className="auth-switch"><Link to="/login">Back to sign in</Link></div></div></div>
  </div>;
}

export function ResetPasswordPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.hash.slice(1)).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (!token) { setError("This reset link is missing its token."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      await endpoints.auth.resetPassword({ token, new_password: password });
      setMessage("Password changed. All previous sessions have been revoked.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reset password");
    } finally { setBusy(false); }
  }

  return <div className="auth-layout">
    <div className="auth-art"><div className="auth-brand"><span className="brand-mark">SA</span><strong>Service Agreement Manager</strong></div><div className="auth-copy"><span className="eyebrow">Secure recovery</span><h1>Choose a new password.</h1><p>Reset links expire and can only be used once.</p></div></div>
    <div className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow">New password</span><h2>Reset your password</h2><form className="form-grid" onSubmit={submit}><label>New password<Input type="password" minLength={12} value={password} onChange={event => setPassword(event.target.value)} required /></label><label>Confirm password<Input type="password" minLength={12} value={confirm} onChange={event => setConfirm(event.target.value)} required /></label>{message && <div className="success-banner">{message} <Link to="/login">Sign in</Link></div>}{error && <div className="error-banner">{error}</div>}<Button disabled={busy || Boolean(message)}>{busy ? "Resetting…" : "Set new password"}</Button></form></div></div>
  </div>;
}
