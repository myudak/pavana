import { AbsoluteFill, interpolate, random, useCurrentFrame } from 'remotion';
import { REDDIT } from '../data/quotes';
import { color, FPS, font, s } from '../theme';

export const GUESS_MAP_DURATION = s(15);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Simplified Borneo coastline (lon, lat), clockwise from the northern tip. Illustration only.
const COAST: [number, number][] = [
  [116.85, 6.95],
  [117.25, 6.5],
  [117.7, 6.2],
  [118.1, 5.85],
  [118.6, 5.6],
  [119.25, 5.25],
  [119.0, 4.95],
  [118.5, 4.5],
  [117.9, 4.25],
  [117.65, 3.6],
  [117.5, 3.0],
  [118.0, 2.3],
  [118.3, 1.6],
  [119.0, 1.0],
  [118.0, 0.85],
  [117.6, 0.3],
  [117.55, -0.5],
  [117.05, -1.2],
  [116.55, -1.7],
  [116.25, -2.5],
  [116.2, -3.1],
  [116.1, -3.8],
  [115.6, -4.0],
  [114.6, -4.15],
  [114.5, -3.6],
  [114.0, -3.4],
  [113.4, -3.25],
  [112.9, -3.4],
  [112.2, -3.45],
  [111.75, -3.0],
  [111.3, -3.0],
  [110.4, -2.95],
  [110.1, -2.5],
  [110.0, -1.8],
  [109.65, -1.0],
  [109.25, -0.3],
  [109.1, 0.3],
  [108.95, 0.95],
  [109.05, 1.6],
  [109.65, 2.05],
  [110.3, 1.75],
  [111.0, 1.6],
  [111.3, 2.25],
  [111.8, 2.8],
  [112.6, 3.0],
  [113.15, 3.25],
  [113.9, 4.0],
  [114.2, 4.55],
  [114.9, 4.95],
  [115.4, 5.3],
  [115.9, 5.75],
  [116.1, 6.1],
  [116.5, 6.6],
];

const MAP = { left: 110, top: 70, pxPerDeg: 78, lon0: 108.5, lat0: 7.5 };
const px = ([lon, lat]: [number, number]) => [
  MAP.left + (lon - MAP.lon0) * MAP.pxPerDeg,
  MAP.top + (MAP.lat0 - lat) * MAP.pxPerDeg,
];

/** Closed Catmull-Rom spline through the coast points, as an SVG path. */
function smoothPath(points: number[][]) {
  const n = points.length;
  const p = (i: number) => points[(i + n) % n]!;
  let d = `M ${p(0)[0]} ${p(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [p1[0]! + (p2[0]! - p0[0]!) / 6, p1[1]! + (p2[1]! - p0[1]!) / 6];
    const c2 = [p2[0]! - (p3[0]! - p1[0]!) / 6, p2[1]! - (p3[1]! - p1[1]!) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return `${d} Z`;
}
const COAST_PATH = smoothPath(COAST.map(px));

function inside([lon, lat]: [number, number]) {
  let hit = false;
  for (let i = 0, j = COAST.length - 1; i < COAST.length; j = i++) {
    const [xi, yi] = COAST[i]!;
    const [xj, yj] = COAST[j]!;
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const ARROWS: { at: number[]; seed: number }[] = [];
for (let lon = 109.6; lon < 119; lon += 1.45) {
  for (let lat = -3.3; lat < 6.5; lat += 1.45) {
    if (inside([lon, lat])) ARROWS.push({ at: px([lon, lat]), seed: ARROWS.length });
  }
}

const CITIES: { name: string; at: [number, number] }[] = [
  { name: 'Pontianak', at: [109.33, -0.03] },
  { name: 'Palangka Raya', at: [113.92, -2.21] },
  { name: 'Banjarmasin', at: [114.59, -3.32] },
  { name: 'Samarinda', at: [117.15, -0.5] },
  { name: 'Kuching', at: [110.35, 1.55] },
];

const PLUMES: [number, number][] = [
  [112.4, -1.9],
  [110.7, -0.9],
  [114.7, -2.7],
  [116.3, -0.9],
];

const BUBBLE_FROM = [s(0.9), s(3.1), s(5.3), s(7.5)];
// Stack the bubbles by height (one or two lines of text) and centre the stack vertically.
const BUBBLE_H = REDDIT.map((q) => (q.text.length > 44 ? 172 : 128));
const BUBBLE_GAP = 24;
const STACK_H = BUBBLE_H.reduce((a, b) => a + b, 0) + BUBBLE_GAP * (REDDIT.length - 1);
const BUBBLE_TOP = BUBBLE_H.map(
  (_, i) => (1080 - STACK_H) / 2 + BUBBLE_H.slice(0, i).reduce((a, b) => a + b + BUBBLE_GAP, 0),
);
const HEADLINE = s(10.2);

/** 0:27 — the wind keeps "changing" and people guess where the smoke goes next. */
export function GuessMap() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const draw = interpolate(frame, [0, 36], [1, 0], clamp);
  const fill = interpolate(frame, [24, 50], [0, 1], clamp);
  const head = interpolate(frame, [HEADLINE, HEADLINE + 16], [0, 1], clamp);
  const out = interpolate(frame, [GUESS_MAP_DURATION - 12, GUESS_MAP_DURATION], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="plume" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="38" />
          </filter>
          <marker id="head" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={color.cream} />
          </marker>
        </defs>
        <path
          d={COAST_PATH}
          fill={`rgba(245, 241, 235, ${0.07 * fill})`}
          stroke="rgba(245, 241, 235, 0.7)"
          strokeWidth={2.5}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={draw}
        />
        {PLUMES.map((p, i) => {
          const [x, y] = px(p);
          const drift = Math.sin(t * 0.8 + i * 2) * 40;
          return (
            <ellipse
              key={i}
              cx={x! + drift}
              cy={y! - Math.cos(t * 0.6 + i) * 25}
              rx={150 + Math.sin(t + i) * 20}
              ry={95}
              fill="rgba(251, 191, 36, 0.33)"
              filter="url(#plume)"
              opacity={fill}
            />
          );
        })}
        {ARROWS.map(({ at, seed }) => {
          const a =
            random(`a${seed}`) * 360 +
            Math.sin(t * (0.9 + random(`b${seed}`)) + seed) * 150 +
            Math.sin(t * 2.4 + seed * 3) * 40;
          const len = 30;
          const rad = (a * Math.PI) / 180;
          const appear = interpolate(frame, [20 + seed * 1.5, 34 + seed * 1.5], [0, 1], clamp);
          return (
            <line
              key={seed}
              x1={at[0]! - Math.cos(rad) * len}
              y1={at[1]! - Math.sin(rad) * len}
              x2={at[0]! + Math.cos(rad) * len}
              y2={at[1]! + Math.sin(rad) * len}
              stroke={color.cream}
              strokeOpacity={0.75 * appear}
              strokeWidth={3}
              strokeLinecap="round"
              markerEnd={appear > 0.5 ? 'url(#head)' : undefined}
            />
          );
        })}
        {CITIES.map(({ name, at }) => {
          const [x, y] = px(at);
          return (
            <g key={name} opacity={fill}>
              <circle cx={x} cy={y} r={7} fill={color.amber} />
              <text
                x={x! + 14}
                y={y! + 7}
                fill={color.cream}
                fontFamily={font.heading}
                fontWeight={700}
                fontSize={24}
              >
                {name}
              </text>
            </g>
          );
        })}
        {[
          [112.0, 1.2],
          [115.6, 2.6],
          [113.2, -0.6],
        ].map((p, i) => {
          const [x, y] = px(p as [number, number]);
          const pop = Math.max(0, Math.sin(t * 1.6 + i * 2.1));
          return (
            <text
              key={i}
              x={x}
              y={y}
              fill={color.amber}
              fontFamily={font.display}
              fontWeight={800}
              fontSize={60 + pop * 30}
              opacity={pop * fill}
              textAnchor="middle"
            >
              ?
            </text>
          );
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: MAP.left,
          bottom: 40,
          fontFamily: font.heading,
          fontSize: 20,
          color: 'rgba(245, 241, 235, 0.6)',
          opacity: fill,
        }}
      >
        Ilustrasi — bukan data angin sebenarnya
      </div>

      {REDDIT.map((q, i) => (
        <Bubble key={q.id} quote={q} slot={i} local={frame - BUBBLE_FROM[i]!} dim={head} />
      ))}

      <AbsoluteFill
        style={{
          background: 'rgba(7, 9, 15, 0.72)',
          opacity: head,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            transform: `translateY(${(1 - head) * 30}px)`,
            fontFamily: font.heading,
            fontWeight: 800,
            fontSize: 104,
            letterSpacing: '-0.03em',
            color: color.cream,
            textAlign: 'center',
          }}
        >
          Semua orang <span style={{ color: color.amber }}>menebak</span>
          <br />
          arah asap.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Bubble({
  quote,
  slot,
  local,
  dim,
}: {
  quote: (typeof REDDIT)[number];
  slot: number;
  local: number;
  dim: number;
}) {
  if (local < 0) return null;
  const enter = interpolate(local, [0, 12], [0, 1], clamp);
  const place = 'place' in quote ? ` · ${quote.place}` : '';
  return (
    <div
      style={{
        position: 'absolute',
        left: 1040,
        top: BUBBLE_TOP[slot],
        width: 800,
        padding: '22px 30px 26px',
        borderRadius: 30,
        borderTopLeftRadius: 8,
        background: 'rgba(23, 27, 46, 0.86)',
        border: `1.5px solid ${color.glassBorder}`,
        opacity: enter * (1 - dim * 0.6),
        transform: `translateX(${(1 - enter) * 60}px) scale(${0.96 + enter * 0.04})`,
        color: color.cream,
        fontFamily: font.heading,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 20,
          color: color.inkMuted,
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 999,
            background: 'rgba(245, 241, 235, 0.16)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 800,
            color: color.cream,
          }}
        >
          r/
        </span>
        <span style={{ fontWeight: 700, color: color.cream }}>warganet</span>
        <span>
          r/indonesia{place} · {quote.date}
        </span>
      </div>
      <div style={{ marginTop: 10, fontSize: 34, fontWeight: 600, lineHeight: 1.3 }}>
        {quote.text}
      </div>
    </div>
  );
}
