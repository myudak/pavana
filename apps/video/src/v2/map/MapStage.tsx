import { AbsoluteFill, Img, random, staticFile } from 'remotion';
import regional from '../../../../../fixtures/regional-kalimantan-hotspots.json';
import scenario from '../../../../../fixtures/scenario-kubu-raya.json';
import model from '../../data/model-demo.json';
import { project, pxPerDegLon, type ViewName } from './projection';

// Demo hotspots (synthetic fixtures, labelled "data demo" on screen), aged against the
// scenario reference time like the app does (apps/web/src/features/map/hotspot-style.ts).
const REF = Date.parse(scenario.meta.referenceTime);
export const AGE_COLORS = ['#ff4b3e', '#ff8c42', '#ffc857', '#b39a8c'] as const;
const AGE_HOURS = [6, 24, 48];

export const HOTSPOTS = [...scenario.hotspots, ...regional.hotspots].map((h, i) => {
  const age = Math.max(0, (REF - Date.parse(h.acquiredAt)) / 3_600_000);
  const cls = AGE_HOURS.findIndex((a) => age < a);
  return {
    lon: h.lon,
    lat: h.lat,
    frp: h.frpMw ?? 1,
    age: cls === -1 ? 3 : cls,
    order: random(`hs-${i}`),
  };
});

// Demo wind: the scenario's south-easterly (FROM ~134°) so air flows to the north-west.
const FLOW = ((134 + 180) * Math.PI) / 180;
const FLOW_X = Math.sin(FLOW);
const FLOW_Y = -Math.cos(FLOW);

interface Props {
  view: ViewName;
  /** Seconds since the overlays started, for continuous motion. */
  t: number;
  /** 0–1 share of hotspots drawn (in a random order). */
  hotspots?: number;
  /** Pulse new detections. */
  pulse?: boolean;
  wind?: number;
  /** 0–1 length of smoke-direction trails from the strongest detections. */
  trails?: number;
  /** 0–1 reveal of the model risk grid (sweeps west to east). */
  risk?: number;
  /** Dim the basemap (0 none – 1 black). */
  dim?: number;
  /** Divides marker sizes, so dots keep their size while the whole stage is scaled up. */
  markerScale?: number;
}

/** A captured CARTO Dark Matter view with animated overlays projected on top. */
export function MapStage({
  view,
  t,
  hotspots = 0,
  pulse = false,
  wind = 0,
  trails = 0,
  risk = 0,
  dim = 0.15,
  markerScale = 1,
}: Props) {
  const cell = pxPerDegLon(view) * 0.25;
  const trailSources = HOTSPOTS.filter((h) => h.age <= 1)
    .sort((a, b) => b.frp - a.frp)
    .slice(0, 40);

  return (
    <AbsoluteFill>
      <Img src={staticFile(`map/${view}.jpg`)} style={{ width: 1920, height: 1080 }} />
      <AbsoluteFill style={{ background: `rgba(7, 9, 15, ${dim})` }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          {AGE_COLORS.map((c, i) => (
            <radialGradient key={c} id={`halo-${i}`}>
              <stop offset="0" stopColor={c} stopOpacity="0.55" />
              <stop offset="1" stopColor={c} stopOpacity="0" />
            </radialGradient>
          ))}
          <linearGradient id="trail" x1="0" x2="1">
            <stop offset="0" stopColor="#f472b6" stopOpacity="0.9" />
            <stop offset="1" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {risk > 0 &&
          model.risk.cells.map((c) => {
            if (c.p === null) return null;
            const [x, y] = project(view, c.lon, c.lat);
            const reveal = Math.max(0, Math.min(1, risk * 1.4 - (x / 1920) * 0.4));
            return (
              <rect
                key={c.id}
                x={x - cell / 2}
                y={y - cell / 2}
                width={cell}
                height={cell}
                fill={riskColor(c.p)}
                opacity={reveal * (0.18 + 0.7 * c.p)}
              />
            );
          })}

        {wind > 0 &&
          Array.from({ length: 260 }, (_, i) => {
            const speed = 50 + random(`ws${i}`) * 50;
            const life = 2.4 + random(`wl${i}`) * 1.6;
            const phase = (t / life + random(`wp${i}`)) % 1;
            const x0 = random(`wx${i}`) * 2300 - 190;
            const y0 = random(`wy${i}`) * 1300 - 110;
            const d = phase * speed * life;
            const wob = Math.sin(t * 0.7 + i) * 18;
            const x = x0 + FLOW_X * d + wob * -FLOW_Y;
            const y = y0 + FLOW_Y * d + wob * FLOW_X;
            const len = 26;
            const a = Math.sin(phase * Math.PI) * 0.65 * wind;
            return (
              <line
                key={`w${i}`}
                x1={x - FLOW_X * len}
                y1={y - FLOW_Y * len}
                x2={x}
                y2={y}
                stroke="#c4b5fd"
                strokeOpacity={a}
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}

        {trails > 0 && (
          <g filter="url(#glow)">
            {trailSources.map((h, i) => {
              const [x, y] = project(view, h.lon, h.lat);
              const len = (90 + h.frp * 6) * trails * (view === 'kuburaya' ? 2.4 : 1);
              const bend = Math.sin(i * 1.7) * 0.25;
              const ex = x + (FLOW_X * Math.cos(bend) - FLOW_Y * Math.sin(bend)) * len;
              const ey = y + (FLOW_Y * Math.cos(bend) + FLOW_X * Math.sin(bend)) * len;
              return (
                <line
                  key={`t${i}`}
                  x1={x}
                  y1={y}
                  x2={ex}
                  y2={ey}
                  stroke="#f472b6"
                  strokeOpacity={0.55}
                  strokeWidth={view === 'kuburaya' ? 10 : 5}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        )}

        {hotspots > 0 &&
          HOTSPOTS.map((h, i) => {
            if (h.order > hotspots) return null;
            const [x, y] = project(view, h.lon, h.lat);
            if (x < -20 || x > 1940 || y < -20 || y > 1100) return null;
            const r =
              ((view === 'kuburaya' ? 7 : 3) +
                Math.min(h.frp, 40) * (view === 'kuburaya' ? 0.35 : 0.08)) /
              markerScale;
            const born = Math.min(1, (hotspots - h.order) * 12);
            const ring = pulse && h.age === 0 ? (t * 0.9 + h.order) % 1 : null;
            return (
              <g key={`h${i}`}>
                <circle cx={x} cy={y} r={r * 2.6} fill={`url(#halo-${h.age})`} opacity={born} />
                <circle
                  cx={x}
                  cy={y}
                  r={r * (0.6 + 0.4 * born) + (1 - born) * 6}
                  fill={AGE_COLORS[h.age]}
                  opacity={0.95 * born}
                  stroke="#140f1c"
                  strokeWidth={view === 'kuburaya' ? 2 : 0.6}
                />
                {ring !== null && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + ring * 26}
                    fill="none"
                    stroke={AGE_COLORS[0]}
                    strokeOpacity={(1 - ring) * 0.8}
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 28,
          bottom: 18,
          fontFamily: 'Arial, sans-serif',
          fontSize: 16,
          color: 'rgba(238,240,244,0.55)',
        }}
      >
        © OpenStreetMap contributors © CARTO
      </div>
    </AbsoluteFill>
  );
}

/** Sequential amber → red → magenta ramp for model probabilities. */
export function riskColor(p: number) {
  const stops = [
    [0, [251, 191, 36]],
    [0.4, [249, 115, 22]],
    [0.7, [239, 68, 68]],
    [1, [236, 72, 153]],
  ] as const;
  for (let i = 1; i < stops.length; i++) {
    const [p1, c1] = stops[i]!;
    const [p0, c0] = stops[i - 1]!;
    if (p <= p1) {
      const k = (p - p0) / (p1 - p0);
      const c = c0.map((v, j) => Math.round(v + (c1[j]! - v) * k));
      return `rgb(${c.join(',')})`;
    }
  }
  return 'rgb(236,72,153)';
}
