export async function getAgentFromAuth(req: Request) {
  // TODO: replace with real OAuth validation (Authorization Code + PKCE).
  // Dev-only bypass:
  const hdr = req.headers.get('authorization') || '';
  const fake = req.headers.get('x-dev-agent') || '';
  const ok = hdr.startsWith('Bearer ') || fake === 'allow';
  return ok ? { id: 'agent-dev', roles: ['support_agent'] } : null;
}
