const LEGACY_SESSION_KEY = "sam.session.v1";

/**
 * Remove secrets written by versions that stored bearer tokens in localStorage.
 * Current authentication uses server-set HttpOnly cookies and never reads tokens
 * from browser storage.
 */
export function clearLegacyTokenStorage(): void {
  try {
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Storage may be unavailable in hardened browser contexts; auth remains server-controlled.
  }
}
