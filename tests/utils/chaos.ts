// 🌪️ Chaos Engineering Harness for Playwright
// Simulates network failures, latency, and service outages

import { Page, Route } from "@playwright/test";

export type ChaosConfig = {
  enabled: boolean;
  latencyMs: number;       // base latency added to every request
  failureRate: number;     // e.g. 0.1 = 10% of requests -> 500
  timeoutRate: number;     // e.g. 0.05 = 5% of requests -> abort()
  supabaseFailRate?: number; // targeted failure for Supabase endpoints
  aiFailRate?: number;     // targeted failure for AI endpoints (Ollama)
  paymentFailRate?: number; // targeted failure for payment flows
  slowPaths?: RegExp[];    // selectively slow (e.g. booking)
  failPaths?: RegExp[];    // selectively fail
};

export function loadChaosFromEnv(): ChaosConfig {
  const enabled = process.env.CHAOS_ENABLED === "true";
  const latencyMs = parseInt(process.env.CHAOS_LATENCY_MS || "0", 10);
  const failureRate = parseFloat(process.env.CHAOS_FAILURE_RATE || "0");
  const timeoutRate = parseFloat(process.env.CHAOS_TIMEOUT_RATE || "0");
  
  return {
    enabled,
    latencyMs,
    failureRate,
    timeoutRate,
    supabaseFailRate: parseFloat(process.env.CHAOS_SUPABASE_FAIL_RATE || "0"),
    aiFailRate: parseFloat(process.env.CHAOS_AI_FAIL_RATE || "0"),
    paymentFailRate: parseFloat(process.env.CHAOS_PAYMENT_FAIL_RATE || "0"),
    slowPaths: [
      /\/api\/bookings/i,
      /\/api\/payments/i,
      /\/api\/auth/i,
      /\/api\/ai-chat/i,
      /\/api\/ai-radius-scaling/i,
    ],
    failPaths: [
      /\/api\/bookings\/confirm/i,
      /\/api\/bookings\/rebook/i,
      /\/api\/payments\/create-intent/i,
    ],
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rand(): number {
  return Math.random();
}

function getRandomLatency(base: number): number {
  // Add 0-200ms jitter to make it more realistic
  return base + Math.floor(Math.random() * 200);
}

export async function installChaos(page: Page, cfg: ChaosConfig): Promise<void> {
  if (!cfg.enabled) {
    console.log("🌪️ Chaos engineering disabled");
    return;
  }

  console.log("🌪️ Chaos engineering enabled:", {
    latency: `${cfg.latencyMs}ms`,
    failure: `${(cfg.failureRate * 100).toFixed(1)}%`,
    timeout: `${(cfg.timeoutRate * 100).toFixed(1)}%`,
    supabase: cfg.supabaseFailRate ? `${(cfg.supabaseFailRate * 100).toFixed(1)}%` : "0%",
  });

  await page.route("**/*", async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Skip static assets from chaos (focus on API calls)
    if (/(\.js|\.css|\.png|\.jpg|\.svg|\.ico|\.woff|\.woff2)$/i.test(url)) {
      await route.continue();
      return;
    }

    // Identify service types
    const isSupabase = /supabase\.co\/rest\/v1/i.test(url) || 
                      /supabase\.co\/auth\/v1/i.test(url) ||
                      /supabase\.co\/storage\/v1/i.test(url);
    
    const isAI = /\/api\/ai-/i.test(url) || 
                /\/api\/test-ollama/i.test(url) ||
                /ollama/i.test(url);
    
    const isPayment = /\/api\/payments/i.test(url) || 
                     /stripe\.com/i.test(url);

    // Apply selective latency for critical flows
    let latency = cfg.latencyMs;
    if (cfg.slowPaths?.some((regex) => regex.test(url))) {
      latency = getRandomLatency(cfg.latencyMs + 150);
      console.log(`🐌 Chaos: Adding ${latency}ms latency to ${method} ${url}`);
    } else if (latency > 0) {
      latency = getRandomLatency(latency);
    }

    if (latency > 0) {
      await wait(latency);
    }

    // Random timeouts (simulate network black holes)
    if (rand() < cfg.timeoutRate) {
      console.log(`⚡ Chaos: Aborting request to ${method} ${url}`);
      await route.abort("connectionfailed");
      return;
    }

    // Targeted Supabase failure injection
    if (isSupabase && cfg.supabaseFailRate && rand() < cfg.supabaseFailRate) {
      console.log(`💥 Chaos: Supabase failure for ${method} ${url}`);
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ 
          error: "Service temporarily unavailable",
          message: "Supabase is experiencing high load. Please try again.",
          hint: "This is a chaos engineering simulation"
        }),
      });
      return;
    }

    // Targeted AI failure injection
    if (isAI && cfg.aiFailRate && rand() < cfg.aiFailRate) {
      console.log(`🤖 Chaos: AI service failure for ${method} ${url}`);
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "AI service unavailable",
          message: "Our AI assistant is taking a coffee break. Try again in a moment.",
          fallback: true
        }),
      });
      return;
    }

    // Targeted payment failure injection  
    if (isPayment && cfg.paymentFailRate && rand() < cfg.paymentFailRate) {
      console.log(`💳 Chaos: Payment failure for ${method} ${url}`);
      await route.fulfill({
        status: 502,
        contentType: "application/json", 
        body: JSON.stringify({
          error: "Payment gateway timeout",
          message: "Payment processing temporarily unavailable. Your card was not charged.",
          retry_after: 30
        }),
      });
      return;
    }

    // Generic random failures (production weirdness)
    if (rand() < cfg.failureRate || cfg.failPaths?.some((regex) => regex.test(url))) {
      console.log(`🎲 Chaos: Random failure for ${method} ${url}`);
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ 
          error: "Internal server error",
          message: "Something went wrong. Please try again.",
          chaos: true
        }),
      });
      return;
    }

    // Default: pass through normally
    await route.continue();
  });
}
