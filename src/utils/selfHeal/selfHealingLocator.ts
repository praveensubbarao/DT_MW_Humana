/**
 * Self-healing locator wrapper for Playwright.
 *
 * Design Pattern: STRATEGY (via LLMProvider)
 * ─────────────────────────────────────────────
 * The healing algorithm is fixed here (Context). Which LLM is used is
 * determined at runtime by createLLMProvider() — injected as a Strategy.
 * Swap providers by changing LLM_PROVIDER in .env. No test code changes.
 *
 * Usage:
 *   const locator = await selfHeal(page, testInfo, {
 *     description: 'Submit button on checkout form',
 *     primary: p => p.getByRole('button', { name: 'Submit' }),
 *   });
 *
 * Flow:
 *   1. Try primary locator — returns immediately if found (no LLM call)
 *   2. On failure, snapshot body innerHTML and call the configured LLMProvider
 *   3. Validate healed selector, annotate test, write heal log, return locator
 *   4. If no provider configured or provider fails — re-throw original error
 *
 * Heal log:
 *   Written to self-heal-report/heal-log.json each run.
 *   Run `yarn heal:suggest` to get source code patch suggestions.
 */

import * as fs   from 'fs';
import * as path from 'path';
import { Page, Locator, TestInfo } from '@playwright/test';
import { createLLMProvider, LLMProvider } from './llmProvider';

export interface HealLogEntry {
  timestamp:       string;
  testFile:        string;
  testTitle:       string;
  description:     string;
  healedSelector:  string;
  confidence:      'high' | 'medium' | 'low';
  reasoning:       string;
  url:             string;
  provider:        string;
}

const HEAL_LOG_DIR  = path.resolve(process.cwd(), 'self-heal-report');
const HEAL_LOG_FILE = path.join(HEAL_LOG_DIR, 'heal-log.json');

function appendHealLog(entry: HealLogEntry): void {
  try {
    fs.mkdirSync(HEAL_LOG_DIR, { recursive: true });
    const existing: HealLogEntry[] = fs.existsSync(HEAL_LOG_FILE)
      ? JSON.parse(fs.readFileSync(HEAL_LOG_FILE, 'utf-8'))
      : [];
    existing.push(entry);
    fs.writeFileSync(HEAL_LOG_FILE, JSON.stringify(existing, null, 2));
  } catch (e) {
    console.warn('[self-heal] Could not write heal log:', e);
  }
}

export interface SelfHealOptions {
  /** Human-readable description used in the LLM prompt and test annotations */
  description: string;
  /** Primary locator strategy — tried first; LLM is never called if this resolves */
  primary: (page: Page) => Locator;
  /** How much of the page body to send to the LLM (chars). Default: 8000 */
  domSnapshotLimit?: number;
  /** Timeout in ms for the primary locator before triggering healing. Default: 5000 */
  timeout?: number;
  /**
   * Override the LLM provider for this specific call.
   * If omitted, the provider configured via LLM_PROVIDER env var is used.
   */
  provider?: LLMProvider;
}

// Resolve provider once at module load — used as default for all selfHeal() calls
// that don't supply their own provider override.
let _defaultProvider: LLMProvider | null | undefined = undefined;

async function getDefaultProvider(): Promise<LLMProvider | null> {
  if (_defaultProvider === undefined) {
    _defaultProvider = await createLLMProvider();
    const providerName = (process.env.LLM_PROVIDER ?? 'ollama').toLowerCase();
    if (_defaultProvider) {
      console.log(`[self-heal] ✅  Enabled — provider: ${providerName}`);
    } else {
      console.log(`[self-heal] ⚠️  Disabled — no credentials found for provider: ${providerName}`);
    }
  }
  return _defaultProvider;
}

/**
 * Attempt the primary locator; fall back to LLM healing on failure.
 * Returns the resolved Locator (primary or healed).
 * Annotates the test and writes the heal log when healing is used.
 */
export async function selfHeal(
  page:     Page,
  testInfo: TestInfo,
  options:  SelfHealOptions,
): Promise<Locator> {
  const { description, primary, domSnapshotLimit = 8_000, timeout = 5_000 } = options;

  // ─── Fast path: primary locator ───────────────────────────────────────────
  const primaryLocator = primary(page);
  try {
    await primaryLocator.waitFor({ state: 'visible', timeout });
    return primaryLocator;
  } catch (primaryError) {
    const provider = options.provider ?? await getDefaultProvider();
    if (!provider) throw primaryError;  // healing disabled — propagate unchanged

    console.warn(`[self-heal] Primary locator failed for "${description}" — invoking LLM...`);
  }

  // ─── Healing path ─────────────────────────────────────────────────────────
  const provider = options.provider ?? (await getDefaultProvider())!;

  let domSnapshot: string;
  try {
    domSnapshot = (await page.locator('body').innerHTML()).slice(0, domSnapshotLimit);
  } catch {
    domSnapshot = '<body snapshot unavailable>';
  }

  let healResult: Awaited<ReturnType<typeof provider.healSelector>>;
  try {
    healResult = await provider.healSelector(description, domSnapshot);
  } catch (healError) {
    const reason = healError instanceof Error ? healError.message : String(healError);
    const providerName = (process.env.LLM_PROVIDER ?? 'ollama');
    console.error(`\n[self-heal] ❌  LLM call failed (provider: ${providerName})`);
    console.error(`  Description : ${description}`);
    console.error(`  Error       : ${reason}\n`);
    throw new Error(
      `[self-heal] Primary locator failed and LLM healing also failed for: "${description}"\n  Reason: ${reason}`,
    );
  }

  const providerName = process.env.LLM_PROVIDER ?? 'ollama';
  console.log(
    `[self-heal] Healed "${description}" → "${healResult.selector}" ` +
    `(${healResult.confidence} via ${providerName}) — ${healResult.reasoning}`,
  );

  testInfo.annotations.push({
    type: 'self-heal',
    description:
      `"${description}" healed → ${healResult.selector} ` +
      `[${healResult.confidence}][${providerName}] ${healResult.reasoning}`,
  });

  appendHealLog({
    timestamp:      new Date().toISOString(),
    testFile:       testInfo.file,
    testTitle:      testInfo.title,
    description,
    healedSelector: healResult.selector,
    confidence:     healResult.confidence,
    reasoning:      healResult.reasoning,
    url:            page.url(),
    provider:       providerName,
  });

  const healedLocator = page.locator(healResult.selector).first();
  try {
    await healedLocator.waitFor({ state: 'visible', timeout });
    return healedLocator;
  } catch {
    throw new Error(
      `[self-heal] ${providerName} suggested "${healResult.selector}" for "${description}" ` +
      `but it was not found in the DOM either.`,
    );
  }
}
