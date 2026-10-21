import { clearApiKey, getApiKey } from './auth';
import { env } from './env';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': getApiKey() ?? '',
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, `Could not connect to ${env.apiUrl}`);
  }

  if (response.status === 401 || response.status === 403) {
    // The stored key was rejected: drop it so the UI goes back to the login prompt.
    clearApiKey();
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `${init?.method ?? 'GET'} ${path} responded ${response.status}`,
    );
  }

  // DELETE answers 204 with no body, and json() would throw on it.
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

export type Health = {
  status: string;
};

export function getHealth(signal?: AbortSignal): Promise<Health> {
  return apiFetch<Health>('/health', { signal });
}

/**
 * Checks a candidate key against a protected endpoint (/health is public, so it can't).
 * Resolves true/false for accepted/rejected; throws ApiError(0) when the API is unreachable.
 */
export async function verifyApiKey(key: string, signal?: AbortSignal): Promise<boolean> {
  let response: Response;

  try {
    response = await fetch(`${env.apiUrl}/db-check`, { headers: { 'X-API-Key': key }, signal });
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    throw new ApiError(0, `Could not connect to ${env.apiUrl}`);
  }

  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok)
    throw new ApiError(response.status, `GET /db-check responded ${response.status}`);
  return true;
}
