/** Anchor id of the hotspot trend card on /prakiraan. */
export const TREND_SECTION_ID = 'tren-titik-panas';

/**
 * Deep link to the hotspot trend chart: opens /prakiraan on the Titik api tab
 * and scrolls to the trend card. Single source for every "Lihat tren" link.
 */
export const TREND_URL = `/prakiraan?tab=titik-api#${TREND_SECTION_ID}`;
