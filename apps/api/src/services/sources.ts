import type { SourceInfo, SourcesResponse } from '@pavana/shared';
import type { ProviderBundle } from '../providers/types';

const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

/**
 * Status of each upstream source. Checks reuse the providers' caches (cheap), run in
 * parallel, and never throw: a failing source is reported, not hidden.
 */
export async function getSources(p: ProviderBundle): Promise<SourcesResponse> {
  const checkedAt = iso(new Date());
  if (p.isDemo || !p.sources) {
    return {
      mode: p.mode,
      sources: [
        {
          id: 'pavana-fixture',
          name: 'Skenario demo Pavana',
          use: 'Data sintetis Kubu Raya untuk demonstrasi',
          status: 'fixture',
          checkedAt,
          detail: null,
          attribution: 'Data ilustratif — bukan pengamatan nyata',
          url: 'https://pavana.myudak.com/',
        },
      ],
    };
  }
  const sources = await Promise.all(
    p.sources.map(async (s): Promise<SourceInfo> => {
      const base = {
        id: s.id,
        name: s.name,
        use: s.use,
        attribution: s.attribution,
        url: s.url,
        checkedAt,
      };
      if (!s.configured) return { ...base, status: 'not_configured', detail: null };
      try {
        await s.check();
        return { ...base, status: 'ok', detail: null };
      } catch (err) {
        const detail = err instanceof Error ? err.message.slice(0, 160) : 'unavailable';
        return { ...base, status: 'error', detail };
      }
    }),
  );
  return { mode: p.mode, sources };
}
