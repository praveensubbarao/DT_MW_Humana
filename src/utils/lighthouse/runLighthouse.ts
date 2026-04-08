export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface LighthouseResult {
  scores: LighthouseScores;
  htmlReport: string;
  jsonReport: string;
}

export type LighthouseFormFactor = 'desktop' | 'mobile';

/**
 * Runs a Lighthouse audit against the given URL.
 * Launches a dedicated headless Chrome instance so it does not conflict
 * with the Playwright browser already controlling the page under test.
 * Pass formFactor: 'mobile' to use Lighthouse's built-in mobile emulation
 * (Pixel 5 equivalent). This is independent of any Playwright project config.
 */
export async function runLighthouse(
  url: string,
  formFactor: LighthouseFormFactor = 'desktop',
): Promise<LighthouseResult> {
  const { launch } = await import('chrome-launcher');
  const { default: lighthouse } = await import('lighthouse');

  const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });

  const mobileEmulation =
    formFactor === 'mobile'
      ? {
          formFactor: 'mobile' as const,
          screenEmulation: {
            mobile: true,
            width: 412,
            height: 915,
            deviceScaleFactor: 2.625,
            disabled: false,
          },
        }
      : {
          formFactor: 'desktop' as const,
          screenEmulation: {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false,
          },
        };

  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: ['html', 'json'],
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      ...mobileEmulation,
    });

    if (!result) throw new Error('Lighthouse returned no result');

    const [htmlReport, jsonReport] = result.report as [string, string];
    const { lhr } = result;

    return {
      scores: {
        performance: Math.round((lhr.categories['performance']?.score ?? 0) * 100),
        accessibility: Math.round((lhr.categories['accessibility']?.score ?? 0) * 100),
        bestPractices: Math.round((lhr.categories['best-practices']?.score ?? 0) * 100),
        seo: Math.round((lhr.categories['seo']?.score ?? 0) * 100),
      },
      htmlReport,
      jsonReport,
    };
  } finally {
    await chrome.kill();
  }
}
