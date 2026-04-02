# Project overview
This is a Playwright + TypeScript E2E test suite for the Humana Provider Portal (provider.humana.com).

# Stack
- Playwright 1.54, TypeScript 5.x
- Test runner: @playwright/test
- Reporting: HTML + JUnit
- Node 20+

# Conventions
- All tests import `{ test, expect }` from `@/utils/fixtures/providerBaseTest` — never directly from `@playwright/test`
- Actions-based fixture pattern: `providerActions` is injected via fixture, never instantiated in tests
- Every `test(...)` block must have a comment above it describing the test steps (enforced by pre-commit hook)
- Selectors use Playwright's `getByRole`, `getByText`, and resilient CSS selectors
- The Humana Provider Portal nav uses a `<nucleus-header>` custom web component with nested shadow DOM — Playwright's role-based locators pierce shadow DOM automatically

# Commands
- `yarn test`              → run all tests (chromium)
- `yarn test:headed`       → run with visible browser
- `yarn test:desktop`      → run chromium project explicitly
- `npx playwright show-report` → open HTML report

# Do not
- Never use `page.waitForTimeout()` for synchronization — use `waitForLoadState` or `expect(...).toBeVisible()`
- Never import `ProviderPortalActions` directly in tests — use the `providerActions` fixture
- Never hardcode environment URLs in tests — use `providerActions.getBaseURL()`

# File structure
src/
  actions/us/        ← actions classes (one per page/feature area)
  tests/us/          ← test specs organized by feature
  utils/fixtures/    ← custom test fixtures (baseTest, providerBaseTest)
  utils/testdata/    ← test data files (placeholder)

# Skills
Before generating any test code, read the relevant skill file:
- Page objects → read .claude/skills/playwright-pom/SKILL.md
- Test scaffolding → read .claude/skills/playwright-scaffolding/SKILL.md

# Prompt Library
Before writing a prompt from scratch, check `.claude/prompts/index.md` for an existing template.
To capture a new prompt: `yarn prompt:new -- --name "your-prompt-name" --category "scaffolding"`
