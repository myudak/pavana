/**
 * Upstream HTTP helpers for live providers: timeout, one retry on network/5xx,
 * identifying User-Agent, and an injectable fetch for tests (no network in CI).
 * Failures become `UpstreamError` (HTTP 502) — never fake values.
 */
import { UpstreamError } from '../domain/errors';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface HttpOptions {
  fetch?: FetchLike;
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Short label for errors and logs, e.g. "open-meteo". Never include secrets. */
  source: string;
}

const USER_AGENT = 'pavana/0.1 (+https://pavana.myudak.com)';
const DEFAULT_TIMEOUT_MS = 8_000;

async function request(url: string, opts: HttpOptions): Promise<Response> {
  const doFetch = opts.fetch ?? (globalThis.fetch as FetchLike);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await doFetch(url, {
        headers: { 'user-agent': USER_AGENT, ...opts.headers },
        signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
      if (res.status >= 500 && attempt === 0) {
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) throw new UpstreamError(opts.source, `HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      lastError = err;
    }
  }
  const reason = lastError instanceof Error ? lastError.message : 'request failed';
  throw new UpstreamError(opts.source, reason);
}

export async function fetchJson<T = unknown>(url: string, opts: HttpOptions): Promise<T> {
  const res = await request(url, opts);
  try {
    return (await res.json()) as T;
  } catch {
    throw new UpstreamError(opts.source, 'invalid JSON');
  }
}

export async function fetchText(url: string, opts: HttpOptions): Promise<string> {
  const res = await request(url, opts);
  return res.text();
}
