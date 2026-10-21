const LEGACY_SESSION_KEY = "sam.session.v1";

export function clearLegacyTokenStorage(): void {
  try {
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
  }
}
