/* eslint-disable react-refresh/only-export-components -- this module is a registry of tool renderers (TOOL_UIS). */
import type { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { Tick02Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import type { ExposureLevel, UsAqiCategory } from '@pavana/shared';
import { useState, type ReactNode } from 'react';
import { AqCategoryPill } from '@/components/AqCategoryPill';
import { Icon } from '@/components/Icon';
import { ChevronDown, Flame, ShieldAlert, Check } from '@/components/icons';
import { WindDial } from '@/features/today/ConditionTiles';
import { formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { windSummary } from '@/lib/wind';
import type { ToolName } from './demo-script';

/** Shared frame: friendly tool name, running → done status, collapsible args. */
function ToolCard({
  toolName,
  args,
  running,
  children,
}: {
  toolName: ToolName;
  args: Record<string, unknown>;
  running: boolean;
  children?: ReactNode;
}) {
  const t = useCopy();
  const c = t.chat.tools;
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 overflow-hidden rounded-2xl bg-foreground/5 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2 px-3 py-2">
        <span
          className={cn(
            'flex size-6 items-center justify-center rounded-full',
            running ? 'bg-primary/15 text-primary' : 'bg-exp-none/20 text-exp-none',
          )}
        >
          <Icon
            icon={running ? Loading03Icon : Tick02Icon}
            className={cn('size-3.5', running && 'motion-safe:animate-spin')}
          />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{c.names[toolName]}</span>
        <span className="text-[11px] text-muted-foreground">{running ? c.running : c.done}</span>
      </div>
      {!running && children && <div className="border-t border-foreground/10 p-3">{children}</div>}
      {!running && (
        <div className="border-t border-foreground/10 px-3 py-1.5">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
            {c.details}
          </button>
          {open && (
            <div className="mt-1 space-y-1 pb-1 text-[11px] text-muted-foreground">
              <code className="block break-all rounded-lg bg-foreground/5 px-2 py-1">
                {toolName}({JSON.stringify(args)})
              </code>
              <p>{c.source}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const EXP_BG: Record<ExposureLevel, string> = {
  none: 'bg-exp-none',
  low: 'bg-exp-low',
  moderate: 'bg-exp-moderate',
  high: 'bg-exp-high',
  unknown: 'bg-exp-unknown',
};

interface AirResult {
  pm25UgM3: number;
  aqi: number;
  category: UsAqiCategory;
  peakUgM3: number;
  peakAt: string;
}
interface HotspotResult {
  considered: number;
  upwind: number;
  radiusKm: number;
  windowHours: number;
}
interface WindResult {
  fromDeg: number;
  speedKmh: number;
}
interface ReachResult {
  level: ExposureLevel;
  elevated: string;
  peakAt: string;
  hours: ExposureLevel[];
}
interface AdviceResult {
  actions: string[];
}

function AirBody({ r }: { r: AirResult }) {
  const t = useCopy();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-heading text-3xl font-semibold tabular">
          {formatNumber(r.pm25UgM3, 1)}
        </span>
        <span className="text-sm text-muted-foreground">{t.today.unit} PM2.5</span>
        <AqCategoryPill category={r.category} />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t.today.heroDesc[r.category]}
      </p>
      <p className="text-xs font-medium text-exp-high">
        {t.chat.tools.peak(formatNumber(r.peakUgM3, 1), r.peakAt)}
      </p>
    </div>
  );
}

function HotspotBody({ r }: { r: HotspotResult }) {
  const t = useCopy();
  const c = t.chat.tools;
  return (
    <div className="flex gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-exp-high/15">
        <Flame className="size-5 text-exp-high" />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="font-heading text-2xl font-semibold tabular">
          {r.considered}{' '}
          <span className="text-sm font-normal text-muted-foreground">{c.detections}</span>
        </p>
        <p className="text-sm font-medium text-exp-high">{c.upwind(r.upwind)}</p>
        <p className="text-xs text-muted-foreground">{c.radius(r.radiusKm, r.windowHours)}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{c.hotspotNote}</p>
      </div>
    </div>
  );
}

function WindBody({ r }: { r: WindResult }) {
  const t = useCopy();
  const w = windSummary(r.fromDeg, t);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-heading text-xl font-semibold">{t.tiles.windFrom(w.fromName)}</p>
        <p className="text-sm text-muted-foreground">
          {t.chat.tools.windTo(w.toName.toLowerCase())}
        </p>
      </div>
      <div className="scale-75 origin-right">
        <WindDial toDeg={w.toDeg} speedKmh={r.speedKmh} />
      </div>
    </div>
  );
}

function ReachBody({ r }: { r: ReachResult }) {
  const t = useCopy();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-semibold text-white',
            EXP_BG[r.level],
          )}
        >
          {t.exposure.level[r.level]}
        </span>
        <span className="text-sm font-medium">{t.exposure.headline[r.level]}</span>
      </div>
      <div className="flex h-8 items-end gap-[2px]" aria-hidden>
        {r.hours.map((lvl, i) => (
          <span
            key={i}
            className={cn('flex-1 rounded-sm', EXP_BG[lvl])}
            style={{ height: lvl === 'high' ? '100%' : lvl === 'moderate' ? '60%' : '35%' }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {t.chat.tools.axis.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <p className="text-xs">
        {r.elevated} · {t.exposure.peakAt(r.peakAt)}
      </p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t.chat.tools.exposureNote}
      </p>
    </div>
  );
}

function AdviceBody({ r }: { r: AdviceResult }) {
  const t = useCopy();
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {r.actions.map((a) => (
          <li key={a} className="flex gap-2 text-sm leading-relaxed">
            <Check className="mt-0.5 size-4 text-primary" />
            {a}
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldAlert className="size-3.5" />
        {t.chat.tools.adviceNote}
      </p>
    </div>
  );
}

function make<R>(
  toolName: ToolName,
  Body: (p: { r: R }) => ReactNode,
): ToolCallMessagePartComponent {
  return function ToolUI({ args, result, status }) {
    const running = status.type === 'running' || result === undefined;
    return (
      <ToolCard toolName={toolName} args={args as Record<string, unknown>} running={running}>
        {result !== undefined && <Body r={result as R} />}
      </ToolCard>
    );
  };
}

/** Tool renderers by name, for <MessagePrimitive.Parts components={{ tools }} />. */
export const TOOL_UIS: Record<ToolName, ToolCallMessagePartComponent> = {
  cek_kualitas_udara: make<AirResult>('cek_kualitas_udara', AirBody),
  cek_titik_panas: make<HotspotResult>('cek_titik_panas', HotspotBody),
  cek_angin: make<WindResult>('cek_angin', WindBody),
  apakah_asap_sampai: make<ReachResult>('apakah_asap_sampai', ReachBody),
  saran_kesehatan: make<AdviceResult>('saran_kesehatan', AdviceBody),
};
