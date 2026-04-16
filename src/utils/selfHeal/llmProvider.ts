/**
 * LLM Provider abstraction for self-healing selectors.
 *
 * Design Pattern: STRATEGY
 * ─────────────────────────
 * The healing algorithm (try primary → snapshot DOM → ask LLM → validate)
 * is fixed. What varies is *which* LLM is called and *how*.
 *
 * The LLMProvider interface is the Strategy contract. Each concrete
 * provider (Ollama, OpenAI, Anthropic Claude, Azure OpenAI, etc.) implements
 * it independently. selfHeal() accepts any LLMProvider — it never knows
 * which backend is running.
 *
 * Pattern participants:
 *   Context           → selfHeal() in selfHealingLocator.ts
 *   Strategy          → LLMProvider (this interface)
 *   ConcreteStrategy  → OllamaProvider, OpenAIProvider, ClaudeProvider, ...
 *
 *                ┌──────────────┐
 *                │  selfHeal()  │  ← Context: uses LLMProvider
 *                └──────┬───────┘
 *                       │ calls healSelector(description, domSnapshot)
 *                       ▼
 *               ┌───────────────┐
 *               │  LLMProvider  │  ← Strategy interface
 *               └───────┬───────┘
 *          ┌────────────┼────────────┐
 *          ▼            ▼            ▼
 *   OllamaProvider  OpenAIProvider  ClaudeProvider  ...
 *
 * To add a new provider:
 *   1. Create src/utils/selfHeal/providers/<name>Provider.ts
 *   2. Implement LLMProvider
 *   3. Register it in createLLMProvider() below
 *   4. Set LLM_PROVIDER=<name> in .env
 */

export interface HealResult {
  selector:   string;
  confidence: 'high' | 'medium' | 'low';
  reasoning:  string;
}

/**
 * Strategy interface — every concrete provider implements this single method.
 */
export interface LLMProvider {
  /**
   * Given a human-readable description of a missing element and the current
   * DOM snapshot, return a healed CSS selector with confidence and reasoning.
   */
  healSelector(description: string, domSnapshot: string): Promise<HealResult>;
}

/**
 * Shared prompt used by ALL providers — ensures consistent model behaviour
 * regardless of which backend is in use.
 */
export function buildHealPrompt(description: string, domSnapshot: string): string {
  return `You are a Playwright test automation expert specialising in resilient CSS selector generation.

A Playwright locator failed to find an element described as: "${description}"

Here is the current DOM snapshot of the page (truncated to the most relevant section):
\`\`\`html
${domSnapshot}
\`\`\`

Your task:
1. Identify the element in the DOM that best matches the description.
2. Return a single, resilient CSS selector for that element.
3. Prefer attribute-based selectors (data-testid, aria-label, role) over structural ones.
4. Avoid nth-child or positional selectors unless there is no alternative.

Respond ONLY with valid JSON in this exact shape — no markdown, no explanation outside the JSON:
{
  "selector": "<your CSS selector>",
  "confidence": "high" | "medium" | "low",
  "reasoning": "<one sentence explaining your choice>"
}`;
}

/**
 * Shared JSON parser used by ALL providers — strips markdown fences the model
 * may add despite being told not to, then extracts the first JSON object.
 */
export function parseHealResult(raw: string): HealResult {
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  const start   = cleaned.indexOf('{');
  const end     = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error(`[self-heal] Could not parse JSON from model response:\n${raw}`);
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as HealResult;
}

/**
 * Factory — reads LLM_PROVIDER from .env and returns the matching provider.
 *
 * Supported values (case-insensitive):
 *   ollama   → OllamaProvider  (default)
 *   openai   → OpenAIProvider
 *   claude   → ClaudeProvider
 *
 * Returns null when no provider is configured (healing disabled gracefully).
 */
export async function createLLMProvider(): Promise<LLMProvider | null> {
  const providerName = (process.env.LLM_PROVIDER ?? 'ollama').toLowerCase();

  switch (providerName) {
    case 'ollama': {
      if (!process.env.OLLAMA_BASE_URL || !process.env.OLLAMA_API_KEY) return null;
      const { OllamaProvider } = await import('./providers/ollamaProvider');
      return new OllamaProvider();
    }
    case 'openai': {
      if (!process.env.OPENAI_API_KEY) return null;
      const { OpenAIProvider } = await import('./providers/openAIProvider');
      return new OpenAIProvider();
    }
    case 'claude': {
      if (!process.env.ANTHROPIC_API_KEY) return null;
      const { ClaudeProvider } = await import('./providers/claudeProvider');
      return new ClaudeProvider();
    }
    default:
      console.warn(`[self-heal] Unknown LLM_PROVIDER="${providerName}" — healing disabled`);
      return null;
  }
}
