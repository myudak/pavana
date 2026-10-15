/**
 * Decorative dusk mountain landscape (dark-mode reference look). Purely ornamental —
 * aria-hidden, no data. Original vector illustration, not a photo: layered natural
 * ridges, pine forest foreground, indigo-to-pink dusk sky with a low sunset glow
 * behind the far ridge. Reused as an atmospheric backdrop for hero-like sections.
 */
export function DuskHero({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 520"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable={false}
      className={className}
    >
      <defs>
        <linearGradient id="dusk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e1120" />
          <stop offset="0.38" stopColor="#1e1c4e" />
          <stop offset="0.58" stopColor="#4c2a86" />
          <stop offset="0.74" stopColor="#a34fa8" />
          <stop offset="0.86" stopColor="#f472b6" stopOpacity="0.65" />
          <stop offset="1" stopColor="#2b3152" />
        </linearGradient>
        <radialGradient id="dusk-sunset" cx="0.62" cy="0.78" r="0.35">
          <stop offset="0" stopColor="#fbcfe8" stopOpacity="0.75" />
          <stop offset="0.4" stopColor="#f472b6" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f472b6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dusk-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4b5fd" stopOpacity="0" />
          <stop offset="1" stopColor="#c4b5fd" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <rect width="1200" height="520" fill="url(#dusk-sky)" />
      <rect width="1200" height="520" fill="url(#dusk-sunset)" />

      {/* Stars, upper sky only */}
      <g fill="#eef0f4" opacity="0.65">
        <circle cx="80" cy="40" r="1.6" />
        <circle cx="220" cy="70" r="1.2" />
        <circle cx="360" cy="36" r="1.8" />
        <circle cx="520" cy="60" r="1.2" />
        <circle cx="700" cy="34" r="1.6" />
        <circle cx="880" cy="56" r="1.2" />
        <circle cx="1040" cy="40" r="1.8" />
        <circle cx="1140" cy="90" r="1.2" />
        <circle cx="450" cy="110" r="1" />
        <circle cx="960" cy="120" r="1" />
      </g>

      {/* Far ridge — soft, hazy */}
      <path
        d="M0 340 C60 300 110 285 170 310 C230 335 280 290 350 270 C420 250 470 300 540 315
           C620 332 680 280 760 265 C840 250 900 300 970 312 C1040 324 1120 300 1200 318
           L1200 520 L0 520 Z"
        fill="#3b3670"
        opacity="0.85"
      />
      <rect x="0" y="240" width="1200" height="120" fill="url(#dusk-haze)" />

      {/* Mid ridge — varied peaks and saddles */}
      <path
        d="M0 400 C50 360 90 350 140 372 C190 394 230 340 290 330 C350 320 380 370 440 385
           C500 400 550 350 620 345 C690 340 720 390 790 400 C860 410 900 360 970 355
           C1040 350 1090 395 1150 402 C1170 404 1185 400 1200 396 L1200 520 L0 520 Z"
        fill="#23204d"
      />

      {/* Pine clusters on the mid ridge */}
      <g fill="#171b3a">
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

      {/* Near ridge — dark foreground mass */}
      <path
        d="M0 460 C70 430 130 425 200 445 C270 465 340 430 420 428 C500 426 560 460 640 465
           C720 470 790 435 870 438 C950 441 1020 470 1090 468 C1130 467 1165 458 1200 455
           L1200 520 L0 520 Z"
        fill="#12172e"
      />

      {/* Foreground pine forest — dense, varied silhouettes */}
      <g fill="#0a0e22">
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
      <rect x="0" y="430" width="1200" height="90" fill="#0e1120" opacity="0.35" />
    </svg>
  );
}
