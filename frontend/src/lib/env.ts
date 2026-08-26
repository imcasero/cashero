const apiUrl = import.meta.env.VITE_API_URL

if (!apiUrl) {
  throw new Error(
    'Falta VITE_API_URL. Copia frontend/.env.example a frontend/.env y reinicia el dev server.',
  )
}

export const env = {
  /** URL base de la API, normalizada sin barra final. */
  apiUrl: apiUrl.replace(/\/+$/, ''),
} as const
