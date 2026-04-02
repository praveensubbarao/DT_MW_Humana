# Prompt Library

Reusable Claude prompts for the Humana Provider Portal Playwright test suite.

## How to use

1. Find a prompt below that matches your task.
2. Open the file and copy the **Prompt** section.
3. Replace `{{VARIABLE}}` placeholders with real values.
4. Paste into Claude.

## How to add a new prompt

```bash
yarn prompt:new -- --name "my-prompt-name" --category "scaffolding"
```

Then fill in the generated stub at `.claude/prompts/my-prompt-name.md`.
Open a PR so the team can review and promote it from `draft` → `stable`.

---

## Catalog

| Prompt | Category | Status |
|--------|----------|--------|

<!-- Add rows here as prompts are created, e.g.:
| [gen-page-object](gen-page-object.md) | scaffolding | stable |
| [gen-test-from-spec](gen-test-from-spec.md) | scaffolding | draft |
-->
