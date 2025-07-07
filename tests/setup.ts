import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Set up environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.TEST_BASE_URL = 'http://localhost:3000'

// Mock global fetch
global.fetch = vi.fn()

// Configure testing-library
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
  // Reset any runtime handlers
  vi.restoreAllMocks()
})

afterEach(() => {
  // Clean up mounted components
  cleanup()
})
