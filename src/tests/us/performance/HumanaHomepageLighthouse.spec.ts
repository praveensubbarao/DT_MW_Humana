import { test, expect } from '@/utils/fixtures/providerBaseTest';

test.describe('Humana Provider Portal — Lighthouse performance audit', () => {
  // Steps:
  // 1. Open the provider portal homepage via the configured base URL.
  // 2. Run a Lighthouse audit against the homepage URL.
  // 3. Attach the full Lighthouse HTML report as a test attachment.
  // 4. Assert that performance, accessibility, best-practices, and SEO scores
  //    each meet the defined minimum thresholds.
  test('HumanaHomepageLighthouse — homepage scores meet minimum thresholds', async ({
    providerActions,
    lighthouse,
  }) => {
    await providerActions.openProviderPortal();
    const url = providerActions.getBaseURL() + '/';

    const scores = await lighthouse.audit(url);

    expect(scores.performance, 'performance score').toBeGreaterThanOrEqual(25);
    expect(scores.accessibility, 'accessibility score').toBeGreaterThanOrEqual(70);
    expect(scores.bestPractices, 'best-practices score').toBeGreaterThanOrEqual(70);
    expect(scores.seo, 'seo score').toBeGreaterThanOrEqual(70);
  });
});
