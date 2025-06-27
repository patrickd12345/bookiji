import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'

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
