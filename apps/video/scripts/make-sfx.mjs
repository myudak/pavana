// Synthesises the video's sound effects into public/audio/sfx/*.wav in plain Node (noise,
// sines, envelopes and one-pole filters), so there are no third-party samples to license:
//   node apps/video/scripts/make-sfx.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'audio', 'sfx');
mkdirSync(out, { recursive: true });
const RATE = 48000;

let seed = 7;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

/** Renders `seconds` of audio from a sample function f(t, i) → [-1, 1]. */
function render(seconds, fn) {
  const n = Math.round(seconds * RATE);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = fn(i / RATE, i);
  return buf;
}

/** One-pole low-pass with a cutoff that may change over time (Hz at time t). */
function lowpass(buf, cutoff) {
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    const fc = typeof cutoff === 'function' ? cutoff(i / RATE) : cutoff;
    const a = 1 - Math.exp((-2 * Math.PI * fc) / RATE);
    y += a * (buf[i] - y);
    buf[i] = y;
  }
  return buf;
}
function highpass(buf, fc) {
  const low = lowpass(Float32Array.from(buf), fc);
  for (let i = 0; i < buf.length; i++) buf[i] -= low[i];
  return buf;
}
const env = (t, attack, total) =>
  t < attack
    ? Math.pow(t / attack, 2)
    : Math.pow(Math.max(0, 1 - (t - attack) / (total - attack)), 2);

function save(name, buf, gain = 1) {
  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const scale = (0.89 * gain) / (peak || 1);
  const data = Buffer.alloc(buf.length * 4);
  buf.forEach((v, i) => {
    const s = Math.max(-1, Math.min(1, v * scale)) * 32767;
    data.writeInt16LE(s, i * 4);
    data.writeInt16LE(s, i * 4 + 2);
  });
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(join(out, `${name}.wav`), Buffer.concat([h, data]));
  console.log('wrote', name);
}

// Whoosh: noise through a sweeping low-pass, fast swell and long tail.
save(
  'whoosh',
  highpass(
    lowpass(
      render(1.1, (t) => noise() * env(t, 0.38, 1.1)),
      (t) => 400 + 3200 * Math.sin(Math.min(1, t / 1.1) * Math.PI),
    ),
    250,
  ),
  0.9,
);
// Riser: upward tone plus growing noise.
save(
  'riser',
  render(1.6, (t) => {
    const ph = 2 * Math.PI * (140 * t + 300 * t * t);
    return (
      (0.55 * Math.sin(ph) + 0.25 * Math.sin(2 * ph) + 0.35 * noise() * (t / 1.6)) *
      Math.pow(t / 1.6, 2)
    );
  }),
  0.8,
);
// Impact: low boom with a short click.
save(
  'impact',
  lowpass(
    render(
      1.4,
      (t) =>
        Math.sin(2 * Math.PI * 52 * t) * Math.exp(-3.5 * t) + 0.5 * noise() * Math.exp(-40 * t),
    ),
    1800,
  ),
);
// Pop: quick pitch drop for UI.
save(
  'pop',
  render(
    0.35,
    (t) =>
      Math.sin(2 * Math.PI * (480 * t + (1100 / 25) * (1 - Math.exp(-25 * t)))) * Math.exp(-16 * t),
  ),
  0.8,
);
// Sweep: filtered noise moving up, for the data grid.
save(
  'sweep',
  lowpass(
    render(
      1.8,
      (t) =>
        (0.6 * noise() + 0.4 * Math.sin(2 * Math.PI * (300 * t + 500 * t * t))) *
        Math.sin((Math.PI * t) / 1.8),
    ),
    (t) => 600 + 4000 * (t / 1.8),
  ),
  0.7,
);
