import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { QueryState } from '@/components/QueryState';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useCopy } from '@/lib/i18n';
import { useTheme, type ThemePref } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

/**
 * Info = official links + about. Alerts (opt-in, informational only) are phase 1.5 —
 * see docs/architecture.md. Never show fake official warnings here.
 */
export function InfoPage() {
  const t = useCopy();
  const links = useQuery({
    queryKey: ['official-links'],
    queryFn: ({ signal }) => api.officialLinks(signal),
  });
  const { pref, setPref } = useTheme();

  return (
    <div className="mx-auto w-full max-w-[1344px] space-y-4 px-4 pb-28 pt-2 md:px-6 lg:px-8 lg:pb-12">
      <h1 className="pt-2 font-heading text-3xl font-bold tracking-tight">{t.info.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t.info.linksTitle}</CardTitle>
        </CardHeader>
        <QueryState query={links}>
          {(d) => (
            <ul className="divide-y divide-border">
              {d.links.map((l) => (
                <li key={l.id}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start justify-between gap-3 py-3 hover:opacity-80"
                  >
                    <span>
                      <span className="font-medium">{l.title}</span>
                      <span className="text-ink-muted"> · {l.publisher}</span>
                      <span className="block text-sm text-ink-muted">{l.description}</span>
                    </span>
                    <ExternalLink className="mt-1 size-4 shrink-0 text-ink-muted" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.info.theme}</CardTitle>
        </CardHeader>
        <div
          role="radiogroup"
          aria-label={t.info.theme}
          className="inline-flex rounded-full bg-surface-muted p-1"
        >
          {(['light', 'dark', 'system'] as ThemePref[]).map((p) => (
            <button
              key={p}
              role="radio"
              aria-checked={pref === p}
              onClick={() => setPref(p)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm',
                pref === p ? 'bg-surface font-medium text-ink shadow-sm' : 'text-ink-muted',
              )}
            >
              {t.info.themeOptions[p]}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.info.aboutTitle}</CardTitle>
        </CardHeader>
        <p className="text-sm text-ink-muted">{t.info.aboutBody}</p>
      </Card>
    </div>
  );
}
