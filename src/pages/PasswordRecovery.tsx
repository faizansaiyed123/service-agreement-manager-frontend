import type { FormEvent } from "react";
import { useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
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

export function VerifyEmailPage() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    // Remove the single-use verification secret from browser history immediately.
    if (token && window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setError("This verification link is missing its token. Return to signup to request a new link.");
      return;
    }
    if (password.length < 12 || password.length > 128) {
      setError("Choose a password between 12 and 128 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      await endpoints.auth.verifyEmail({ token, new_password: password });
      setMessage("Email verified and password set. Your workspace owner account is ready to sign in.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to verify email");
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-layout">
    <div className="auth-art"><div className="auth-brand"><span className="brand-mark">SA</span><strong>Service Agreement Manager</strong></div><div className="auth-copy"><span className="eyebrow">Email verification</span><h1>Confirm your email to activate your workspace.</h1><p>The verification link is single-use and expires automatically.</p></div></div>
    <div className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow">Confirm email</span><h2>Verify your email address</h2>
      {!message && <form className="form-grid" onSubmit={submit}>
        <p className="muted">Choose your password after opening the email link. This ensures only the mailbox owner knows the final password.</p>
        <label>Choose password<Input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required /></label>
        <label>Confirm password<Input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirm} onChange={event => setConfirm(event.target.value)} required /></label>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <Button disabled={busy || !token}>{busy ? "Verifying…" : "Verify email and set password"}</Button>
      </form>}
      {message && <div className="success-banner" role="status">{message}</div>}
      {message && <div className="auth-switch"><Link to="/login">Sign in</Link></div>}
      {!token && <div className="auth-switch"><Link to="/register">Back to registration</Link></div>}
    </div></div>
  </div>;
}

export function ResetPasswordPage() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
  useLayoutEffect(() => {
    // Remove the single-use secret from the address bar and browser history immediately.
    if (token && window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [token]);
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
