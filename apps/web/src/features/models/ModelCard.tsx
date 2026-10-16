import { AiBrain01Icon } from '@hugeicons/core-free-icons';
import type { ModelFactor } from '@pavana/shared';
import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useCopy } from '@/lib/i18n';
import { useHaze, useHotspotRisk } from '@/lib/queries';

const pct = (p: number) => `${p < 0.01 ? '<1' : Math.round(p * 100)}%`;

function Factors({ factors }: { factors: ModelFactor[] }) {
  const t = useCopy().model;
  const top = factors.slice(0, 3);
  if (!top.length) return null;
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {t.why}
      </p>
      <ul className="mt-1 space-y-1 text-sm">
        {top.map((f) => {
          const text =
            f.value === null ? `${f.feature}: ${t.unknown}` : (t.factor[f.feature]?.(f.value) ?? f.feature);
          return (
            <li key={f.feature} className="flex items-baseline gap-2">
              <span className={f.shap > 0 ? 'text-state-stale' : 'text-primary-strong'} aria-hidden>
                {f.shap > 0 ? '▲' : '▼'}
              </span>
              <span>
                {text} <span className="text-muted-foreground">({f.shap > 0 ? t.raises : t.lowers})</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Prob({ p }: { p: number | null }) {
  const t = useCopy().model;
  return p === null ? (
    <span className="text-lg font-semibold text-muted-foreground">{t.unknown}</span>
  ) : (
    <span className="text-3xl font-semibold tabular-nums">{pct(p)}</span>
  );
}

/** "Model Pavana (eksperimental)": served observed-target models with SHAP explanations. */
export function ModelCard() {
  const t = useCopy().model;
  const risk = useHotspotRisk();
  const haze = useHaze();
  const station = haze.data?.stations[0];
  const demo = risk.data?.state === 'demo' || haze.data?.state === 'demo';

  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-state-demo/15">
          <Icon icon={AiBrain01Icon} className="text-state-demo" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">{t.title}</h2>
            <span className="rounded-full bg-state-stale/15 px-2 py-0.5 text-[11px] font-semibold text-state-stale ring-1 ring-state-stale/30">
              {t.badge}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{t.intro}</p>
          {demo && <p className="text-xs font-medium text-state-demo">{t.demo}</p>}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
        <div className="rounded-2xl bg-foreground/5 p-3">
          <p className="text-sm font-medium">{t.riskTitle}</p>
          {risk.isPending ? (
            <Skeleton className="mt-2 h-16 w-full rounded-xl" />
          ) : risk.isError || !risk.data ? (
            <p className="mt-2 text-sm text-muted-foreground">{t.unknownWhy}</p>
          ) : !risk.data.focus ? (
            <p className="mt-2 text-sm text-muted-foreground">{t.outsideGrid}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{t.riskWhen(risk.data.targetDay)}</p>
              <div className="mt-1">
                <Prob p={risk.data.focus.cell.probability} />
              </div>
              {risk.data.focus.cell.probability === null && (
                <p className="text-xs text-muted-foreground">{t.unknownWhy}</p>
              )}
              {risk.data.focus.observed !== null && (
                <p className="text-xs text-muted-foreground">
                  {risk.data.focus.observed ? t.observedYes : t.observedNo}
                </p>
              )}
              <Factors factors={risk.data.focus.factors} />
              <p className="mt-2 text-xs text-muted-foreground">
                {t.metrics(
                  risk.data.model.test.model.rocAuc ?? Number.NaN,
                  risk.data.model.test.persistence.rocAuc ?? Number.NaN,
                  risk.data.model.testWindow[0].slice(0, 4),
                  risk.data.model.testWindow[1].slice(0, 4),
                )}{' '}
                {t.riskNote}
              </p>
            </>
          )}
        </div>

        <div className="rounded-2xl bg-foreground/5 p-3">
          <p className="text-sm font-medium">{t.hazeTitle}</p>
          {haze.isPending ? (
            <Skeleton className="mt-2 h-16 w-full rounded-xl" />
          ) : haze.isError || !station ? (
            <p className="mt-2 text-sm text-muted-foreground">{t.unknownWhy}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{t.hazeAt(station.name, station.distanceKm)}</p>
              <div className="mt-1 flex flex-wrap gap-6">
                <div>
                  <Prob p={station.p6h} />
                  <p className="text-xs text-muted-foreground">{t.in6h}</p>
                </div>
                <div>
                  <Prob p={station.p24h} />
                  <p className="text-xs text-muted-foreground">{t.in24h}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t.visibilityNow(station.visibilityKm)}</p>
              {station.p6h === null && <p className="text-xs text-muted-foreground">{t.unknownWhy}</p>}
              <Factors factors={station.factors6h} />
              {haze.data && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t.metrics(
                    haze.data.models.h6.test.model.rocAuc ?? Number.NaN,
                    haze.data.models.h6.test.persistence.rocAuc ?? Number.NaN,
                    haze.data.models.h6.testWindow[0].slice(0, 4),
                    haze.data.models.h6.testWindow[1].slice(0, 4),
                  )}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{t.shapNote}</p>
      <Link
        to="/lab-ml"
        className="inline-flex pt-2 text-sm font-medium text-primary-strong underline underline-offset-4"
      >
        {t.open}
      </Link>
    </Panel>
  );
}
