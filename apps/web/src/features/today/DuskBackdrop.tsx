import { useMemo } from 'react';

/**
 * Full-bleed dusk landscape behind the Today first screen (dark / Dusk-Haze).
 * Purely ornamental — aria-hidden, no data. Original vector illustration:
 * indigo-to-pink dusk sky with a low sunset glow (no fire, no smoke plumes),
 * thin pink-lilac clouds, 6 receding ridges with valley haze, dark pine forest
 * (deterministic seeded silhouettes, denser toward the bottom) and fine grain.
 * Light theme (Ember/Mist): soft cream wash, same layout.
 * Static — no animation, so prefers-reduced-motion needs no special casing.
 */

/** Deterministic PRNG so the forest is identical on every render. */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let z = t;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 2 ** 32;
  };
}

interface PineRow {
  d: string;
  fill: string;
  opacity: number;
}

/** Merge a whole row of pines (+ trunks) into one path. Density grows downward. */
function buildPineRow(seed: number, baseY: number, count: number, hMin: number, hMax: number) {
  const rnd = mulberry32(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * 1560 - 12 + (rnd() - 0.5) * 26;
    const h = hMin + rnd() * (hMax - hMin);
    const y = baseY + (rnd() - 0.5) * 18;
    const w = h * 0.24;
    // Three stacked tiers + trunk, as one subpath.
    d +=
      `M${(x - w).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y - h * 0.55).toFixed(1)}` +
      `L${(x + w).toFixed(1)} ${y.toFixed(1)}Z` +
      `M${(x - w * 0.72).toFixed(1)} ${(y - h * 0.28).toFixed(1)}L${x.toFixed(1)} ${(y - h * 0.78).toFixed(1)}` +
      `L${(x + w * 0.72).toFixed(1)} ${(y - h * 0.28).toFixed(1)}Z` +
      `M${(x - w * 0.46).toFixed(1)} ${(y - h * 0.52).toFixed(1)}L${x.toFixed(1)} ${(y - h).toFixed(1)}` +
      `L${(x + w * 0.46).toFixed(1)} ${(y - h * 0.52).toFixed(1)}Z` +
      `M${(x - 2.5).toFixed(1)} ${y.toFixed(1)}h5v${(h * 0.1 + 6).toFixed(1)}h-5Z`;
  }
  return d;
}

export function DuskBackdrop({ className }: { className?: string }) {
  const rows: PineRow[] = useMemo(
    () => [
      { d: buildPineRow(11, 790, 60, 70, 130), fill: '#1a2140', opacity: 0.95 },
      { d: buildPineRow(47, 895, 95, 90, 170), fill: '#12172e', opacity: 1 },
      { d: buildPineRow(83, 985, 135, 110, 220), fill: '#0a0e22', opacity: 1 },
    ],
    [],
  );

  return (
    <div aria-hidden className={className}>
      {/* Light theme: soft cream wash with a faint warm glow. Same layout, clean cards. */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            'radial-gradient(60% 45% at 78% 30%, rgba(249,115,22,0.14) 0%, rgba(249,115,22,0) 70%), linear-gradient(180deg, #faf6ef 0%, #f5ece0 55%, var(--pv-canvas) 100%)',
        }}
      />

      {/* Dark theme: layered dusk illustration. */}
      <svg
        viewBox="0 0 1536 1024"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 hidden h-full w-full dark:block"
      >
        <defs>
          <linearGradient id="dusk-sky" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#0b0e1d" />
            <stop offset="0.3" stopColor="#191847" />
            <stop offset="0.48" stopColor="#4c2a86" />
            <stop offset="0.62" stopColor="#a34fa8" />
            <stop offset="0.74" stopColor="#f472b6" stopOpacity="0.7" />
            <stop offset="0.86" stopColor="#5b3a7a" />
            <stop offset="1" stopColor="#23204d" />
          </linearGradient>
          <radialGradient id="dusk-glow" cx="0.78" cy="0.34" r="0.5">
            <stop offset="0" stopColor="#fdba74" stopOpacity="0.7" />
            <stop offset="0.25" stopColor="#f9a8d4" stopOpacity="0.5" />
            <stop offset="0.55" stopColor="#f472b6" stopOpacity="0.22" />
            <stop offset="1" stopColor="#f472b6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dusk-core" cx="0.78" cy="0.34" r="0.18">
            <stop offset="0" stopColor="#ffedd5" stopOpacity="0.8" />
            <stop offset="0.6" stopColor="#fdba74" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fdba74" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dusk-valley-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0abfc" stopOpacity="0" />
            <stop offset="1" stopColor="#f0abfc" stopOpacity="0.34" />
          </linearGradient>
          <filter id="dusk-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="dusk-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0"
            />
          </filter>
        </defs>

        <rect width="1536" height="1024" fill="url(#dusk-sky)" />
        <rect width="1536" height="1024" fill="url(#dusk-glow)" />
        <rect width="1536" height="1024" fill="url(#dusk-core)" />

        {/* Stars, upper-left sky only (away from the glow). */}
        <g fill="#eef0f4" opacity="0.6">
          <circle cx="90" cy="70" r="1.8" />
          <circle cx="250" cy="130" r="1.3" />
          <circle cx="400" cy="60" r="2" />
          <circle cx="560" cy="110" r="1.3" />
          <circle cx="180" cy="210" r="1.2" />
          <circle cx="470" cy="190" r="1.5" />
          <circle cx="90" cy="300" r="1.2" />
          <circle cx="330" cy="260" r="1.1" />
        </g>

        {/* Thin elongated dusk clouds, pink-lilac. */}
        <g fill="#f9a8d4" filter="url(#dusk-soft)">
          <ellipse cx="980" cy="250" rx="220" ry="16" opacity="0.32" />
          <ellipse cx="1250" cy="310" rx="170" ry="12" opacity="0.38" />
          <ellipse cx="620" cy="330" rx="260" ry="13" opacity="0.2" />
          <ellipse cx="300" cy="380" rx="180" ry="11" opacity="0.18" />
          <ellipse cx="1100" cy="420" rx="240" ry="15" opacity="0.26" />
          <ellipse cx="760" cy="470" rx="300" ry="16" opacity="0.16" />
          <ellipse cx="1330" cy="360" rx="130" ry="10" opacity="0.35" />
          <ellipse cx="880" cy="180" rx="180" ry="11" opacity="0.25" />
        </g>
        <g fill="#c4b5fd" filter="url(#dusk-soft)">
          <ellipse cx="850" cy="290" rx="200" ry="10" opacity="0.26" />
          <ellipse cx="420" cy="430" rx="220" ry="12" opacity="0.18" />
          <ellipse cx="1330" cy="470" rx="150" ry="12" opacity="0.22" />
        </g>

        {/* Ridge 1 (farthest) — pale violet-blue. */}
        <path
          d="M0 560 C80 520 150 505 230 530 C310 555 370 500 460 485 C550 470 610 525 700 540
             C790 555 860 500 950 490 C1040 480 1110 530 1200 542 C1290 554 1380 525 1460 532
             C1490 534 1515 540 1536 544 L1536 1024 L0 1024 Z"
          fill="#6b639b"
          opacity="0.95"
        />
        <rect x="0" y="430" width="1536" height="150" fill="url(#dusk-valley-haze)" />
        {/* Ridge 2 */}
        <path
          d="M0 620 C70 580 140 575 210 595 C280 615 340 560 430 555 C520 550 570 605 660 615
             C750 625 810 570 900 565 C990 560 1050 610 1140 618 C1230 626 1310 590 1400 596
             C1460 600 1500 610 1536 606 L1536 1024 L0 1024 Z"
          fill="#524a85"
        />
        <rect x="0" y="500" width="1536" height="130" fill="url(#dusk-valley-haze)" opacity="0.8" />
        {/* Ridge 3 */}
        <path
          d="M0 690 C90 650 160 645 240 665 C320 685 380 630 470 628 C560 626 620 680 710 690
             C800 700 870 645 960 645 C1050 645 1110 695 1200 700 C1290 705 1360 670 1440 676
             C1485 679 1512 686 1536 684 L1536 1024 L0 1024 Z"
          fill="#37335f"
        />
        <rect x="0" y="580" width="1536" height="130" fill="url(#dusk-valley-haze)" opacity="0.7" />
        {/* Ridge 4 */}
        <path
          d="M0 760 C80 720 170 715 250 735 C330 755 400 705 490 705 C580 705 640 755 730 762
             C820 769 890 715 980 718 C1070 721 1130 768 1220 770 C1310 772 1380 740 1460 744
             C1495 746 1518 750 1536 748 L1536 1024 L0 1024 Z"
          fill="#282447"
        />
        {/* Ridge 5 */}
        <path
          d="M0 830 C100 795 180 790 270 810 C360 830 430 785 520 785 C610 785 680 830 770 835
             C860 840 930 795 1020 798 C1110 801 1180 842 1270 842 C1360 842 1430 812 1500 816
             C1515 817 1526 819 1536 820 L1536 1024 L0 1024 Z"
          fill="#1b1836"
        />
        {/* Ridge 6 (nearest) — dark base under the forest. */}
        <path
          d="M0 910 C120 880 220 878 320 898 C420 918 500 880 600 880 C700 880 780 918 880 922
             C980 926 1060 885 1160 888 C1260 891 1340 924 1430 922 C1470 921 1505 915 1536 912
             L1536 1024 L0 1024 Z"
          fill="#12172e"
        />

        {/* Pine forest, 3 rows, denser toward the bottom. */}
        {rows.map((r, i) => (
          <path key={i} d={r.d} fill={r.fill} opacity={r.opacity} />
        ))}
        <rect x="0" y="880" width="1536" height="144" fill="#0e1120" opacity="0.4" />

        {/* Fine grain. */}
        <rect width="1536" height="1024" filter="url(#dusk-grain)" opacity="0.06" />
      </svg>

      {/* Legibility scrims: left-to-right for the hero text + bottom blend into canvas. */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            'linear-gradient(90deg, rgba(14,17,32,0.78) 0%, rgba(14,17,32,0.45) 38%, rgba(14,17,32,0.15) 65%, rgba(14,17,32,0.05) 100%)',
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            'linear-gradient(180deg, rgba(14,17,32,0) 52%, rgba(14,17,32,0.55) 80%, var(--pv-canvas) 100%)',
        }}
      />
    </div>
  );
}
