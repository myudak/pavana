import dusk from '@pavana/brand/backgrounds/dusk.webp';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Pavi, Wordmark } from '../../components/Brand';
import { color, font, s } from '../../theme';
import { clamp, ramp, RiseWords, useSpring } from '../kit';

/** 1:52 — the promise, the lockup, credits; fade to black. */
export function S11Close() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const LOCK = s(8.5);
  const pop = useSpring(LOCK + 2, 10);
  const lines = 1 - ramp(frame, LOCK - 10, LOCK + 2);
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
            text="Hutan dan gambut tidak bisa dijaga sendirian."
            from={4}
            style={{
              justifyContent: 'center',
              fontSize: 66,
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}
          />
          <RiseWords
            text="Tapi dengan memantau sejak dini, kita bisa bersiap lebih awal."
            from={s(3.3)}
            style={{
              justifyContent: 'center',
              width: 1500,
              fontSize: 66,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: color.amber,
            }}
          />
        </AbsoluteFill>
      )}

      {frame >= LOCK && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Pavi
            pose="joy"
            size={280}
            style={{ transform: `scale(${pop}) translateY(${Math.sin(frame / 12) * 8}px)` }}
          />
          <div style={{ marginTop: 6, opacity: ramp(frame, LOCK + 8, LOCK + 20) }}>
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
              opacity: ramp(frame, LOCK + 20, LOCK + 34),
            }}
          >
            Pantau titik api sejak dini.
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
          opacity: ramp(frame, LOCK + 30, LOCK + 44),
        }}
      >
        Prototipe · angka aplikasi adalah data demo (skenario Sungai Raya); model eksperimental
        memakai input arsip nyata.
        <br />
        Kutipan: r/indonesia · Data lahan terbakar: BNPB via Tirto.id · Peta © OpenStreetMap © CARTO
        · Musik: Soundridemusic
      </div>
      <AbsoluteFill style={{ background: '#000', opacity: end }} />
    </AbsoluteFill>
  );
}
