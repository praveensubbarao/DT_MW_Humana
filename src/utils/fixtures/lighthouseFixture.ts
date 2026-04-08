import { test as base, TestInfo } from '@playwright/test';
import { runLighthouse, LighthouseScores, LighthouseFormFactor } from '@/utils/lighthouse/runLighthouse';
import {
  DESKTOP_THRESHOLDS,
  MOBILE_THRESHOLDS,
  LighthouseThresholds,
} from '@/utils/lighthouse/lighthouseThresholds';

export interface LighthouseActions {
  /**
   * Audits the given URL with Lighthouse using desktop emulation (default).
   * Attaches the full HTML report as a clickable attachment in the Playwright
   * HTML report. Returns the category scores (0–100) for use in assertions.
   */
  audit(url: string): Promise<LighthouseScores>;

  /**
   * Audits the given URL with Lighthouse using Lighthouse's built-in mobile
   * emulation (Pixel 5 equivalent — 412×915, deviceScaleFactor 2.625).
   * This is independent of any Playwright project/device configuration.
   */
  auditMobile(url: string): Promise<LighthouseScores>;
}

type LighthouseFixtures = {
  lighthouse: LighthouseActions;
};

function scoreStatus(score: number, threshold: number): string {
  if (score >= threshold) return `${score} ✓ (threshold: ${threshold})`;
  return `${score} ✗ BELOW threshold of ${threshold}`;
}

async function attachReport(
  testInfo: TestInfo,
  result: Awaited<ReturnType<typeof runLighthouse>>,
  formFactor: LighthouseFormFactor,
  thresholds: LighthouseThresholds,
) {
  await testInfo.attach(`Lighthouse Report (${formFactor})`, {
    body: result.htmlReport,
    contentType: 'text/html',
  });

  const { scores } = result;
  const prefix = `lighthouse:${formFactor}`;
  testInfo.annotations.push(
    { type: `${prefix}:performance`,    description: scoreStatus(scores.performance,   thresholds.performance)   },
    { type: `${prefix}:accessibility`,  description: scoreStatus(scores.accessibility, thresholds.accessibility) },
    { type: `${prefix}:best-practices`, description: scoreStatus(scores.bestPractices, thresholds.bestPractices) },
    { type: `${prefix}:seo`,            description: scoreStatus(scores.seo,           thresholds.seo)           },
  );
}

export const lighthouseTest = base.extend<LighthouseFixtures>({
  lighthouse: async ({}, use, testInfo) => {
    await use({
      audit: async (url: string) => {
        const result = await runLighthouse(url, 'desktop');
        await attachReport(testInfo, result, 'desktop', DESKTOP_THRESHOLDS);
        return result.scores;
      },
      auditMobile: async (url: string) => {
        const result = await runLighthouse(url, 'mobile');
        await attachReport(testInfo, result, 'mobile', MOBILE_THRESHOLDS);
        return result.scores;
      },
    });
  },
});
