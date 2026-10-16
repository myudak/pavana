import type { BinaryMetrics, ModelEvaluation, RegressionEvaluation } from '@pavana/shared';
import { Panel } from '@/components/Panel';
import { QueryState } from '@/components/QueryState';
import { useCopy } from '@/lib/i18n';
import { ApiRequestError } from '@/lib/api';
import { useModelEvaluation } from '@/lib/queries';

const f = (v: number | null, d = 3) => (v === null || Number.isNaN(v) ? '—' : v.toFixed(d));

function MetricsTable({ m }: { m: ModelEvaluation['test'] }) {
  const t = useCopy().modelLab;
  const rows: [string, BinaryMetrics][] = [
    [t.model, m.model],
    [t.persistence, m.persistence],
    [t.climatology, m.climatology],
    ...(m.recentActivity ? [[t.recentActivity, m.recentActivity] as [string, BinaryMetrics]] : []),
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1 pr-3 font-medium">{t.method}</th>
            <th className="py-1 pr-3 font-medium">ROC-AUC</th>
            <th className="py-1 pr-3 font-medium">PR-AUC</th>
            <th className="py-1 pr-3 font-medium">Brier</th>
            <th className="py-1 font-medium">{t.brierSkill}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, r]) => (
            <tr key={name} className="border-t border-foreground/10">
              <td className="py-1 pr-3">{name}</td>
              <td className="py-1 pr-3">{f(r.rocAuc)}</td>
              <td className="py-1 pr-3">{f(r.prAuc)}</td>
              <td className="py-1 pr-3">{f(r.brier, 4)}</td>
              <td className="py-1">{f(r.brierSkill)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Calibration({ bins }: { bins: ModelEvaluation['calibration'] }) {
  const t = useCopy().modelLab;
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-muted-foreground">{t.calibration}</p>
      <ul className="mt-1 space-y-1 text-xs tabular-nums">
        {bins.map((b) => (
          <li key={b.lo} className="flex items-center gap-2">
            <span className="w-20 shrink-0">
              {Math.round(b.lo * 100)}–{Math.round(b.hi * 100)}%
            </span>
            <span className="relative h-2 flex-1 rounded-full bg-foreground/10">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-primary/60"
                style={{ width: `${Math.min(100, b.observedRate * 100)}%` }}
              />
            </span>
            <span className="w-28 shrink-0 text-right text-muted-foreground">
              {t.observed(b.observedRate, b.n)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RegressionPanel({ m }: { m: RegressionEvaluation }) {
  const copy = useCopy();
  const t = copy.modelLab;
  const rows = [
    [t.model, m.test.model],
    [t.persistence, m.test.persistence],
    [t.climatology, m.test.climatology],
  ] as const;
  return (
    <Panel title={`${m.title} · ${t.badge}`}>
      <p className="text-sm font-medium text-primary-strong">
        {m.targetKind === 'model' ? t.camsTarget : t.stationTarget}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t.windows(m.windows['train'], m.windows['validation'], m.windows['test'])} · {m.version}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm tabular-nums">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">{t.method}</th>
              <th className="py-2 pr-3 font-medium">
                {m.id === 'wind' ? t.vectorRmse : t.mae} ({m.unit})
              </th>
              <th className="py-2 pr-3 font-medium">
                {m.id === 'wind' ? t.speedMae : t.rmse} ({m.unit})
              </th>
              {m.id === 'wind' && <th className="py-2 font-medium">{t.directionMae}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, v]) => (
              <tr key={name} className="border-t border-foreground/10">
                <td className="py-2 pr-3">{name}</td>
                <td className="py-2 pr-3">{f('vectorRmse' in v ? v.vectorRmse : v.mae)}</td>
                <td className="py-2 pr-3">{f('speedMae' in v ? v.speedMae : v.rmse)}</td>
                {'directionMaeDeg' in v && <td className="py-2">{f(v.directionMaeDeg, 1)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t.regressionRows(m.test.model.n)}</p>
      {m.id === 'wind' && <p className="mt-2 text-xs text-muted-foreground">{t.windShap}</p>}
      {'directionN' in m.test.model && (
        <p className="mt-1 text-xs text-muted-foreground">
          {t.directionRows(m.test.model.directionN)}
        </p>
      )}
      <p className="mt-3 text-xs font-medium text-muted-foreground">
        {t.scalarImportance} · {m.shapUnit}
      </p>
      <ol className="mt-1 space-y-1 text-xs">
        {m.importance.slice(0, 8).map((r) => (
          <li key={r.feature} className="flex justify-between gap-2 tabular-nums">
            <span>
              {r.feature.includes(':')
                ? `${r.feature.split(':')[0]} · ${copy.model.factorLabel(r.feature.split(':')[1]!)}`
                : copy.model.factorLabel(r.feature)}
            </span>
            <span>{f(r.meanAbsShap)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        {m.id === 'pm25' ? copy.model.pm25Note : copy.model.windNote}
      </p>
    </Panel>
  );
}

/** Evaluation of the models the app serves (observed targets), beside the CAMS research. */
export function ServedModelsEvaluation() {
  const copy = useCopy();
  const t = copy.modelLab;
  const query = useModelEvaluation();
  if (query.error instanceof ApiRequestError && query.error.status === 404) {
    return (
      <Panel title={t.notAvailableTitle}>
        <p className="text-sm text-muted-foreground">{t.notAvailableBody}</p>
      </Panel>
    );
  }
  return (
    <QueryState query={query}>
      {(d) => (
        <div className="space-y-4">
          {d.models.map((m) => (
            <Panel key={m.id} title={`${m.title} · ${t.badge}`}>
              <p className="text-sm text-muted-foreground">{t.targetText(m.id)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.windows(m.windows['train'], m.windows['validation'], m.windows['test'])} ·{' '}
                {m.version}
              </p>
              <div className="mt-3">
                <MetricsTable m={m.test} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.counts(m.test.model.n, m.test.model.positives)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{t.brierDefinition}</p>
              <Calibration bins={m.calibration} />
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">{t.importance}</p>
                <ol className="mt-1 space-y-0.5 text-xs">
                  {m.importance.slice(0, 8).map((r) => (
                    <li key={r.feature} className="flex justify-between gap-2 tabular-nums">
                      <span>{copy.model.factorLabel(r.feature)}</span>
                      <span className="text-muted-foreground">{r.meanAbsShap.toFixed(3)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Panel>
          ))}
          {d.regressionModels.map((m) => (
            <RegressionPanel key={m.id} m={m} />
          ))}
          <p className="px-1 text-xs text-muted-foreground">{t.note}</p>
        </div>
      )}
    </QueryState>
  );
}
