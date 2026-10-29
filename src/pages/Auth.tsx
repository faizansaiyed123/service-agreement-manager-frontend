import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { endpoints } from "../lib/api";
import { publicRegistrationEnabled } from "../lib/features";
import { Button, Input } from "../components/ui";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    companyName: "",
  });
  const [error, setError] = useState("");
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (mode === "login") {
        await endpoints.auth.login({
          email: form.email,
          password: form.password,
        });
        navigate(location.state?.from?.pathname || "/dashboard", {
          replace: true,
        });
      } else {
        const result = await endpoints.auth.register({
          email: form.email,
          password: form.password,
          full_name: form.fullName,
          company_name: form.companyName,
        });

        if ("authenticated" in result) {
          navigate("/dashboard", { replace: true });
        } else {
          setRegistrationMessage(result.message);
        }
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to authenticate",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-art">
        <div className="auth-brand">
          <span className="brand-mark">SA</span>
          <strong>Service Agreement Manager</strong>
        </div>
        <div className="auth-copy">
          <span className="eyebrow">Operations, contracts & billing</span>
          <h1>Run the service business from one calm workspace.</h1>
          <p>Keep customers, agreements, maintenance, work orders and receivables connected to one tenant-safe backend.</p>
          <div className="auth-metric">
            <strong>One source of truth.</strong>
            <span>Every page in this workspace talks to the real API.</span>
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">
            {mode === "login" ? "Welcome back" : "New workspace"}
          </span>
          <h2>{mode === "login" ? "Sign in" : "Create your company"}</h2>
          <p className="muted">
            {mode === "login"
              ? "Use your account to continue."
              : "Create the owner account and company together."}
          </p>

          {mode === "register" && registrationMessage ? (
            <div className="form-grid">
              <div className="success-banner" role="status">
                {registrationMessage}
              </div>
              <p className="muted">If this address can be registered, a verification email will be sent. Open the link and choose your final password. If no email arrives, return to sign in or use password recovery.</p>
              {error && (
                <div className="error-banner" role="alert">
                  {error}
                </div>
              )}
              <Button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const result = await endpoints.auth.resendVerification({
                      email: form.email,
                    });
                    setRegistrationMessage(result.message);
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Unable to resend verification",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Sending…" : "Resend verification email"}
              </Button>
              <div className="auth-switch">
                <Link to="/login">Back to sign in</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="form-grid">
              {mode === "register" && (
                <>
                  <label>
                    Company name
                    <Input
                      value={form.companyName}
                      onChange={(event) =>
                        setForm({ ...form, companyName: event.target.value })
                      }
                      minLength={2}
                      required
                    />
                  </label>
                  <label>
                    Your name
                    <Input
                      value={form.fullName}
                      onChange={(event) =>
                        setForm({ ...form, fullName: event.target.value })
                      }
                      minLength={2}
                      required
                    />
                  </label>
                </>
              )}
              <label>
                Email
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Password
                <div style={{ display: "flex", gap: 8 }}>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "register" ? 12 : 1}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 18,
                    }}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </label>
              {error && (
                <div className="error-banner" role="alert">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={busy}>
                {busy
                  ? "Working…"
                  : mode === "login"
                    ? "Sign in"
                    : "Create workspace"}
              </Button>
            </form>
          )}

          <div className="auth-switch">
            {mode === "login" ? (
              publicRegistrationEnabled ? (
                <>
                  Need a workspace? <Link to="/register">Create one</Link>
                </>
              ) : (
                <>
                  Need access? Ask your workspace administrator to create your
                  account.
                </>
              )
            ) : (
              <>
                Already have an account? <Link to="/login">Sign in</Link>
              </>
            )}
          </div>

          {mode === "login" && (
            <div className="auth-switch">
              <Link to="/forgot-password">Forgot your password?</Link>
            </div>
          )}
          <div className="auth-switch">
            <Link to="/">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
