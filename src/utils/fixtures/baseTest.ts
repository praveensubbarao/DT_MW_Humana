import { test as base, expect } from '@playwright/test';
import { ProviderPortalActions } from '@/actions/us/ProviderPortalActions';

type AppFixtures = {
  providerActions: ProviderPortalActions;
};

export const test = base.extend<AppFixtures>({
  providerActions: async ({ page }, use) => {
    await use(new ProviderPortalActions(page));
  },
});

export { expect };
