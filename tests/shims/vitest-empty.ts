// No-op Vitest shim for Playwright context
// Only override Vitest-specific functions, not Playwright's test function
export const vi: unknown = undefined;
export const describe = () => {};
export const it = () => {};
export const beforeAll = () => {};
export const beforeEach = () => {};
export const afterAll = () => {};
export const afterEach = () => {};
// Don't override test or expect - let Playwright handle those
