const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error(
    'Missing VITE_API_URL. Copy frontend/.env.example to frontend/.env and restart the dev server.',
  );
}

export const env = {
  /** API base URL, normalized without a trailing slash. */
  apiUrl: apiUrl.replace(/\/+$/, ''),
} as const;
