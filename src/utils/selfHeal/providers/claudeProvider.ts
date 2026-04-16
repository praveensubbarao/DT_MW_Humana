/**
 * Anthropic Claude LLM Provider — ConcreteStrategy implementation.
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY   your Anthropic API key
 *   CLAUDE_MODEL        model ID (default: claude-sonnet-4-6)
 */

import { LLMProvider, HealResult, buildHealPrompt, parseHealResult } from '../llmProvider';

export class ClaudeProvider implements LLMProvider {
  async healSelector(description: string, domSnapshot: string): Promise<HealResult> {
    const model = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 256,
        messages: [{ role: 'user', content: buildHealPrompt(description, domSnapshot) }],
      }),
    });

    if (!response.ok) {
      throw new Error(`[self-heal:claude] ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as {
      content?: Array<{ type: string; text?: string }>;
    };
    const content = json.content?.find(b => b.type === 'text')?.text ?? '';
    return parseHealResult(content);
  }
}
