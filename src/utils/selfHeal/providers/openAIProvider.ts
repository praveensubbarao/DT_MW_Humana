/**
 * OpenAI LLM Provider — ConcreteStrategy implementation.
 *
 * Required env vars:
 *   OPENAI_API_KEY   your OpenAI API key
 *   OPENAI_MODEL     model name (default: gpt-4o)
 */

import { LLMProvider, HealResult, buildHealPrompt, parseHealResult } from '../llmProvider';

export class OpenAIProvider implements LLMProvider {
  async healSelector(description: string, domSnapshot: string): Promise<HealResult> {
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: buildHealPrompt(description, domSnapshot) }],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`[self-heal:openai] ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? '';
    return parseHealResult(content);
  }
}
