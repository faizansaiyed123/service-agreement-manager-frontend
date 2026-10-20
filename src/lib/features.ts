/**
 * Public registration is enabled by default so production deployments are
 * usable without a Vercel-specific environment variable. Set
 * VITE_PUBLIC_REGISTRATION=false to disable self-service sign-up explicitly.
 */
export const publicRegistrationEnabled =
  import.meta.env.VITE_PUBLIC_REGISTRATION !== "false";
