import { AbsoluteFill, interpolate, random, useCurrentFrame } from 'remotion';
import { HazeBackground } from '../../components/HazeBackground';
import { SourcePill } from '../../components/QuoteCard';
import { BURNED_STAT } from '../../data/quotes';
import { color, font, s } from '../../theme';
import { Embers, shake } from '../fx';
import { clamp, countUp, ramp, useSceneFade } from '../kit';

const NUM_LAND = s(2.6);
const PEAT = s(6.9);

/** 0:00 — the burned area counts up and lands; then a peat cross-section: fire creeping
 *  underground, smoke surfacing and drifting to a house (illustration). */
export function S01Hook() {
  const frame = useCurrentFrame();
  const fade = useSceneFade(1, 12);
  const numIn = ramp(frame, 4, 20);
  const numOut = ramp(frame, PEAT - 12, PEAT + 6);
  const push = interpolate(frame, [0, PEAT], [1.12, 1.02], clamp);

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <HazeBackground />
      </AbsoluteFill>
      <Embers count={80} strength={1 - numOut * 0.3} />

      {frame < PEAT + 8 && (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            opacity: numIn * (1 - numOut),
            transform: `${shake(frame, NUM_LAND)} scale(${1 + numOut * 0.15})`,
          }}
        >
          <div
            style={{
              fontFamily: font.display,
              fontWeight: 800,
              fontSize: 260,
              letterSpacing: '-0.05em',
              lineHeight: 1,
              color: color.amber,
              textShadow: '0 0 90px rgba(255,140,40,0.55)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {countUp(frame, 6, NUM_LAND, BURNED_STAT.value, 2)}
          </div>
          <div
            style={{
              marginTop: 14,
              fontFamily: font.heading,
              fontWeight: 800,
              fontSize: 56,
              color: color.cream,
              opacity: ramp(frame, NUM_LAND - 6, NUM_LAND + 8),
            }}
          >
            {BURNED_STAT.label}
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: font.heading,
              fontSize: 30,
              color: 'rgba(245,241,235,0.8)',
              opacity: ramp(frame, NUM_LAND, NUM_LAND + 14),
            }}
          >
            {BURNED_STAT.asOf}
          </div>
          <div style={{ marginTop: 22, opacity: ramp(frame, NUM_LAND + 10, NUM_LAND + 24) }}>
            <SourcePill>{BURNED_STAT.source}</SourcePill>
          </div>
        </AbsoluteFill>
      )}

      {frame >= PEAT - 6 && <PeatSection local={frame - PEAT} />}
    </AbsoluteFill>
  );
}

const GROUND = 520;

function PeatSection({ local }: { local: number }) {
  const enter = ramp(local, -6, 14);
  const burn = interpolate(local, [10, s(5.2)], [0.08, 0.86], clamp);
  const t = local / 30;
  const fireX = 160 + burn * 1500;
  const vents = [0.22, 0.4, 0.58, 0.74].map((v) => 160 + v * 1500).filter((x) => x < fireX - 40);
  const house = ramp(local, s(4), s(4.8));

  return (
    <AbsoluteFill style={{ opacity: enter, transform: `translateY(${(1 - enter) * 60}px)` }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="peat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b2a1a" />
            <stop offset="1" stopColor="#120c07" />
          </linearGradient>
          <linearGradient id="smolder" x1="0" x2="1">
            <stop offset="0" stopColor="#ff6a2b" stopOpacity="0.15" />
            <stop offset="0.85" stopColor="#ff8c42" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffd166" />
          </linearGradient>
          <radialGradient id="smoke">
            <stop offset="0" stopColor="#c9b8a0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#c9b8a0" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Soil layers */}
        <rect x={0} y={GROUND} width={1920} height={560} fill="url(#peat)" />
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M0 ${GROUND + 110 + i * 120} Q 480 ${GROUND + 90 + i * 120} 960 ${GROUND + 115 + i * 120} T 1920 ${GROUND + 105 + i * 120}`}
            stroke="rgba(255,220,180,0.06)"
            strokeWidth={3}
            fill="none"
          />
        ))}
        {/* Surface vegetation */}
        {Array.from({ length: 70 }, (_, i) => {
          const x = i * 28 + random(`g${i}`) * 14;
          const h = 18 + random(`gh${i}`) * 34;
          const burnt = x < fireX - 60;
          return (
            <line
              key={i}
              x1={x}
              y1={GROUND}
              x2={x + 4}
              y2={GROUND - h}
              stroke={burnt ? '#2a2018' : '#3f6b3a'}
              strokeWidth={5}
              strokeLinecap="round"
            />
          );
        })}
        {/* Underground smouldering front */}
        <path
          d={`M 140 ${GROUND + 190} C ${fireX * 0.4} ${GROUND + 150}, ${fireX * 0.7} ${GROUND + 230}, ${fireX} ${GROUND + 170}`}
          stroke="url(#smolder)"
          strokeWidth={26}
          strokeLinecap="round"
          fill="none"
          opacity={0.95}
        />
        <circle
          cx={fireX}
          cy={GROUND + 170}
          r={34 + Math.sin(t * 9) * 5}
          fill="#ffb347"
          opacity={0.45}
        />
        <circle cx={fireX} cy={GROUND + 170} r={16} fill="#fff1c1" opacity={0.9} />
        {/* Smoke vents rising and drifting right */}
        {vents.map((vx, k) =>
          Array.from({ length: 7 }, (_, j) => {
            const ph = (t * 0.35 + j / 7 + k * 0.13) % 1;
            const cx = vx + ph * 260 + Math.sin(ph * 6 + k) * 20;
            const cy = GROUND - ph * 420;
            return (
              <circle
                key={`${k}-${j}`}
                cx={cx}
                cy={cy}
                r={30 + ph * 110}
                fill="url(#smoke)"
                opacity={(1 - ph) * 0.9}
              />
            );
          }),
        )}
        {/* House */}
        <g transform={`translate(1640 ${GROUND - 150})`} opacity={house}>
          <path d="M0 70 L80 0 L160 70 Z" fill="#e8dcc8" />
          <rect x={18} y={70} width={124} height={80} fill="#e8dcc8" />
          <rect x={64} y={100} width={32} height={50} fill="#4a3826" />
          <rect x={102} y={86} width={26} height={22} fill="#ffd166" opacity={0.85} />
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 140,
          top: GROUND + 260,
          fontFamily: font.heading,
          fontSize: 40,
          fontWeight: 800,
          color: '#ffd8a8',
          opacity: ramp(local, 20, 34),
        }}
      >
        Api menjalar di bawah permukaan gambut
      </div>
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 140,
          width: 600,
          textAlign: 'right',
          fontFamily: font.heading,
          fontSize: 40,
          fontWeight: 800,
          color: color.cream,
          opacity: house,
        }}
      >
        …dan asapnya sampai ke rumah warga
      </div>
      <div
        style={{
          position: 'absolute',
          left: 140,
          bottom: 140,
          fontFamily: font.heading,
          fontSize: 22,
          color: 'rgba(245,241,235,0.6)',
        }}
      >
        Ilustrasi
      </div>
    </AbsoluteFill>
  );
}
