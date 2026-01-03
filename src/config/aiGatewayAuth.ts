/**
 * AI Gateway Authentication Helper
 *
 * Provides deterministic precedence for AI Gateway authentication:
 * 1) AI_GATEWAY_API_KEY (or VERCEL_AI_KEY for backward compatibility)
 * 2) VERCEL_OIDC_TOKEN (short-lived, managed by Vercel)
 * 3) If neither exists, returns null (indicating fallback to local Ollama)
 */
export function getAiGatewayAuth(): { Authorization: string } | null {
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_KEY;
  if (apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  }

  const oidcToken = process.env.VERCEL_OIDC_TOKEN;
  if (oidcToken) {
    return { Authorization: `Bearer ${oidcToken}` };
  }

  return null;
}
