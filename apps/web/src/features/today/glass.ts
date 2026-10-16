/**
 * Shared panel surface for the Today hero (single source of truth).
 *
 * `panelFill` is the background/blur/shadow layer plus the `--panel-border`
 * variable (aliased to the chart/map cards' `glass-border` token, so light and
 * dark resolve to the exact same border values). `panelSurface` adds the real
 * 1px border on top and is used by the hourly strip, the condition banner and
 * the AQI card. The 10-day outlook card uses `panelFill` WITHOUT a real
 * border and draws its 1px outline via an inset-shadow overlay instead (see
 * DailyForecastCard), so no `border-*`/`ring-*` utility can ever cancel it.
 * Layout classes (radius, padding, grid/flex, responsive overrides) stay on
 * each container; `cn()` (tailwind-merge) drops duplicated utilities.
 */
export const panelFill =
  'bg-glass-hero backdrop-blur-xl dark:bg-[#0c1126]/60 dark:[box-shadow:var(--pv-shadow-soft)] [--panel-border:var(--pv-glass-border)]';

export const panelSurface = `border border-glass-border dark:border-white/10 ${panelFill}`;
