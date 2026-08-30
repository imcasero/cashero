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
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, `No se pudo conectar con ${env.apiUrl}`);
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `${init?.method ?? 'GET'} ${path} respondio ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

export type Health = {
  status: string;
};

export function getHealth(signal?: AbortSignal): Promise<Health> {
  return apiFetch<Health>('/health', { signal });
}
