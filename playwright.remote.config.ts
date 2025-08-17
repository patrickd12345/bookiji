import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './tests',
	testMatch: /.*\.(spec|test)\.(js|ts|mjs)/,
	timeout: 30_000,
	expect: {
		timeout: 10_000,
		toHaveScreenshot: {
			threshold: 0.01,
			maxDiffPixels: 100,
		},
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		baseURL: process.env.BASE_URL || 'http://localhost:3000',
		viewport: { width: 1280, height: 800 },
		ignoreHTTPSErrors: true,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1280, height: 800 },
				deviceScaleFactor: 1,
			},
		},
	],
})


