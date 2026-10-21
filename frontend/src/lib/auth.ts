const STORAGE_KEY = 'cashero.apiKey';

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Returns the stored API key, or null if none (or storage is unavailable). */
export function getApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Storage unavailable (private mode, blocked site data): the session just won't persist.
  }
  notify();
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
  notify();
}

/** Subscribes to key changes; shaped for useSyncExternalStore. Returns the unsubscribe fn. */
export function subscribeApiKey(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
