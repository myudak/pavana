/**
 * Small TTL cache with in-flight de-duplication, per warm serverless instance.
 * Concurrent requests for the same key share one upstream call; failures are not cached.
 * The CDN (Cache-Control s-maxage) is the main cache; this one protects upstream limits.
 */
export class TtlCache {
  private readonly values = new Map<string, { expires: number; value: unknown }>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {}

  async get<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = this.values.get(key);
    if (hit && hit.expires > this.now()) return hit.value as T;
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<T>;

    const p = load()
      .then((value) => {
        this.set(key, value, ttlMs);
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  private set(key: string, value: unknown, ttlMs: number) {
    this.values.delete(key);
    this.values.set(key, { expires: this.now() + ttlMs, value });
    // Drop the oldest insertions beyond the cap (Map keeps insertion order).
    while (this.values.size > this.maxEntries) {
      const oldest = this.values.keys().next().value;
      if (oldest === undefined) break;
      this.values.delete(oldest);
    }
  }
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
