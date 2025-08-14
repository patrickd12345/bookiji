import { dlqMonitor } from './dlqMonitor';

let initialized = false;

export async function initObservability() {
  if (initialized) return;
  initialized = true;
  if (process.env.SENTRY_DSN) {
    try {
      const moduleName = '@sentry/nextjs';
      const Sentry = await import(moduleName);
      Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1.0 });
    } catch {
      // Sentry not installed; ignore
    }
  }
  // Start DLQ monitoring
  if (typeof window === 'undefined') {
    setInterval(() => dlqMonitor.runCheck(), 60000); // Check every minute
  }
}

initObservability();
