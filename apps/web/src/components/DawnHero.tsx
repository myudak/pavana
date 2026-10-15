/**
 * Decorative dry-season haze landscape for LIGHT mode — the daylight counterpart of
 * DuskHero, same ridges and pine silhouettes so the composition matches. Purely
 * ornamental: aria-hidden, no data. Kept pale and low-contrast so section text keeps
 * its AA contrast (AtmosphereSection also lays a surface veil on top).
 */
export function DawnHero({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 520"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable={false}
      className={className}
    >
      <defs>
        <linearGradient id="dawn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7f1e6" />
          <stop offset="0.38" stopColor="#fbe8cf" />
          <stop offset="0.6" stopColor="#f8d9b4" />
          <stop offset="0.78" stopColor="#f3c79b" />
          <stop offset="1" stopColor="#e8d9c3" />
        </linearGradient>
        <radialGradient id="dawn-sun" cx="0.62" cy="0.78" r="0.36">
          <stop offset="0" stopColor="#fff4d6" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#fdba74" stopOpacity="0.4" />
          <stop offset="1" stopColor="#fdba74" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dawn-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf8" stopOpacity="0" />
          <stop offset="1" stopColor="#fffdf8" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      <rect width="1200" height="520" fill="url(#dawn-sky)" />
      {/* Haze glow breathes slowly in light mode the way the dark accents pulse. */}
      <rect
        width="1200"
        height="520"
        fill="url(#dawn-sun)"
        className="animate-[pv-glow_9s_ease-in-out_infinite]"
      />

      {/* Distant smoke haze bands */}
      <g fill="#ffffff" opacity="0.35">
        <rect x="0" y="150" width="1200" height="16" rx="8" />
        <rect x="0" y="196" width="900" height="12" rx="6" />
        <rect x="220" y="240" width="980" height="14" rx="7" />
      </g>

      {/* Far ridge — soft, hazy */}
      <path
        d="M0 340 C60 300 110 285 170 310 C230 335 280 290 350 270 C420 250 470 300 540 315
           C620 332 680 280 760 265 C840 250 900 300 970 312 C1040 324 1120 300 1200 318
           L1200 520 L0 520 Z"
        fill="#e3d3ba"
        opacity="0.9"
      />
      <rect x="0" y="240" width="1200" height="120" fill="url(#dawn-haze)" />

      {/* Mid ridge — varied peaks and saddles */}
      <path
        d="M0 400 C50 360 90 350 140 372 C190 394 230 340 290 330 C350 320 380 370 440 385
           C500 400 550 350 620 345 C690 340 720 390 790 400 C860 410 900 360 970 355
           C1040 350 1090 395 1150 402 C1170 404 1185 400 1200 396 L1200 520 L0 520 Z"
        fill="#dcc9a9"
      />

      {/* Pine clusters on the mid ridge */}
      <g fill="#cbb693">
        <path d="M120 372 l13 -34 13 34 h-8 v12 h-10 v-12 Z" />
        <path d="M205 360 l10 -26 10 26 h-6 v10 h-8 v-10 Z" />
        <path d="M330 336 l14 -36 14 36 h-9 v13 h-10 v-13 Z" />
        <path d="M470 388 l11 -28 11 28 h-7 v10 h-8 v-10 Z" />
        <path d="M600 352 l13 -33 13 33 h-8 v12 h-10 v-12 Z" />
        <path d="M745 396 l10 -26 10 26 h-6 v10 h-8 v-10 Z" />
        <path d="M880 372 l14 -35 14 35 h-9 v12 h-10 v-12 Z" />
        <path d="M1010 360 l11 -29 11 29 h-7 v11 h-8 v-11 Z" />
        <path d="M1105 398 l10 -25 10 25 h-6 v9 h-8 v-9 Z" />
      </g>

      {/* Near ridge */}
      <path
        d="M0 460 C70 430 130 425 200 445 C270 465 340 430 420 428 C500 426 560 460 640 465
           C720 470 790 435 870 438 C950 441 1020 470 1090 468 C1130 467 1165 458 1200 455
           L1200 520 L0 520 Z"
        fill="#cdb794"
      />

      {/* Foreground pine forest */}
      <g fill="#b8a179">
        <path d="M20 452 l16 -42 16 42 h-10 v15 h-12 v-15 Z" />
        <path d="M85 448 l12 -32 12 32 h-8 v12 h-8 v-12 Z" />
        <path d="M150 450 l18 -46 18 46 h-11 v16 h-14 v-16 Z" />
        <path d="M230 444 l13 -34 13 34 h-8 v13 h-10 v-13 Z" />
        <path d="M300 442 l17 -44 17 44 h-11 v15 h-12 v-15 Z" />
        <path d="M385 440 l12 -31 12 31 h-8 v12 h-8 v-12 Z" />
        <path d="M455 442 l16 -41 16 41 h-10 v14 h-12 v-14 Z" />
        <path d="M540 446 l13 -33 13 33 h-8 v12 h-10 v-12 Z" />
        <path d="M610 444 l17 -43 17 43 h-11 v15 h-12 v-15 Z" />
        <path d="M695 442 l12 -30 12 30 h-8 v11 h-8 v-11 Z" />
        <path d="M765 444 l16 -40 16 40 h-10 v14 h-12 v-14 Z" />
        <path d="M845 446 l13 -33 13 33 h-8 v12 h-10 v-12 Z" />
        <path d="M920 444 l17 -42 17 42 h-11 v14 h-12 v-14 Z" />
        <path d="M1000 448 l12 -31 12 31 h-8 v12 h-8 v-12 Z" />
        <path d="M1075 446 l15 -38 15 38 h-9 v13 h-12 v-13 Z" />
        <path d="M1150 450 l12 -30 12 30 h-8 v11 h-8 v-11 Z" />
      </g>
      <rect x="0" y="430" width="1200" height="90" fill="var(--pv-canvas)" opacity="0.4" />
    </svg>
  );
}
