import { test as base, TestInfo } from '@playwright/test';
import { runLighthouse, LighthouseScores } from '@/utils/lighthouse/runLighthouse';

export interface LighthouseActions {
  /**
   * Audits the given URL with Lighthouse.
   * Attaches the full HTML report as a clickable attachment in the Playwright
   * HTML report. Returns the category scores (0–100) for use in assertions.
   */
  audit(url: string): Promise<LighthouseScores>;
}

type LighthouseFixtures = {
  lighthouse: LighthouseActions;
};

async function attachReport(testInfo: TestInfo, result: Awaited<ReturnType<typeof runLighthouse>>) {
  await testInfo.attach('Lighthouse Report', {
    body: result.htmlReport,
    contentType: 'text/html',
  });

  const { scores } = result;
  testInfo.annotations.push(
    { type: 'lighthouse:performance', description: `${scores.performance}` },
    { type: 'lighthouse:accessibility', description: `${scores.accessibility}` },
    { type: 'lighthouse:best-practices', description: `${scores.bestPractices}` },
    { type: 'lighthouse:seo', description: `${scores.seo}` },
  );
}

export const lighthouseTest = base.extend<LighthouseFixtures>({
  lighthouse: async ({}, use, testInfo) => {
    await use({
      audit: async (url: string) => {
        const result = await runLighthouse(url);
        await attachReport(testInfo, result);
        return result.scores;
      },
    });
  },
});
