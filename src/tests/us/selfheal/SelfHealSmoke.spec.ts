import { test, expect } from '@/utils/fixtures/providerBaseTest';
import { selfHeal } from '@/utils/selfHeal/selfHealingLocator';

/**
 * Self-healing smoke test — demonstrates Ollama healing against a real element.
 *
 * Target element : "Explore Compass" button on the Humana Provider Portal homepage
 * Known good XPath: //a[@class='nb-btn nb-btn--primary']
 *
 * The PRIMARY selector is intentionally wrong (simulates what happens when a
 * class name is refactored, e.g. nb-btn--primary → nb-btn--cta).
 * Ollama receives the DOM snapshot + description and should return the correct
 * selector for the anchor element that contains the "Explore Compass" text.
 *
 * To run just this test:
 *   yarn test --grep "SelfHealSmoke"
 */
test.describe('Self-Healing — Ollama integration smoke', () => {
  // Steps:
  // 1. Open the provider portal homepage.
  // 2. Attempt to locate the "Explore Compass" CTA using a deliberately broken
  //    class name (nb-btn--cta instead of the real nb-btn--primary).
  // 3. Primary locator times out — selfHeal snapshots the DOM.
  // 4. Ollama receives the description and DOM, returns the correct selector.
  // 5. Healed locator is validated as visible.
  // 6. Assert the element text confirms we landed on the right button.
  // 7. Log the heal annotation — visible in the Playwright HTML report.
  test('SelfHealSmoke — heals broken "Explore Compass" CTA selector via Ollama', async ({
    page,
    providerActions,
  }, testInfo) => {
    await providerActions.openProviderPortal();

    // PRIMARY — intentionally broken: uses a stale class name that no longer exists.
    // This simulates a real-world scenario where a CSS class was renamed during a
    // front-end refactor (nb-btn--cta was changed to nb-btn--primary).
    // Known good selector: a.nb-btn.nb-btn--primary
    // Known good XPath:    //a[@class='nb-btn nb-btn--primary']
    const healedLocator = await selfHeal(page, testInfo, {
      description:
        'Explore Compass primary CTA button — an anchor element with classes ' +
        'nb-btn and nb-btn--primary containing the text "Explore Compass"',
      primary: p => p.locator('a[data-self-heal-broken="force-healing-now"]'),  // guaranteed no-match
      timeout: 3_000,   // fail fast so healing kicks in quickly
    });

    // Healed locator must be visible
    await expect(healedLocator).toBeVisible({ timeout: 10_000 });

    // Confirm Ollama found the right element by checking its text
    await expect(healedLocator).toContainText('Explore Compass', { ignoreCase: true });

    // Print heal result to console and surface in Playwright HTML report
    const healAnnotation = testInfo.annotations.find(a => a.type === 'self-heal');
    console.log('\n' + '─'.repeat(60));
    console.log('  SELF-HEAL RESULT');
    console.log('─'.repeat(60));
    console.log('  ' + (healAnnotation?.description ?? 'No heal annotation — check OLLAMA env vars'));
    console.log('─'.repeat(60) + '\n');
  });
});
