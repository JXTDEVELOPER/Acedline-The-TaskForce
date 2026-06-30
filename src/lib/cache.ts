export const apiCache = new Map<string, { timestamp: number; data: any }>();

export const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

export function getCached<T>(key: string): T | null {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }
  return null;
}

export function setCached<T>(key: string, data: T): void {
  apiCache.set(key, { timestamp: Date.now(), data });
}

export function clearCache(): void {
  apiCache.clear();
}
