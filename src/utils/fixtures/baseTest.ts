import { test as base, expect } from '@playwright/test';
import { ProviderPortalActions } from '@/actions/us/ProviderPortalActions';

type AppFixtures = {
  providerActions: ProviderPortalActions;
};

export const test = base.extend<AppFixtures>({
  providerActions: async ({ page }, use, testInfo) => {
    await use(new ProviderPortalActions(page, testInfo));
  },
});

export { expect };
