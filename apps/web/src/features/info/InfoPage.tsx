import {
  ArrowUpRight01Icon,
  ComputerIcon,
  Moon02Icon,
  Notification03Icon,
  Sun03Icon,
} from '@hugeicons/core-free-icons';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { QueryState } from '@/components/QueryState';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { api } from '@/lib/api';
import { useCopy } from '@/lib/i18n';
import { useTheme, type ThemePref } from '@/lib/theme-context';
import { DataModePanel, SourcesPanel } from './DataPanels';

const THEME_ICON = { light: Sun03Icon, dark: Moon02Icon, system: ComputerIcon } as const;

/**
 * Info = official links, planned alerts, theme, about. Never show fake official
 * warnings here; alerts are marked as not built yet.
 */
export function InfoPage() {
  const t = useCopy();
  const links = useQuery({
    queryKey: ['official-links'],
    queryFn: ({ signal }) => api.officialLinks(signal),
  });
  const { pref, setPref } = useTheme();

  return (
    <div className="space-y-4 pt-4 sm:pt-8">
      <h1 className="font-heading text-4xl font-bold tracking-tight drop-shadow-sm">
        {t.info.title}
      </h1>

      <div className="grid items-start gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel title={t.info.linksTitle} className="order-2 lg:order-1">
          <QueryState query={links} inline>
            {(d) => (
              <ul className="divide-y divide-foreground/10">
                {d.links.map((l) => (
                  <li key={l.id}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-start justify-between gap-3 py-3 first:pt-0"
                    >
                      <span className="min-w-0">
                        <span className="font-medium group-hover:underline">{l.title}</span>
                        <span className="text-muted-foreground"> · {l.publisher}</span>
                        <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                          {l.description}
                        </span>
                      </span>
                      <Icon
                        icon={ArrowUpRight01Icon}
                        className="mt-0.5 size-4 text-muted-foreground"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Panel>

        <div className="order-1 space-y-4 lg:order-2">
          <DataModePanel />
          <SourcesPanel />
          <Panel>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-foreground/5">
                <Icon icon={Notification03Icon} className="text-muted-foreground" />
              </span>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{t.alerts.title}</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
                    {t.alerts.status}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{t.alerts.body}</p>
              </div>
            </div>
          </Panel>

          <Panel title={t.info.theme}>
            <ToggleGroup
              type="single"
              value={pref}
              onValueChange={(v) => v && setPref(v as ThemePref)}
              className="w-full rounded-full bg-foreground/5 p-1"
              aria-label={t.info.theme}
            >
              {(['light', 'dark', 'system'] as ThemePref[]).map((p) => (
                <ToggleGroupItem
                  key={p}
                  value={p}
                  className="h-9 flex-1 gap-1.5 rounded-full data-[state=on]:bg-card data-[state=on]:shadow-sm"
                >
                  <Icon icon={THEME_ICON[p]} className="size-4" />
                  {t.info.themeOptions[p]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Panel>

          <Panel title={t.info.aboutTitle}>
            <p className="text-sm leading-relaxed text-muted-foreground">{t.info.aboutBody}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
