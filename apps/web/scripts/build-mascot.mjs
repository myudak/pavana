// Slice the Pavi sticker sheet (4 × 3 poses, transparent background) into one WebP per
// pose. Run once after changing the sheet:  node apps/web/scripts/build-mascot.mjs
// Gaps between poses are found from the alpha channel, so cells need not be uniform.
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dir = fileURLToPath(new URL('../src/assets/mascot/', import.meta.url));
const SHEET = `${dir}source-sheet.webp`;
const POSES = [
  ['calm', 'idle', 'hug-leaves', 'wave'],
  ['curious', 'happy-jump', 'hug-calm', 'wink'],
  ['joy', 'look', 'sleep', 'surprised'],
];
const OUT = 256; // longest side in px (shown at ≤128 CSS px, so 2× for retina)
const ALPHA_MIN = 24;
const BLOB_MIN = 128; // only fairly opaque pixels form blobs, so faint glow never bridges poses

const { data, info } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const alpha = (x, y) => data[(y * W + x) * C + 3];

/** Split [0, len) into `n` bands at the emptiest lines near each expected boundary. */
function bands(len, n, lineSum) {
  const cuts = [0];
  for (let k = 1; k < n; k++) {
    const target = Math.round((len * k) / n);
    const span = Math.round(len / n / 4);
    let best = target;
    for (let i = target - span; i <= target + span; i++) if (lineSum(i) < lineSum(best)) best = i;
    cuts.push(best);
  }
  cuts.push(len);
  return cuts;
}

const colSum = (x) => {
  let s = 0;
  for (let y = 0; y < H; y++) if (alpha(x, y) > ALPHA_MIN) s++;
  return s;
};
const rowSum = (y) => {
  let s = 0;
  for (let x = 0; x < W; x++) if (alpha(x, y) > ALPHA_MIN) s++;
  return s;
};

const xs = bands(W, 4, colSum);
const ys = bands(H, 3, rowSum);

// Connected blobs (alpha > BLOB_MIN) belong to the pose whose cell holds their centre, so
// swirls or leaves that cross a cell line stay with their own pose. Faint glow pixels
// outside any blob fall back to their cell.
const cellOf = (x, y) => {
  let c = 0;
  let r = 0;
  while (c < 3 && x >= xs[c + 1]) c++;
  while (r < 2 && y >= ys[r + 1]) r++;
  return r * 4 + c;
};
const label = new Int32Array(W * H).fill(-1);
const owner = [];
const stack = [];
for (let start = 0; start < W * H; start++) {
  if (label[start] !== -1 || data[start * C + 3] <= BLOB_MIN) continue;
  const id = owner.length;
  let n = 0;
  let sx = 0;
  let sy = 0;
  label[start] = id;
  stack.push(start);
  while (stack.length) {
    const i = stack.pop();
    const x = i % W;
    const y = (i - x) / W;
    n++;
    sx += x;
    sy += y;
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      if (j < 0 || j >= W * H || label[j] !== -1) continue;
      if (Math.abs((j % W) - x) > 1 || data[j * C + 3] <= BLOB_MIN) continue;
      label[j] = id;
      stack.push(j);
    }
  }
  owner.push(cellOf(Math.round(sx / n), Math.round(sy / n)));
}

for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 4; c++) {
    const pose = r * 4 + c;
    const name = POSES[r][c];
    const masked = Buffer.from(data);
    for (let i = 0; i < W * H; i++) {
      const x = i % W;
      const mine = label[i] === -1 ? cellOf(x, (i - x) / W) === pose : owner[label[i]] === pose;
      if (!mine) masked[i * C + 3] = 0;
    }
    await sharp(masked, { raw: { width: W, height: H, channels: C } })
      .png()
      .toBuffer()
      .then((buf) => sharp(buf).trim({ threshold: 1 }).toBuffer())
      .then((buf) =>
        sharp(buf)
          .resize(OUT, OUT, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 88, alphaQuality: 90 })
          .toFile(`${dir}pavi-${name}.webp`),
      );
    console.log(name);
  }
}
