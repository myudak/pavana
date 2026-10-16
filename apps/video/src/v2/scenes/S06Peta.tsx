import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { color, font, s } from '../../theme';
import { clamp, Glass, Label, ramp, useSceneFade } from '../kit';
import { AGE_COLORS, MapStage } from '../map/MapStage';
import { project, VIEWS } from '../map/projection';

const ZOOM_END = s(2.6);
const K = 2 ** (VIEWS.kuburaya.zoom - VIEWS.borneo.zoom);
const [FX, FY] = project('borneo', VIEWS.kuburaya.center[0]!, VIEWS.kuburaya.center[1]!);
const AGES = ['< 6 jam', '6–24 jam', '24–48 jam', '> 48 jam'];

/** 0:58 — the redesigned map: fly in to Kubu Raya, detections by age, wind, smoke trails. */
export function S06Peta() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const fade = useSceneFade(10, 10);
  const z = ramp(frame, 6, ZOOM_END);
  const k = Math.pow(K, z);
  const cross = interpolate(z, [0.72, 0.98], [0, 1], clamp);
  const trails = ramp(frame, s(9.8), s(13));
  const fresh = ramp(frame, s(5.9), s(6.5)) * (1 - ramp(frame, s(9.2), s(9.8)));
  const hours = Math.round(6 * trails);

  return (
    <AbsoluteFill style={{ opacity: fade, background: '#07090f' }}>
      {cross < 1 && (
        <AbsoluteFill
          style={{
            transformOrigin: `${FX}px ${FY}px`,
            transform: `translate(${(960 - FX) * z}px, ${(540 - FY) * z}px) scale(${k})`,
          }}
        >
          <MapStage view="borneo" t={t} hotspots={1} dim={0.2} markerScale={k} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ opacity: cross, transform: `scale(${k / K})` }}>
        <MapStage
          view="kuburaya"
          t={t}
          hotspots={1}
          pulse
          wind={ramp(frame, s(9.2), s(10.2))}
          trails={trails}
          dim={0.1}
        />
      </AbsoluteFill>

      {/* Legend: detection age. */}
      <Glass
        style={{
          position: 'absolute',
          left: 64,
          top: 64,
          padding: '20px 26px',
          opacity: ramp(frame, s(3), s(3.6)),
        }}
        radius={24}
      >
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
          Titik panas · umur deteksi
        </div>
        <div style={{ display: 'flex', gap: 22 }}>
          {AGES.map((a, i) => (
            <div
              key={a}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 20,
                color: '#bfc3d0',
              }}
            >
              <span
                style={{ width: 16, height: 16, borderRadius: 99, background: AGE_COLORS[i] }}
              />
              {a}
            </div>
          ))}
        </div>
      </Glass>

      {/* Smoke-direction slider. */}
      <Glass
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 130,
          padding: '22px 32px',
          opacity: ramp(frame, s(9.4), s(10)),
        }}
        radius={26}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          <span>Arah sebaran asap</span>
          <span style={{ color: '#f472b6' }}>+{hours} jam</span>
        </div>
        <div
          style={{
            position: 'relative',
            marginTop: 16,
            height: 10,
            borderRadius: 99,
            background: 'rgba(238,240,244,0.12)',
          }}
        >
          <div
            style={{
              width: `${trails * 50}%`,
              height: '100%',
              borderRadius: 99,
              background: 'linear-gradient(90deg, #f472b6, #818cf8)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: -9,
              left: `calc(${trails * 50}% - 14px)`,
              width: 28,
              height: 28,
              borderRadius: 99,
              background: color.cream,
              boxShadow: '0 0 20px #f472b6',
            }}
          />
        </div>
        <div style={{ marginTop: 12, fontSize: 20, color: '#9ca3af' }}>
          Jejak mengikuti prakiraan angin dari tiap titik panas · indikatif, bukan model sebaran
        </div>
      </Glass>

      <div
        style={{
          position: 'absolute',
          right: 80,
          top: 150,
          opacity: ramp(frame, s(9.4), s(10)),
          fontFamily: font.heading,
          color: color.ink,
          textAlign: 'right',
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 800 }}>Angin dari tenggara</div>
        <div style={{ fontSize: 24, color: '#bfc3d0' }}>10 km/j · bertiup ke barat laut</div>
      </div>
      {fresh > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 64,
            top: 190,
            padding: '16px 26px',
            borderRadius: 22,
            background: 'rgba(255,75,62,0.16)',
            border: '2px solid #ff4b3e',
            color: '#ffd1cc',
            fontFamily: font.heading,
            fontSize: 34,
            fontWeight: 800,
            opacity: fresh,
            transform: `scale(${0.9 + 0.1 * fresh})`,
          }}
        >
          Titik api baru (&lt; 6 jam) berdenyut merah
        </div>
      )}
      <Label>Data demo · skenario Sungai Raya</Label>
    </AbsoluteFill>
  );
}
