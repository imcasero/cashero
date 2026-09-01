/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FastAPI backend, without a trailing slash. */
  readonly VITE_API_URL: string;
  /** Static key sent as the X-API-Key header; must match backend API_KEY. */
  readonly VITE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
