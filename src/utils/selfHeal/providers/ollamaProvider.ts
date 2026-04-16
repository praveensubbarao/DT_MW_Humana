/**
 * Ollama LLM Provider — ConcreteStrategy implementation.
 *
 * Required env vars:
 *   OLLAMA_BASE_URL   e.g. http://localhost:11434
 *   OLLAMA_USER       basic-auth username
 *   OLLAMA_API_KEY    basic-auth password / API key
 *   OLLAMA_MODEL      model name (default: llama3)
 */

import { LLMProvider, HealResult, buildHealPrompt, parseHealResult } from '../llmProvider';

export class OllamaProvider implements LLMProvider {
  async healSelector(description: string, domSnapshot: string): Promise<HealResult> {
    const baseUrl = process.env.OLLAMA_BASE_URL!.replace(/\/$/, '');
    const model   = process.env.OLLAMA_MODEL ?? 'llama3';
    const creds   = Buffer.from(
      `${process.env.OLLAMA_USER}:${process.env.OLLAMA_API_KEY}`,
    ).toString('base64');

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Basic ${creds}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: buildHealPrompt(description, domSnapshot) }],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`[self-heal:ollama] ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as { message?: { content?: string } };
    return parseHealResult(json.message?.content ?? '');
  }
}
