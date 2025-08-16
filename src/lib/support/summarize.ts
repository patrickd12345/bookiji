type Turn = { role: 'user'|'agent'|'assistant'; text: string };

export async function qaFromTranscript(transcript: Turn[]) {
  const key = process.env.OPENAI_API_KEY!;
  const sys = `Convert the support thread into a single FAQ-style Q and policy-accurate A.
- No PII. 3-8 sentences for A. Keep concrete, not fluffy.
Return exactly:
Q: ...
A: ...`;
  const messages = [
    { role: 'system', content: sys },
    { role: 'user', content: transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n') }
  ];
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, messages })
  });
  const j = await r.json();
  const out: string = j?.choices?.[0]?.message?.content ?? '';
  const m = /Q:\s*(.*)\nA:\s*([\s\S]*)/i.exec(out) || [];
  return { question: (m[1] || out).trim(), answer: (m[2] || out).trim() };
}
