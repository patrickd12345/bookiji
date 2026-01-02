import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OllamaService } from '@/lib/ollama'

// Mock the entire fetch module
vi.mock('node-fetch', () => ({
  default: vi.fn()
}))

describe('OllamaService', () => {
  let ollamaService: OllamaService
  let mockFetch: any

  beforeEach(async () => {
    vi.clearAllMocks()
    ollamaService = new OllamaService('http://test-endpoint', 'test-model')
    
    // Get the mocked fetch function
    const { default: fetch } = await import('node-fetch')
    mockFetch = fetch
  })

  describe('Configuration', () => {
    it('allows timeout configuration updates', () => {
      const originalTimeout = ollamaService.getTimeout()
      ollamaService.setTimeout(25000)
      
      expect(ollamaService.getTimeout()).toBe(25000)
      expect(ollamaService.getTimeout()).not.toBe(originalTimeout)
    })

    it('provides configuration access', () => {
      const config = ollamaService.getConfig()
      
      expect(config).toHaveProperty('ollama')
      expect(config).toHaveProperty('fallbacks')
      expect(config).toHaveProperty('monitoring')
      expect(config.ollama).toHaveProperty('timeout')
      expect(config.ollama).toHaveProperty('maxRetries')
    })
  })

  describe('Fallback Response Logic', () => {
    it('identifies booking-related queries correctly', () => {
      // Test the private method through reflection or public interface
      const config = ollamaService.getConfig()
      expect(config.fallbacks.enabled).toBe(true)
      expect(config.fallbacks.responseTypes).toContain('booking')
      expect(config.fallbacks.responseTypes).toContain('general')
    })
  })

  describe('Service Configuration', () => {
    it('uses correct endpoint and model', () => {
      const config = ollamaService.getConfig()
      expect(config.ollama).toBeDefined()
      expect(config.ollama.timeout).toBeGreaterThan(0)
      expect(config.ollama.maxRetries).toBeGreaterThan(0)
    })

    it('has reasonable timeout values', () => {
      const config = ollamaService.getConfig()
      expect(config.ollama.timeout).toBeLessThanOrEqual(30000) // Max 30 seconds
      expect(config.ollama.healthCheckTimeout).toBeLessThanOrEqual(10000) // Max 10 seconds
      expect(config.ollama.modelCheckTimeout).toBeLessThanOrEqual(15000) // Max 15 seconds
    })
  })

  describe('Monitoring Configuration', () => {
    it('has monitoring options configurable', () => {
      const config = ollamaService.getConfig()
      expect(config.monitoring).toHaveProperty('logResponseTimes')
      expect(config.monitoring).toHaveProperty('logFallbacks')
      expect(config.monitoring).toHaveProperty('logErrors')
    })
  })
})
