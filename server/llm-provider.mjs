/**
 * Minimal LLM provider abstraction.
 * Supports any OpenAI-compatible API via env configuration.
 * Returns null when unavailable or misconfigured — never throws.
 */
export async function callLLM({ system, messages, env }, fetcher = fetch) {
  const apiKey = env.LLM_API_KEY;
  const providerUrl = env.LLM_PROVIDER_URL || 'https://api.openai.com/v1/chat/completions';
  const model = env.LLM_MODEL || 'gpt-4o';
  const maxTokens = Number(env.LLM_MAX_TOKENS) || 800;
  const temperature = Number(env.LLM_TEMPERATURE) || 0.5;
  const timeout = Number(env.LLM_TIMEOUT) || 45000;

  if (!apiKey) return null;

  const body = {
    model,
    messages: [{ role: 'system', content: system }, ...messages],
    max_tokens: maxTokens,
    temperature,
  };

  try {
    const response = await fetcher(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return null;
    return { reply };
  } catch {
    return null;
  }
}
