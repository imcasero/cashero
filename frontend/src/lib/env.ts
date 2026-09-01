const apiUrl = import.meta.env.VITE_API_URL;
const apiKey = import.meta.env.VITE_API_KEY;

if (!apiUrl) {
  throw new Error(
    'Missing VITE_API_URL. Copy frontend/.env.example to frontend/.env and restart the dev server.',
  );
}

if (!apiKey) {
  throw new Error(
    'Missing VITE_API_KEY. It must match API_KEY in backend/.env. Restart the dev server after setting it.',
  );
}

export const env = {
  /** API base URL, normalized without a trailing slash. */
  apiUrl: apiUrl.replace(/\/+$/, ''),
  /** Static key sent on every request as the X-API-Key header. */
  apiKey,
} as const;
