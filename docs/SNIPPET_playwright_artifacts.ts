// Add this to your export default defineConfig({ use: { ... } }) block:
use: {
  trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
  video: process.env.CI ? 'on' : 'retain-on-failure',
  screenshot: 'only-on-failure',
},
retries: process.env.CI ? 2 : 0,