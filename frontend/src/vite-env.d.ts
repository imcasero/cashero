/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API de FastAPI, sin barra final. */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
