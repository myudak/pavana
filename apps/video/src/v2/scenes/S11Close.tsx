import dusk from '@pavana/brand/backgrounds/dusk.webp';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Pavi, Wordmark } from '../../components/Brand';
import { color, font, s } from '../../theme';
import { clamp, ramp, RiseWords, useSpring } from '../kit';

/** 1:52 — the promise, the lockup, credits; fade to black. */
export function S11Close() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pop = useSpring(s(2.6), 10);
  const lines = 1 - ramp(frame, s(2.4), s(2.9));
  const end = interpolate(frame, [durationInFrames - 20, durationInFrames], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: '#07090f', fontFamily: font.heading, color: color.cream }}>
      <AbsoluteFill
        style={{ transform: `scale(${interpolate(frame, [0, s(8)], [1.15, 1.04], clamp)})` }}
      >
        <Img src={dusk} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <AbsoluteFill style={{ background: 'rgba(7, 9, 15, 0.5)' }} />
      </AbsoluteFill>

      {lines > 0 && (
        <AbsoluteFill
          style={{ alignItems: 'center', justifyContent: 'center', opacity: lines, gap: 10 }}
        >
          <RiseWords
            text="Asap tidak bisa kita hentikan sendiri."
            from={4}
            style={{
              justifyContent: 'center',
              fontSize: 80,
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}
          />
          <RiseWords
            text="Tapi kita bisa bersiap lebih awal."
            from={30}
            style={{
              justifyContent: 'center',
              fontSize: 80,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: color.amber,
            }}
          />
        </AbsoluteFill>
      )}

      {frame >= s(2.5) && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Pavi
            pose="joy"
            size={280}
            style={{ transform: `scale(${pop}) translateY(${Math.sin(frame / 12) * 8}px)` }}
          />
          <div style={{ marginTop: 6, opacity: ramp(frame, s(2.8), s(3.3)) }}>
            <Wordmark size={180} />
          </div>
          <div
            style={{
              marginTop: 22,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              fontSize: 36,
              fontWeight: 700,
              opacity: ramp(frame, s(3.4), s(3.9)),
            }}
          >
            Tahu lebih awal kapan asap datang.
            <span
              style={{
                padding: '8px 22px',
                borderRadius: 99,
                background: 'rgba(251,191,36,0.16)',
                border: '1.5px solid rgba(251,191,36,0.55)',
                color: color.amber,
              }}
            >
              pavana.myudak.com
            </span>
          </div>
        </AbsoluteFill>
      )}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 40,
          textAlign: 'center',
          fontSize: 20,
          lineHeight: 1.6,
          color: 'rgba(245,241,235,0.7)',
          opacity: ramp(frame, s(4.2), s(4.8)),
        }}
      >
        Prototipe · angka aplikasi adalah data demo (skenario Sungai Raya); model eksperimental
        memakai input arsip nyata.
        <br />
        Kutipan: Tirto.id, r/indonesia · Data ISPA: Kemenkes via Tirto.id · Peta © OpenStreetMap ©
        CARTO
      </div>
      <AbsoluteFill style={{ background: '#000', opacity: end }} />
    </AbsoluteFill>
  );
}
