/**
 * Ollama-backed self-healing utility.
 *
 * When a Playwright locator fails to find an element, this module:
 *   1. Snapshots the visible DOM around the failure point
 *   2. Sends it to Ollama with the original selector description
 *   3. Returns a healed CSS selector suggested by the model
 *
 * Credentials are read from environment variables — never hardcode them:
 *   OLLAMA_BASE_URL  — e.g. https://your-ollama-host
 *   OLLAMA_USER      — e.g. testOllama
 *   OLLAMA_API_KEY   — your API key
 *   OLLAMA_MODEL     — model to use, e.g. llama3 (default: llama3)
 */

export interface HealResult {
  selector: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

function buildPrompt(description: string, domSnapshot: string): string {
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

async function callOllama(prompt: string): Promise<string> {
  const baseUrl  = process.env.OLLAMA_BASE_URL?.replace(/\/$/, '');
  const user     = process.env.OLLAMA_USER;
  const apiKey   = process.env.OLLAMA_API_KEY;
  const model    = process.env.OLLAMA_MODEL ?? 'llama3';

  if (!baseUrl || !apiKey) {
    throw new Error('[self-heal] OLLAMA_BASE_URL and OLLAMA_API_KEY must be set to enable healing');
  }

  const credentials = Buffer.from(`${user}:${apiKey}`).toString('base64');

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`[self-heal] Ollama request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json() as { message?: { content?: string } };
  return json.message?.content ?? '';
}

function parseHealResult(raw: string): HealResult {
  // Strip markdown code fences if the model wrapped the JSON anyway
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error(`[self-heal] Could not parse JSON from model response: ${raw}`);
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as HealResult;
}

/**
 * Ask Ollama to suggest a healed selector for an element that could not be found.
 *
 * @param description  Human-readable description of the element (e.g. "Submit button in login form")
 * @param domSnapshot  Relevant portion of the page's outer HTML
 */
export async function healSelector(
  description: string,
  domSnapshot: string,
): Promise<HealResult> {
  const prompt = buildPrompt(description, domSnapshot);
  const raw    = await callOllama(prompt);
  return parseHealResult(raw);
}
