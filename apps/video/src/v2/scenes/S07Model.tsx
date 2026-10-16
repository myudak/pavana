import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import model from '../../data/model-demo.json';
import { color, font, s } from '../../theme';
import { clamp, Glass, Label, ramp, useSceneFade } from '../kit';
import { MapStage } from '../map/MapStage';
import { project } from '../map/projection';

// Real model output (PR #12 boosters evaluated on their archived demo inputs; see
// src/data/model-demo.json). Factor wording mirrors apps/web i18n `models.factor`.
const FACTOR_TEXT: Record<string, (v: number) => string> = {
  det_cell_7d: (v) => `${v} deteksi titik panas di sel ini dalam 7 hari`,
  det_nbr_7d: (v) => `${v} deteksi titik panas di sekitar dalam 7 hari`,
  cell_hist_rate: (v) => `Sel ini punya deteksi pada ${(v * 100).toFixed(1)}% hari di 2015–2021`,
  det_cell_1d: (v) => `${v} deteksi titik panas kemarin di sel ini`,
  dry_days: (v) => `${v} hari berturut-turut tanpa hujan berarti`,
  precip_1d_mm: (v) => `Hujan kemarin ${v.toFixed(1)} mm`,
};
const top = model.risk.top;
const topObserved = model.risk.cells.find((c) => c.id === top.id)?.observed;
const test = model.risk.test;
const pontianak = model.haze.stations.find((st) => st.icao === 'WIOO')!;
const CARD = s(4.2);

/** 1:10 — the hotspot-risk grid fills Kalimantan; one cell is explained with SHAP. */
export function S07Model() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useSceneFade(10, 10);
  const grid = ramp(frame, 8, s(3.6));
  const [tx, ty] = project('borneo', top.lon, top.lat);
  const ring = ramp(frame, s(3.4), s(4.2));
  const card = ramp(frame, CARD, CARD + 16);
  const pct = Math.round((top.p ?? 0) * 100 * ramp(frame, CARD + 8, CARD + 40));
  const maxShap = Math.max(...top.factors.map((f) => Math.abs(f.shap)));
  const mapShift = interpolate(card, [0, 1], [0, -260], clamp);

  return (
    <AbsoluteFill style={{ opacity: fade, background: '#07090f' }}>
      <AbsoluteFill style={{ transform: `translateX(${mapShift}px)` }}>
        <MapStage view="borneo" t={frame / fps} risk={grid} dim={0.35} />
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <circle
            cx={tx}
            cy={ty}
            r={30 + (1 - ring) * 80}
            fill="none"
            stroke="#fff"
            strokeWidth={4}
            opacity={ring}
          />
          <circle cx={tx} cy={ty} r={6} fill="#fff" opacity={ring} />
        </svg>
      </AbsoluteFill>

      <Glass
        style={{
          position: 'absolute',
          right: 70,
          top: 130,
          width: 720,
          padding: '34px 40px',
          opacity: card,
          transform: `translateX(${(1 - card) * 120}px)`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#bfc3d0' }}>
            Risiko titik panas besok
          </div>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: 99,
              background: 'rgba(251,191,36,0.15)',
              color: color.amber,
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Eksperimental
          </span>
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: font.display,
            fontSize: 120,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: '#f472b6',
          }}
        >
          {pct}%
        </div>
        <div style={{ fontSize: 22, color: '#9ca3af' }}>
          Sel 0,25° di Kalimantan Tengah · {top.lat.toFixed(2)}°, {top.lon.toFixed(2)}°
        </div>

        <div
          style={{
            marginTop: 26,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 1,
            color: '#bfc3d0',
          }}
        >
          FAKTOR TERBESAR (SHAP)
        </div>
        {top.factors.map((f, i) => {
          const p = ramp(frame, CARD + 30 + i * 12, CARD + 48 + i * 12);
          const label = FACTOR_TEXT[f.feature]?.(f.value) ?? f.feature;
          return (
            <div key={f.feature} style={{ marginTop: 16, opacity: p }}>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{label}</div>
              <div
                style={{
                  marginTop: 8,
                  height: 12,
                  borderRadius: 99,
                  background: 'rgba(238,240,244,0.08)',
                }}
              >
                <div
                  style={{
                    width: `${(Math.abs(f.shap) / maxShap) * 100 * p}%`,
                    height: '100%',
                    borderRadius: 99,
                    background: f.shap > 0 ? 'linear-gradient(90deg,#fb923c,#f472b6)' : '#60a5fa',
                  }}
                />
              </div>
            </div>
          );
        })}
        <div
          style={{
            marginTop: 22,
            fontSize: 20,
            color: '#9ca3af',
            opacity: ramp(frame, CARD + 70, CARD + 84),
          }}
        >
          {topObserved !== undefined &&
            (topObserved ? 'Kenyataannya: terjadi deteksi. ' : 'Kenyataannya: tidak terjadi. ')}
          Uji {test.model.n.toLocaleString('id-ID')} sel-hari 2024–2025: ROC-AUC{' '}
          {test.model.rocAuc.toFixed(2).replace('.', ',')} (persistence{' '}
          {test.persistence.rocAuc.toFixed(2).replace('.', ',')}).
        </div>
      </Glass>

      <Glass
        style={{
          position: 'absolute',
          right: 70,
          bottom: 140,
          width: 720,
          padding: '22px 30px',
          opacity: ramp(frame, s(8.4), s(9)),
        }}
        radius={24}
      >
        <div style={{ fontSize: 22, color: '#bfc3d0', fontWeight: 700 }}>
          Asap tebal (jarak pandang &lt; 3 km) · 24 jam
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span
            style={{ fontFamily: font.display, fontSize: 56, fontWeight: 800, color: color.amber }}
          >
            {Math.round((pontianak.p24 ?? 0) * 100)}%
          </span>
          <span style={{ fontSize: 24 }}>{pontianak.name}</span>
        </div>
        <div style={{ fontSize: 18, color: '#9ca3af' }}>
          Dilatih dari laporan METAR bandara 2015–2021, diuji 2024–2025 · replay 24 Jul 2025
        </div>
      </Glass>

      <Label tone="warn">Model eksperimental · replay input arsip nyata 14 Sep 2026</Label>
    </AbsoluteFill>
  );
}
