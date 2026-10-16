import { ResearchBundleSchema, type ResearchBundle } from '@pavana/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Panel } from '@/components/Panel';
import { QueryState } from '@/components/QueryState';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { localContributions } from './research-derive';

function ResearchContent({ bundle }: { bundle: ResearchBundle }) {
  const t = useCopy();
  const [index, setIndex] = useState(0);
  const sample = bundle.cases[index]!;
  const zone = bundle.location.timezone;
  const contribution = localContributions(bundle, sample);
  const local = [
    ...contribution.top.map((row) => ({ ...row, label: t.lab.featureLabel(row.feature) })),
    { feature: 'other', label: t.lab.other, value: null, shap: contribution.other },
  ];
  const extent = Math.max(0.01, ...local.map((row) => Math.abs(row.shap)));
  const global = bundle.features
    .map((name, i) => ({ name, value: bundle.globalImportance.meanAbsShapUgM3[i]! }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const best = [...bundle.metrics].sort((a, b) => a.maeUgM3 - b.maeUgM3)[0]!;
  const numeric = (n: number) => formatNumber(n, 2);
  const day = (iso: string) =>
    new Intl.DateTimeFormat('id-ID', {
      timeZone: zone,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  const lines = bundle.cases.map((row) => ({ ...row, time: Date.parse(row.targetAt) }));
  return (
    <div className="space-y-5">
      <header className="space-y-3 pt-6">
        <Link
          to="/prakiraan"
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          {t.lab.back}
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em]">
          <span>{t.lab.eyebrow}</span>
          <span className="rounded-full bg-state-demo/15 px-3 py-1 text-state-demo">
            {t.lab.status}
          </span>
        </div>
        <h1 className="font-heading text-5xl font-semibold tracking-tight">{t.lab.title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t.lab.introduction}
        </p>
        <p className="text-xs font-medium">
          {bundle.location.name} · {t.lab.methodology}
        </p>
        <p className="text-xs text-muted-foreground">
          {t.lab.period}: {day(bundle.cases[0]!.targetAt)} – {day(bundle.cases.at(-1)!.targetAt)}
        </p>
      </header>
      <p className="rounded-2xl border border-state-demo/25 bg-state-demo/5 p-4 text-xs leading-relaxed">
        {t.lab.scope}
      </p>
      <Panel title={t.lab.caseTitle}>
        <label className="mb-4 block space-y-2 text-xs text-muted-foreground">
          <span>{t.lab.chooseHour}</span>
          <select
            value={index}
            onChange={(event) => setIndex(Number(event.target.value))}
            className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            {bundle.cases.map((row, i) => (
              <option key={row.originAt} value={i}>
                {formatDateTime(row.targetAt, zone)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            [t.lab.target, sample.targetCamsUgM3],
            [t.lab.prediction, sample.predictionUgM3],
            [t.lab.persistence, sample.persistenceUgM3],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-foreground/5 p-3 sm:p-4">
              <p className="text-[10px] text-muted-foreground sm:text-xs">{label}</p>
              <p className="mt-2 font-heading text-2xl font-semibold tabular-nums sm:text-3xl">
                {numeric(value as number)}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">{t.lab.unit}</p>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel title={t.lab.explanationTitle}>
          <div className="mb-4 flex justify-between rounded-xl bg-foreground/5 px-3 py-2 text-xs">
            <span>{t.lab.baseline}</span>
            <span className="tabular-nums">
              {numeric(sample.baseValueUgM3)} {t.lab.unit}
            </span>
          </div>
          <ul className="space-y-3">
            {local.map((row) => (
              <li key={row.feature} className="space-y-1">
                <div className="flex justify-between gap-3 text-[11px]">
                  <span>{row.label}</span>
                  <span className="shrink-0 tabular-nums">
                    {row.shap > 0 ? '+' : ''}
                    {numeric(row.shap)}
                  </span>
                </div>
                <div className="relative h-2 rounded bg-foreground/5" aria-hidden>
                  <span className="absolute left-1/2 top-0 h-full border-l border-foreground/30" />
                  <span
                    className={`absolute h-full rounded ${row.shap >= 0 ? 'bg-primary' : 'bg-state-stale'}`}
                    style={{
                      left: `${row.shap >= 0 ? 50 : 50 - (Math.abs(row.shap) / extent) * 50}%`,
                      width: `${(Math.abs(row.shap) / extent) * 50}%`,
                    }}
                  />
                </div>
                {row.feature !== 'other' && (
                  <p className="text-[10px] text-muted-foreground">
                    {t.lab.featureValue}: {row.value === null ? t.lab.missing : numeric(row.value)}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            {t.lab.explanationNote}
          </p>
        </Panel>
        <Panel title={t.lab.globalTitle}>
          <p className="mb-4 text-[10px] text-muted-foreground">{t.lab.globalUnit}</p>
          <ul className="space-y-4">
            {global.map((row) => (
              <li key={row.name} className="space-y-1">
                <div className="flex justify-between gap-3 text-[11px]">
                  <span>{t.lab.featureLabel(row.name)}</span>
                  <span className="tabular-nums">{numeric(row.value)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-foreground/5" aria-hidden>
                  <div
                    className="h-full rounded-full bg-primary/75"
                    style={{ width: `${(row.value / Math.max(0.01, global[0]!.value)) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            {t.lab.globalNote(bundle.globalImportance.sampleN)}
          </p>
        </Panel>
      </div>
      <Panel title={t.lab.historical}>
        <div className="h-64 w-full" role="img" aria-label={t.lab.historical}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lines} margin={{ left: -15, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--pv-border)" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                minTickGap={40}
                tick={{ fontSize: 10 }}
                tickFormatter={(ms: number) =>
                  new Intl.DateTimeFormat('id-ID', {
                    timeZone: zone,
                    day: 'numeric',
                    month: 'short',
                  }).format(ms)
                }
              />
              <YAxis tick={{ fontSize: 10 }} width={48} />
              <Tooltip
                labelFormatter={(ms) => formatDateTime(new Date(Number(ms)).toISOString(), zone)}
                formatter={(value, name) => [`${numeric(Number(value))} ${t.lab.unit}`, name]}
                contentStyle={{
                  background: 'var(--pv-surface)',
                  borderColor: 'var(--pv-border)',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Line
                type="linear"
                dataKey="targetCamsUgM3"
                name={t.lab.target}
                stroke="var(--pv-ink)"
                dot={false}
                strokeWidth={1.7}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="predictionUgM3"
                name={t.lab.prediction}
                stroke="var(--pv-primary)"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="persistenceUgM3"
                name={t.lab.persistence}
                stroke="var(--pv-state-stale)"
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          {(
            [
              [t.lab.target, 'var(--pv-ink)', false],
              [t.lab.prediction, 'var(--pv-primary)', false],
              [t.lab.persistence, 'var(--pv-state-stale)', true],
            ] as const
          ).map(([label, color, dashed]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="w-5"
                style={{ borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}` }}
              />
              {label}
            </span>
          ))}
          <span>{t.lab.unit}</span>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">{t.lab.historicalNote}</p>
      </Panel>
      <Panel title={t.lab.evaluationTitle}>
        <div className="mb-4 flex flex-wrap justify-between gap-2 text-xs">
          <span className="font-medium">
            {t.lab.winner(`${best.variant} · ${t.lab.variants[best.variant]}`)}
          </span>
          <span className="text-muted-foreground">{t.lab.sampleCount(best.n)}</span>
        </div>
        <table className="w-full text-left text-xs tabular-nums">
          <thead className="text-muted-foreground">
            <tr>
              <th className="pb-3 font-normal">{t.lab.model}</th>
              <th className="pb-3 text-right font-normal">{t.lab.mae}</th>
              <th className="pb-3 text-right font-normal">{t.lab.rmse}</th>
            </tr>
          </thead>
          <tbody>
            {bundle.metrics.map((metric) => (
              <tr key={metric.variant} className="border-t border-border/60">
                <td className="py-3">
                  {metric.variant} · {t.lab.variants[metric.variant]}
                </td>
                <td className="text-right">{numeric(metric.maeUgM3)}</td>
                <td className="text-right">{numeric(metric.rmseUgM3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {t.lab.selected(bundle.modelVariant)}. {t.lab.evaluationNote} {t.lab.unit}.
        </p>
      </Panel>
      <Panel title={t.lab.provenanceTitle}>
        <p className="text-xs">
          {t.lab.source} · {bundle.runVersion}
        </p>
        <a
          href="https://huggingface.co/datasets/myudak/pavana"
          className="mt-2 inline-block text-xs underline underline-offset-4"
        >
          {t.lab.datasetLink}
        </a>
        <dl className="mt-3 space-y-2 text-[10px] text-muted-foreground">
          {[
            [t.lab.modelHash, bundle.modelSha256],
            [t.lab.dataRevision, bundle.datasetRevision],
            [t.lab.codeRevision, bundle.codeRevision],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className="mt-1 break-all font-mono">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}

export default function LabPage() {
  const t = useCopy();
  const query = useQuery({
    queryKey: ['ml-research'],
    staleTime: Infinity,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch(`${import.meta.env.BASE_URL}ml/research.json`, { signal });
      if (!response.ok) throw new Error(t.lab.loadError);
      const parsed = ResearchBundleSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error(t.lab.loadError);
      return parsed.data;
    },
  });
  return <QueryState query={query}>{(bundle) => <ResearchContent bundle={bundle} />}</QueryState>;
}
