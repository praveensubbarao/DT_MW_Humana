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

/**
 * Runs a Lighthouse audit against the given URL.
 * Launches a dedicated headless Chrome instance so it does not conflict
 * with the Playwright browser already controlling the page under test.
 */
export async function runLighthouse(url: string): Promise<LighthouseResult> {
  const { launch } = await import('chrome-launcher');
  const { default: lighthouse } = await import('lighthouse');

  const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });

  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: ['html', 'json'],
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
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
