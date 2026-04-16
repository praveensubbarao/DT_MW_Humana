# Playwright E2E Test Framework

A production-grade Playwright + TypeScript E2E test suite with integrated **Lighthouse performance auditing** and **AI-powered self-healing selectors** via Ollama.

---

## Stack

| Tool | Version |
|---|---|
| [@playwright/test](https://playwright.dev) | 1.54+ |
| TypeScript | 5.x |
| Node.js | 20+ |
| Lighthouse | 13.x |
| Ollama (self-healing) | latest |

---

## Quick Start

```zsh
# Install dependencies
yarn install

# Install browsers
yarn install:browsers

# Copy and fill in environment config
cp .env.example .env

# Run all tests
yarn test

# Run with visible browser
yarn test:headed

# Open the HTML report
npx playwright show-report
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. Never commit `.env`.

```
STACK=prod                      # dev | stg | prod
WORKER_COUNT=2

# Ollama self-healing (optional — omit to disable)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_USER=your-username
OLLAMA_API_KEY=your-key-here
OLLAMA_MODEL=llama3
```

---

## Project Structure

```
src/
  actions/us/              ← Actions classes (one per page / feature area)
  tests/us/
    navigation/            ← Navigation & top-nav tests
    performance/           ← Lighthouse audit tests (desktop + mobile)
    selfheal/              ← Self-healing smoke tests
  utils/
    fixtures/              ← Custom Playwright fixtures
      baseTest.ts          ← Injects providerActions
      providerBaseTest.ts  ← Merges all fixtures (entry point for all tests)
      lighthouseFixture.ts ← Lighthouse audit fixture
    lighthouse/
      runLighthouse.ts     ← Core Lighthouse runner (desktop + mobile)
      lighthouseThresholds.ts ← Industry-standard score constants
    selfHeal/
      ollamaHealer.ts      ← Ollama HTTP client + prompt engineering
      selfHealingLocator.ts ← selfHeal() wrapper with heal logging
      selfHealReporter.ts  ← Custom Playwright reporter: heal summary
scripts/
  start-ollama.sh          ← Start/stop Ollama before test runs
  suggest-selector-fixes.js ← Read heal log, suggest source patches
  validate-spec-comments.js ← Pre-commit: every test must have step comments
self-heal-report/
  heal-log.json            ← Written during runs when healing fires
  summary.md               ← Human-readable heal summary
```

---

## Conventions

- All tests import `{ test, expect }` from `@/utils/fixtures/providerBaseTest` — never directly from `@playwright/test`
- `providerActions` is injected via fixture — never instantiate actions classes in tests
- Every `test(...)` block must have a comment above it describing the steps (enforced by pre-commit hook)
- Selectors use `getByRole`, `getByText`, and resilient CSS — avoid brittle XPath or positional selectors
- Never use `page.waitForTimeout()` — use `waitForLoadState` or `expect(...).toBeVisible()`
- Never hardcode URLs — use `providerActions.getBaseURL()`

---

## Lighthouse Performance Auditing

Performance tests run inside the Playwright suite with no extra tooling.

```typescript
test('homepage desktop scores meet thresholds', async ({ providerActions, lighthouse }) => {
  await providerActions.openProviderPortal();
  const scores = await lighthouse.audit(providerActions.getBaseURL() + '/');

  expect.soft(scores.performance,   thresholdMsg(...)).toBeGreaterThanOrEqual(DESKTOP_THRESHOLDS.performance);
  expect.soft(scores.accessibility, thresholdMsg(...)).toBeGreaterThanOrEqual(DESKTOP_THRESHOLDS.accessibility);
});
```

### How it works

- Lighthouse launches its own headless Chrome via `chrome-launcher` — no conflict with Playwright's browser
- Full HTML report is attached as a clickable artifact in the Playwright HTML report
- Scores are annotated per test: `lighthouse:desktop:performance → 42 ✗ BELOW threshold of 50`
- `expect.soft()` means all four categories are checked per run — no early exit on first miss

### Thresholds

| Category | Desktop | Mobile |
|---|---|---|
| Performance | ≥ 50 | ≥ 25 |
| Accessibility | ≥ 90 | ≥ 90 |
| Best Practices | ≥ 90 | ≥ 90 |
| SEO | ≥ 90 | ≥ 90 |

Mobile thresholds are lower because Lighthouse applies 4× CPU throttling during mobile emulation.

---

## AI Self-Healing Selectors

When a Playwright locator fails to find an element, the self-healing system:

1. Captures a DOM snapshot of the current page
2. Sends it to Ollama with a human-readable description of the element
3. Receives a suggested CSS selector from the model
4. Validates the healed selector against the live DOM
5. Annotates the test and writes to `self-heal-report/heal-log.json`

### Setup

```zsh
# Install Ollama
brew install ollama

# Pull the model
ollama pull llama3

# Add to .env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_API_KEY=your-key
OLLAMA_MODEL=llama3
```

### Usage in actions classes

```typescript
async clickPrimaryButton(label: string) {
  const btn = this.testInfo
    ? await selfHeal(this.page, this.testInfo, {
        description: `Primary CTA button with label: ${label}`,
        primary: p => p.getByRole('button', { name: label }),
      })
    : this.page.getByRole('button', { name: label });

  await btn.click();
}
```

### Workflow after a run with healing events

```zsh
# See what was healed and get code patch suggestions
yarn heal:suggest

# Automatically apply all suggested patches to source files
yarn heal:apply

# Review and commit
git diff src/actions/
```

### Safety

- If `OLLAMA_BASE_URL` / `OLLAMA_API_KEY` are not set, healing is silently skipped and the original error is thrown unchanged
- Healing only fires on locator failure — zero performance impact on passing tests
- All healing events are logged with timestamp, test name, healed selector, confidence, and reasoning

---

## Scripts

| Command | Description |
|---|---|
| `yarn test` | Run all tests (starts Ollama if configured) |
| `yarn test:headed` | Run with visible browser |
| `yarn test:desktop` | Run Chromium project only |
| `yarn test:retry-failed` | Re-run only failed tests |
| `yarn heal:suggest` | Print selector fix suggestions from last run |
| `yarn heal:apply` | Auto-patch source files with healed selectors |
| `yarn ollama:start` | Start Ollama in background |
| `yarn ollama:stop` | Stop managed Ollama process |
| `npx playwright show-report` | Open HTML report |

---

## Reporting

Each test run produces:

| Output | Location |
|---|---|
| Playwright HTML report | `playwright-report/index.html` |
| JUnit XML | `playwright-results/junit-report.xml` |
| Self-heal log | `self-heal-report/heal-log.json` |
| Self-heal summary | `self-heal-report/summary.md` |
| Lighthouse HTML report | Attached per test in the HTML report |
