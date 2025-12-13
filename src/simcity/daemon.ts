interface DaemonEnvironment {
  SIMCITY_ALLOWED?: string;
  BOOKIJI_ENV?: string;
  SIMCITY_TARGET_BASE_URL?: string;
}

const TARGET_ALLOWLIST = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i,
  /^https?:\/\/[^\s]+staging[^\s]*$/i,
];

function assertEnvironment(env: DaemonEnvironment): void {
  if (env.SIMCITY_ALLOWED !== "true") {
    throw new Error("SimCity daemon is disabled by SIMCITY_ALLOWED");
  }
  if (env.BOOKIJI_ENV === "prod") {
    throw new Error("SimCity daemon cannot run in production");
  }
  const target = env.SIMCITY_TARGET_BASE_URL;
  if (!target) {
    throw new Error("SIMCITY_TARGET_BASE_URL is required for SimCity daemon");
  }
  const isAllowlisted = TARGET_ALLOWLIST.some((pattern) => pattern.test(target));
  if (!isAllowlisted) {
    throw new Error("SimCity target is not allowlisted for safety");
  }
}

export async function startSimCityDaemon(env: DaemonEnvironment = process.env): Promise<void> {
  assertEnvironment(env);
  // Placeholder: Real daemon logic is intentionally not implemented in safety mode.
}

export { assertEnvironment as assertSimCityEnvironment };
