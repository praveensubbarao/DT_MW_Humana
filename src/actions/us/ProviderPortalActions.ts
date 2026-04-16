import { expect, Locator, Page, TestInfo } from '@playwright/test';
import { selfHeal } from '@/utils/selfHeal/selfHealingLocator';

/**
 * Actions class for the Humana Provider Portal (provider.humana.com).
 *
 * Navigation note: the site uses a <nucleus-header> custom web component with
 * nested shadow DOM. Playwright's role-based locators (getByRole, getByText)
 * automatically pierce through shadow DOM, so no special shadow selectors
 * are needed for nav interactions.
 *
 * Top-level nav items are rendered as <button class="nav-heading-button"> and
 * open megamenu dropdowns on click. Dropdown links are standard <a> elements.
 */
export class ProviderPortalActions {
  constructor(
    private readonly page: Page,
    private readonly testInfo?: TestInfo,
  ) {}

  async openProviderPortal() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async expectPageIsVisible() {
    await this.page.locator('body').waitFor({ state: 'visible' });
  }

  getBaseURL() {
    return ((this.page.context() as any)._options.baseURL ?? '') as string;
  }

  private async clickLocator(locator: Locator) {
    await expect(locator).toBeAttached({ timeout: 10_000 });
    try {
      await locator.scrollIntoViewIfNeeded({ timeout: 10_000 });
    } catch {
      // ignore if scroll fails for hidden/offscreen elements
    }
    try {
      await locator.click({ timeout: 10_000 });
      return;
    } catch {
      try {
        await locator.click({ force: true, timeout: 10_000 });
        return;
      } catch {
        const handle = await locator.elementHandle();
        if (handle) {
          await handle.evaluate((el: HTMLElement) => el.click());
          return;
        }
        throw new Error(`Unable to click locator: ${await locator.toString()}`);
      }
    }
  }

  /**
   * Returns the top-level nav button for the given label.
   * These are <button class="nav-heading-button"> elements rendered inside
   * the nucleus-header shadow DOM. Playwright getByRole pierces shadow DOM.
   */
  private topNavButton(labelText: string): Locator {
    return this.page.getByRole('button', { name: labelText, exact: false }).filter({
      has: this.page.locator(':scope'),
    }).first();
  }

  async expectTopNavButtonVisible(labelText: string) {
    const btn = this.page.getByRole('button', { name: labelText, exact: false }).first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
  }

  /**
   * Clicks a top-level nav button to open its megamenu dropdown.
   * The nav buttons have no href — they reveal a dropdown on click.
   */
  async clickTopNavButton(labelText: string) {
    const btn = this.testInfo
      ? await selfHeal(this.page, this.testInfo, {
          description: `Top nav button: ${labelText}`,
          primary: p => p.getByRole('button', { name: labelText, exact: false }).first(),
        })
      : this.page.getByRole('button', { name: labelText, exact: false }).first();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await this.clickLocator(btn);
  }

  /**
   * Clicks a link inside an open megamenu dropdown by its visible text.
   * After clicking, waits for navigation to complete.
   */
  async clickDropdownLink(linkText: string, hrefFragment?: string) {
    let link: Locator;

    if (this.testInfo) {
      link = await selfHeal(this.page, this.testInfo, {
        description: `Dropdown link: ${linkText}${hrefFragment ? ` (href contains: ${hrefFragment})` : ''}`,
        primary: p => {
          const exact = p.getByRole('link', { name: linkText, exact: true }).first();
          return exact;
        },
      });
    } else {
      // No testInfo — use original multi-strategy fallback without Ollama
      link = this.page.getByRole('link', { name: linkText, exact: true }).first();
      if ((await link.count()) === 0 || !(await link.isVisible())) {
        link = this.page.getByRole('link', { name: linkText, exact: false }).first();
      }
      if ((await link.count()) === 0 && hrefFragment) {
        link = this.page.locator(`a[href*="${hrefFragment}"]`).first();
      }
    }

    await expect(link).toBeVisible({ timeout: 15_000 });
    await this.clickLocator(link);
    await this.page.waitForLoadState('networkidle');
  }

  async expectPageUrlContains(pathFragment: string) {
    await expect(this.page).toHaveURL(new RegExp(pathFragment));
  }

  async expectPageBodyContains(text: string) {
    await expect(this.page.locator('body')).toContainText(text, { useInnerText: true });
  }
}
