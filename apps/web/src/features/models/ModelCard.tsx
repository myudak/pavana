import { AiBrain01Icon } from '@hugeicons/core-free-icons';
import { windFromToFlowBearing, type ModelFactor } from '@pavana/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useCopy } from '@/lib/i18n';
import { useHaze, useHotspotRisk, usePm25Model, useWindModel } from '@/lib/queries';

const pct = (p: number) => `${p < 0.01 ? '<1' : Math.round(p * 100)}%`;
const stamp = (s: string | null | undefined) =>
  s
    ? new Date(s).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'short',
      }) + ' WIB'
    : '—';

function Factors({ factors, unit }: { factors: ModelFactor[]; unit: string }) {
  const t = useCopy().model;
  return (
    <div className="mt-3 space-y-1">
      <p className="text-xs text-muted-foreground">
        {t.why} · {unit}
      </p>
      {factors.slice(0, 3).map((f) => (
        <div key={f.feature} className="flex justify-between gap-2 text-xs">
          <span>
            {f.value === null
              ? t.factorLabel(f.feature)
              : (t.factor[f.feature]?.(f.value) ?? t.factorLabel(f.feature))}
          </span>
          <span className="shrink-0 font-mono tabular-nums">
            {f.shap > 0 ? '+' : ''}
            {f.shap.toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  );
}

function RunDetails({
  version,
  input,
  target,
  report,
  source,
  children,
}: {
  version?: string;
  input?: string | null;
  target?: string | null;
  report?: string | null;
  source?: 'iem' | 'noaa-awc' | null;
  children?: ReactNode;
}) {
  const t = useCopy().model;
  return (
    <details className="mt-3 border-t border-foreground/10 pt-2">
      <summary className="cursor-pointer text-xs font-medium text-primary-strong">
        {t.details}
      </summary>
      <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
        <div>
          <dt className="inline">{t.inputTime}: </dt>
          <dd className="inline">{stamp(input)}</dd>
        </div>
        {report && (
          <div>
            <dt className="inline">{t.reportTime}: </dt>
            <dd className="inline">{stamp(report)}</dd>
          </div>
        )}
        {source && <div>{t.metarSource(source)}</div>}
        <div>
          <dt className="inline">{t.targetTime}: </dt>
          <dd className="inline">{stamp(target)}</dd>
        </div>
        <div className="break-all font-mono">{version}</div>
      </dl>
      {children}
    </details>
  );
}

function Mode({ demo }: { demo: boolean | undefined }) {
  const t = useCopy().model;
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {demo ? t.replay : t.live}
    </span>
  );
}
function Missing({ codes }: { codes?: string[] }) {
  const t = useCopy().model;
  return (
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
      {codes?.length ? [...new Set(codes)].map(t.reason).join(' ') : t.unknownWhy}
    </p>
  );
}
function Value({ value, unit }: { value: string | null | undefined; unit?: string }) {
  const t = useCopy().model;
  return (
    <p className="mt-2 text-3xl font-semibold tabular-nums">
      {value ?? <span className="text-base text-muted-foreground">{t.unknown}</span>}
      {value && unit && (
        <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
      )}
    </p>
  );
}

/** Each output retains its own reference, origin, target and replay state. */
export function ModelCard({ compact = false }: { compact?: boolean }) {
  const copy = useCopy();
  const t = copy.model;
  const risk = useHotspotRisk(),
    haze = useHaze(),
    pm = usePm25Model(),
    wind = useWindModel();
  const p = pm.isError ? undefined : pm.data,
    r = risk.isError ? undefined : risk.data,
    h = haze.isError ? undefined : haze.data,
    w = wind.isError ? undefined : wind.data;
  const replay = [p, r, h, w].some((d) => d?.provenance.isDemo);
  const hs = h?.stations.find((s) => s.p6h !== null || s.p24h !== null) ?? h?.stations[0],
    ws = w?.stations.find((s) => s.speedMs !== null) ?? w?.stations[0];
  const box = 'rounded-2xl border border-foreground/5 bg-foreground/5 p-4';
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-state-demo/15">
          <Icon icon={AiBrain01Icon} className="text-state-demo" />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">{t.title}</h2>
            <span className="rounded-full bg-state-stale/15 px-2 py-0.5 text-[11px] font-semibold text-state-stale">
              {t.badge}
            </span>
          </div>
          {!compact && <p className="text-sm text-muted-foreground">{t.intro}</p>}
          {replay && <p className="text-xs text-state-demo">{t.demo}</p>}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
        <section className={box}>
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h3 className="text-sm font-medium">{t.pm25Title}</h3>
            {p && <Mode demo={p.provenance.isDemo} />}
          </div>
          {pm.isPending ? (
            <Skeleton className="mt-2 h-16 rounded-xl" />
          ) : (
            <>
              <Value value={p?.pm25UgM3 == null ? null : p.pm25UgM3.toFixed(1)} unit="µg/m³" />
              {p && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.referenceAt(p.reference.name, p.reference.distanceKm)}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{t.pm25Note}</p>
              {p?.targetAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.targetTime}: {stamp(p.targetAt)}
                </p>
              )}
              {p?.pm25UgM3 == null && <Missing codes={p?.missing} />}
              {!compact && (
                <RunDetails version={p?.model.version} input={p?.inputAt} target={p?.targetAt}>
                  {p && <Factors factors={p.factors} unit={t.pm25Shap} />}
                </RunDetails>
              )}
            </>
          )}
        </section>
        <section className={box}>
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h3 className="text-sm font-medium">{t.windTitle}</h3>
            {w && <Mode demo={w.provenance.isDemo} />}
          </div>
          {wind.isPending ? (
            <Skeleton className="mt-2 h-16 rounded-xl" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                {ws?.directionFromDeg != null && (
                  <span
                    role="img"
                    aria-label={t.windValue(ws.speedMs!, ws.directionFromDeg)}
                    className="inline-block text-3xl text-primary-strong"
                    style={{
                      transform: `rotate(${windFromToFlowBearing(ws.directionFromDeg)}deg)`,
                    }}
                  >
                    ↑
                  </span>
                )}
                <Value value={ws?.speedMs == null ? null : ws.speedMs.toFixed(1)} unit="m/s" />
              </div>
              {ws?.targetAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.targetTime}: {stamp(ws.targetAt)}
                </p>
              )}
              {ws && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.referenceAt(ws.name, ws.distanceKm)}
                </p>
              )}
              {ws?.speedMs != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {ws.directionFromDeg === null
                    ? t.calmDirection
                    : t.windValue(ws.speedMs, ws.directionFromDeg)}
                </p>
              )}
              {!compact && <p className="mt-2 text-xs text-muted-foreground">{t.windNote}</p>}
              {ws?.speedMs == null && <Missing codes={ws?.missing ?? w?.missing} />}
              {!compact && (
                <RunDetails
                  version={w?.model.version}
                  input={ws?.inputAt}
                  report={ws?.reportAt}
                  source={ws?.inputProvider}
                  target={ws?.targetAt}
                >
                  {ws && (
                    <>
                      <Factors factors={ws.factorsU} unit={t.windShapU} />
                      <Factors factors={ws.factorsV} unit={t.windShapV} />
                    </>
                  )}
                </RunDetails>
              )}
            </>
          )}
        </section>
        <section className={box}>
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h3 className="text-sm font-medium">{t.hazeTitle}</h3>
            {h && <Mode demo={h.provenance.isDemo} />}
          </div>
          {haze.isPending ? (
            <Skeleton className="mt-2 h-16 rounded-xl" />
          ) : (
            <>
              <div className="flex gap-6">
                <div>
                  <Value value={hs?.p6h == null ? null : pct(hs.p6h)} />
                  <p className="text-xs text-muted-foreground">{t.in6h}</p>
                </div>
                <div>
                  <Value value={hs?.p24h == null ? null : pct(hs.p24h)} />
                  <p className="text-xs text-muted-foreground">{t.in24h}</p>
                </div>
              </div>
              {hs?.target6hAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.targetTime} t+6: {stamp(hs.target6hAt)}
                </p>
              )}
              {hs && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.hazeAt(hs.name, hs.distanceKm)}
                </p>
              )}
              {hs?.p6h == null && <Missing codes={hs?.missing ?? h?.missing} />}
              {!compact && (
                <RunDetails
                  version={h ? `${h.models.h6.version} · ${h.models.h24.version}` : undefined}
                  input={hs?.issueAt}
                  report={hs?.reportAt}
                  source={hs?.inputProvider}
                  target={hs?.target6hAt}
                >
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.in24h}: {stamp(hs?.target24hAt)}
                  </p>
                  {hs && (
                    <>
                      <Factors factors={hs.factors6h} unit={`${t.in6h} · ${t.logOdds}`} />
                      <Factors factors={hs.factors24h} unit={`${t.in24h} · ${t.logOdds}`} />
                    </>
                  )}
                </RunDetails>
              )}
            </>
          )}
        </section>
        <section className={box}>
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h3 className="text-sm font-medium">{t.riskTitle}</h3>
            {r && <Mode demo={r.provenance.isDemo} />}
          </div>
          {risk.isPending ? (
            <Skeleton className="mt-2 h-16 rounded-xl" />
          ) : (
            <>
              <Value
                value={r?.focus?.cell.probability == null ? null : pct(r.focus.cell.probability)}
              />
              {r && <p className="mt-1 text-xs text-muted-foreground">{t.riskWhen(r.targetDay)}</p>}
              {r?.focus && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.gridReference(r.focus.cell.lat, r.focus.cell.lon)}
                </p>
              )}
              {r && !r.focus ? (
                <p className="mt-1 text-xs text-muted-foreground">{t.outsideGrid}</p>
              ) : (
                r?.focus?.cell.probability == null && <Missing codes={r?.missing} />
              )}
              {!compact && (
                <>
                  <p className="mt-2 text-xs text-muted-foreground">{t.riskNote}</p>
                  <RunDetails
                    version={r?.model.version}
                    input={r ? `${r.issueDay}T23:59:59Z` : null}
                    target={r ? `${r.targetDay}T00:00:00Z` : null}
                  >
                    {r?.focus && <Factors factors={r.focus.factors} unit={t.logOdds} />}
                  </RunDetails>
                </>
              )}
            </>
          )}
        </section>
      </div>
      {!compact && <p className="mt-3 text-xs text-muted-foreground">{t.shapNote}</p>}
      <Link
        to={compact ? '/prakiraan' : '/lab-ml'}
        className="inline-flex pt-3 text-sm font-medium text-primary-strong underline underline-offset-4"
      >
        {compact ? copy.nav.forecast : t.open}
      </Link>
    </Panel>
  );
}
