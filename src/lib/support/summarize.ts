type Turn = { role: 'user'|'agent'|'assistant'; text: string };

function fallbackQA(transcript: Turn[]) {
  const firstUser = transcript.find(t => t.role === 'user')?.text?.trim() || 'General question';
  const lastAgent = [...transcript].reverse().find(t => t.role !== 'user')?.text?.trim() || 'We will update the knowledge base with the correct policy answer.';
  const q = firstUser.length > 200 ? firstUser.slice(0, 197) + '…' : firstUser;
  const a = lastAgent.length > 800 ? lastAgent.slice(0, 797) + '…' : lastAgent;
  return { question: q, answer: a };
}

export async function qaFromTranscript(transcript: Turn[]) {
  const key = process.env.OPENAI_API_KEY!;
  if (!key) {
    return fallbackQA(transcript);
  }
  const sys = `Convert the support thread into a single FAQ-style Q and policy-accurate A.
- No PII. 3-8 sentences for A. Keep concrete, not fluffy.
Return exactly:
Q: ...
A: ...`;
  const messages = [
    { role: 'system', content: sys },
    { role: 'user', content: transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n') }
  ];
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, messages })
    });
    const j = await r.json();
    const out: string = j?.choices?.[0]?.message?.content ?? '';
    const m = /Q:\s*(.*)\nA:\s*([\s\S]*)/i.exec(out) || [];
    // Prefer extracted Q/A; if absent, attempt simple heuristics
    let question = (m[1] || '').trim();
    let answer = (m[2] || '').trim();
    if (!question) {
      // Use the first user question line if available
      const firstUser = transcript.find(t => t.role === 'user')?.text || ''
      question = firstUser.replace(/\s+/g, ' ').trim();
    }
    if (!answer) {
      const lastAgent = [...transcript].reverse().find(t => t.role !== 'user')?.text || ''
      answer = lastAgent.replace(/\s+/g, ' ').trim();
    }
    if (!question || !answer) return fallbackQA(transcript);
    return { question, answer };
  } catch {
    return fallbackQA(transcript);
  }
}
