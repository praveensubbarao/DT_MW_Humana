import { test } from '@/utils/fixtures/providerBaseTest';

/**
 * Top navigation items to verify.
 * These are the 5 primary nav buttons rendered by the <nucleus-header>
 * custom web component at provider.humana.com. Playwright's getByRole
 * pierces the nested shadow DOM to find each button by its accessible name.
 */
const topNavItems = [
  { label: 'Working With Us' },
  { label: 'Coverage & Claims' },
  { label: 'Patient Care' },
  { label: 'Dental & Pharmacy' },
  { label: 'Medicaid & D-SNP' },
];

test.describe('Humana Provider Portal — top navigation', () => {
  // Steps:
  // 1. Open the provider portal homepage via the configured base URL.
  // 2. Verify the page body is loaded and visible.
  // 3. For each of the 5 top navigation items, assert its button is visible
  //    in the nav bar with the correct accessible label.
  test('HumanaTopNavigationTest — all top nav links are present and visible', async ({ providerActions }) => {
    await providerActions.openProviderPortal();
    await providerActions.expectPageIsVisible();

    for (const item of topNavItems) {
      await providerActions.expectTopNavButtonVisible(item.label);
    }
  });
});
