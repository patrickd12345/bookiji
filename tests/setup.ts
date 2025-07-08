import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Set up environment variables for integration tests
process.env.NODE_ENV = 'test'
process.env.DEPLOY_ENV = 'test'

// Supabase Test Project (create a dedicated test project)
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your-test-project-anon-key'

// Stripe Test Mode (using test API keys)
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_your_key'
process.env.STRIPE_SECRET_KEY = 'sk_test_your_key'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_your_webhook_secret'

// LLM Test Endpoint
process.env.LOCAL_LLM_URL = 'http://localhost:11434' // Local Ollama for tests
process.env.LOCAL_LLM_MODEL = 'llama2:7b' // Smaller model for faster tests

// Base URL for API routes
process.env.TEST_BASE_URL = 'http://localhost:3000'

// Configure testing-library
beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

afterEach(() => {
  cleanup()
})
