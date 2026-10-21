/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_REGISTRATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
