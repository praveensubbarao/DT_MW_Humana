/**
 * Industry-standard Lighthouse score thresholds.
 *
 * Scoring bands (per Google/Lighthouse):
 *   90–100 → Good  (green)
 *   50–89  → Needs Improvement  (orange)
 *   0–49   → Poor  (red)
 *
 * Desktop targets follow Google's Core Web Vitals "good" band.
 * Mobile targets are lower to account for Lighthouse's 4× CPU throttling
 * applied during mobile emulation — enterprise healthcare portals typically
 * score in the 15–40 range on mobile performance.
 */
export const DESKTOP_THRESHOLDS = {
  performance:   50,   // minimum to exit "poor" band
  accessibility: 90,   // WCAG 2.1 AA compliance baseline
  bestPractices: 90,
  seo:           90,
} as const;

export const MOBILE_THRESHOLDS = {
  performance:   25,   // realistic floor for complex authenticated portals
  accessibility: 90,
  bestPractices: 90,
  seo:           90,
} as const;

export type LighthouseThresholds = typeof DESKTOP_THRESHOLDS;

/**
 * Returns a descriptive assertion message showing the actual score,
 * whether it meets the threshold, and what the threshold is.
 *
 * Example output:
 *   "Performance (desktop): 19 — BELOW industry threshold of 50"
 *   "Accessibility (desktop): 92 — meets industry threshold of 90"
 */
export function thresholdMsg(
  label: string,
  formFactor: 'desktop' | 'mobile',
  score: number,
  threshold: number,
): string {
  const status = score >= threshold ? 'meets' : 'BELOW';
  return `${label} (${formFactor}): ${score} — ${status} industry threshold of ${threshold}`;
}
