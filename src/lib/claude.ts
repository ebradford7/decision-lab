const SYSTEM_PROMPT = `You are a sharp, warm decision-making coach helping the user structure an important decision using rigorous thinking frameworks (Socratic questioning, pre-mortems, base rates, steel-manning, probability forecasting).

Guide the conversation naturally. Ask ONE focused question at a time. Be concise — no long lectures. Your goal is to help them think clearly, not overwhelm them.

Work through these areas in order, but follow the conversation naturally:
1. What decision are they facing? (title + context)
2. What options do they have?
3. What matters most to them? (values)
4. What are they assuming? What could go wrong? (Socratic)
5. What's their gut probability for each outcome?
6. What's their final call and why?

After EVERY response, output a JSON block at the end wrapped exactly like this:
\`\`\`json
{ ... }
\`\`\`

The JSON should reflect everything extracted so far. Schema:
{
  "title": "",
  "description": "",
  "deadline": "",
  "successCriteria": "",
  "tags": [],
  "options": [],
  "values": [{"label": "", "weight": "high|medium|low", "notes": ""}],
  "forecasts": [{"description": "", "probability": 50}],
  "chosenOption": "",
  "reasoning": "",
  "socratic": {
    "coreQuestion": "",
    "assumptions": "",
    "alternatives": "",
    "baseRates": "",
    "steelMan": "",
    "preMortem": "",
    "secondOrder": ""
  },
  "isComplete": false
}

Only populate fields you're confident about from the conversation. Leave others as empty string/array. Set isComplete to true when you have: title, at least one option, chosenOption, and reasoning.`

export async function sendMessage(
  messages: { role: 'user' | 'assistant'; content: string }[],
  onChunk: (text: string) => void
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('VITE_ANTHROPIC_API_KEY is not set')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let accumulated = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          const chunk = parsed.delta.text as string
          accumulated += chunk
          onChunk(chunk)
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  return accumulated
}

export function extractJson(text: string): { displayText: string; json: Record<string, unknown> | null } {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
  if (!jsonMatch) return { displayText: text, json: null }

  const displayText = text.replace(/```json\s*[\s\S]*?```/, '').trim()
  try {
    const json = JSON.parse(jsonMatch[1].trim()) as Record<string, unknown>
    return { displayText, json }
  } catch {
    return { displayText, json: null }
  }
}
