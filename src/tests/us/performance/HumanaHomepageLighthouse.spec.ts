import { test, expect } from '@/utils/fixtures/providerBaseTest';
import {
  DESKTOP_THRESHOLDS,
  MOBILE_THRESHOLDS,
  thresholdMsg,
} from '@/utils/lighthouse/lighthouseThresholds';

test.describe('Humana Provider Portal — Lighthouse performance audit', () => {
  // Steps:
  // 1. Open the provider portal homepage via the configured base URL.
  // 2. Run a Lighthouse desktop audit against the homepage URL.
  // 3. Attach the full Lighthouse HTML report as a test attachment.
  // 4. Assert that performance, accessibility, best-practices, and SEO scores
  //    each meet Google's industry-standard thresholds (performance ≥ 50,
  //    accessibility/best-practices/SEO ≥ 90).
  test('HumanaHomepageLighthouse — homepage desktop scores meet minimum thresholds', async ({
    providerActions,
    lighthouse,
  }) => {
    await providerActions.openProviderPortal();
    const url = providerActions.getBaseURL() + '/';

    const scores = await lighthouse.audit(url);

    expect.soft(scores.performance,   thresholdMsg('Performance',    'desktop', scores.performance,   DESKTOP_THRESHOLDS.performance))  .toBeGreaterThanOrEqual(DESKTOP_THRESHOLDS.performance);
    expect.soft(scores.accessibility, thresholdMsg('Accessibility',  'desktop', scores.accessibility, DESKTOP_THRESHOLDS.accessibility)).toBeGreaterThanOrEqual(DESKTOP_THRESHOLDS.accessibility);
    expect.soft(scores.bestPractices, thresholdMsg('Best Practices', 'desktop', scores.bestPractices, DESKTOP_THRESHOLDS.bestPractices)).toBeGreaterThanOrEqual(DESKTOP_THRESHOLDS.bestPractices);
    expect.soft(scores.seo,           thresholdMsg('SEO',            'desktop', scores.seo,           DESKTOP_THRESHOLDS.seo))          .toBeGreaterThanOrEqual(DESKTOP_THRESHOLDS.seo);
  });

  // Steps:
  // 1. Open the provider portal homepage via the configured base URL.
  // 2. Run a Lighthouse mobile audit (Pixel 5 emulation) against the homepage URL.
  //    Note: emulation is handled by Lighthouse internally — independent of any
  //    Playwright project/device configuration.
  // 3. Attach the full Lighthouse mobile HTML report as a test attachment.
  // 4. Assert that performance, accessibility, best-practices, and SEO scores
  //    each meet mobile industry-standard thresholds (performance ≥ 25,
  //    accessibility/best-practices/SEO ≥ 90).
  test('HumanaHomepageLighthouse — homepage mobile scores meet minimum thresholds', async ({
    providerActions,
    lighthouse,
  }) => {
    await providerActions.openProviderPortal();
    const url = providerActions.getBaseURL() + '/';

    const scores = await lighthouse.auditMobile(url);

    expect.soft(scores.performance,   thresholdMsg('Performance',    'mobile', scores.performance,   MOBILE_THRESHOLDS.performance))  .toBeGreaterThanOrEqual(MOBILE_THRESHOLDS.performance);
    expect.soft(scores.accessibility, thresholdMsg('Accessibility',  'mobile', scores.accessibility, MOBILE_THRESHOLDS.accessibility)).toBeGreaterThanOrEqual(MOBILE_THRESHOLDS.accessibility);
    expect.soft(scores.bestPractices, thresholdMsg('Best Practices', 'mobile', scores.bestPractices, MOBILE_THRESHOLDS.bestPractices)).toBeGreaterThanOrEqual(MOBILE_THRESHOLDS.bestPractices);
    expect.soft(scores.seo,           thresholdMsg('SEO',            'mobile', scores.seo,           MOBILE_THRESHOLDS.seo))          .toBeGreaterThanOrEqual(MOBILE_THRESHOLDS.seo);
  });
});
