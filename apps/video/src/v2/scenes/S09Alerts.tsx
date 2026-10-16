import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { color, font, s } from '../../theme';
import { Label, ramp, RiseWords, useSceneFade, useSpring } from '../kit';
import { Phone } from '../ui/Phone';

/** 1:36 — a smart alert lands on the lock screen; then the Android beta. */
export function S09Alerts() {
  const frame = useCurrentFrame();
  const fade = useSceneFade(10, 10);
  const drop = useSpring(s(1.2), 13, 0.8);
  const android = ramp(frame, s(4.2), s(4.9));

  return (
    <AbsoluteFill
      style={{
        opacity: fade,
        background: 'radial-gradient(ellipse at 40% 50%, #2a2550 0%, #07090f 65%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 260,
          top: 40,
          transform: `rotate(-4deg) translateY(${Math.sin(frame / 20) * 6}px)`,
        }}
      >
        <Phone>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(14,17,32,0.1), rgba(14,17,32,0.7))',
            }}
          />
          <div style={{ position: 'absolute', top: 90, left: 0, right: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 22, color: '#bfc3d0' }}>Selasa, 15 September</div>
            <div
              style={{ fontFamily: font.display, fontSize: 120, fontWeight: 600, lineHeight: 1 }}
            >
              07.00
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              top: 300,
              padding: '18px 20px',
              borderRadius: 28,
              background: 'rgba(30, 34, 58, 0.92)',
              border: '1px solid rgba(238,240,244,0.1)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              transform: `translateY(${(1 - drop) * -260}px)`,
              opacity: Math.min(1, drop * 1.5),
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 17,
                color: '#bfc3d0',
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: '#1f2937',
                  color: '#f5f1eb',
                  fontFamily: font.wordmark,
                  fontWeight: 700,
                  fontSize: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                p
              </span>
              PAVANA · sekarang
            </div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800 }}>
              Potensi dampak asap meningkat
            </div>
            <div style={{ marginTop: 4, fontSize: 19, color: '#d1d5db', lineHeight: 1.35 }}>
              PM2.5 meningkat bersamaan dengan deteksi titik panas searah angin.
            </div>
          </div>
        </Phone>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 900,
          top: 300,
          width: 860,
          fontFamily: font.heading,
          color: color.ink,
        }}
      >
        <RiseWords
          text="Tanda saat potensi asap meningkat."
          from={s(1.6)}
          accent={['meningkat.']}
          style={{ fontSize: 76, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08 }}
        />
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            gap: 20,
            opacity: android,
            transform: `translateY(${(1 - android) * 30}px)`,
          }}
        >
          <span
            style={{
              padding: '14px 26px',
              borderRadius: 99,
              background: 'rgba(238,240,244,0.08)',
              border: '1.5px solid rgba(238,240,244,0.15)',
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            Web
          </span>
          <span
            style={{
              padding: '14px 26px',
              borderRadius: 99,
              background: 'rgba(74,222,128,0.14)',
              border: '1.5px solid rgba(74,222,128,0.5)',
              color: '#86efac',
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            Android · APK beta v0.2.0
          </span>
        </div>
        <div style={{ marginTop: 22, fontSize: 24, color: '#9ca3af', opacity: android }}>
          Bukan peringatan resmi. Tetap ikuti BMKG, SiPongi, dan BPBD setempat.
        </div>
      </div>
      <Label>Prototipe · notifikasi saat aplikasi dibuka</Label>
    </AbsoluteFill>
  );
}
