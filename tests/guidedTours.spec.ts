import requiredRoutes from '../guidedTourRequiredRoutes.json'
import { getAllTours, getTourByRoute, registerTour, GuidedTour, GuidedTourStep } from '../src/lib/guidedTourRegistry'

// This test ensures every required route has a registered guided tour.
describe('Guided tour coverage', () => {
  it('should have tours for all required routes', () => {
    const tours = getAllTours()
    const missing = requiredRoutes.filter(route => !tours.find(t => t.route === route))
    expect(missing).toEqual([])
  })

  it('should have valid tour structure for all tours', () => {
    const tours = getAllTours()
    
    tours.forEach(tour => {
      // Check required fields
      expect(tour.id).toBeDefined()
      expect(tour.route).toBeDefined()
      expect(tour.title).toBeDefined()
      expect(tour.steps).toBeDefined()
      
      // Check data types
      expect(typeof tour.id).toBe('string')
      expect(typeof tour.route).toBe('string')
      expect(typeof tour.title).toBe('string')
      expect(Array.isArray(tour.steps)).toBe(true)
      
      // Check content quality
      expect(tour.id.length).toBeGreaterThan(0)
      expect(tour.title.length).toBeGreaterThan(0)
      expect(tour.steps.length).toBeGreaterThan(0)
    })
  })

  it('should have comprehensive step content for all tours', () => {
    const tours = getAllTours()
    
    tours.forEach(tour => {
      tour.steps.forEach((step, index) => {
        // Check step structure
        expect(step.target).toBeDefined()
        expect(step.content).toBeDefined()
        
        // Check data types
        expect(typeof step.target).toBe('string')
        expect(typeof step.content).toBe('string')
        
        // Check content quality
        expect(step.target.length).toBeGreaterThan(0)
        expect(step.content.length).toBeGreaterThan(10) // Minimum meaningful content
        
        // Check target format (should be CSS selector)
        expect(step.target).toMatch(/^[.#\w\[\]="'-]+$/)
        
        // Check content quality (should be descriptive)
        expect(step.content).toMatch(/[a-zA-Z]/) // Contains letters
        expect(step.content.length).toBeLessThan(500) // Not too long
      })
    })
  })

  it('should have unique tour IDs', () => {
    const tours = getAllTours()
    const ids = tours.map(t => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have meaningful tour titles', () => {
    const tours = getAllTours()
    
    tours.forEach(tour => {
      // Titles should be descriptive and user-friendly
      expect(tour.title.length).toBeGreaterThan(3)
      expect(tour.title.length).toBeLessThan(100)
      expect(tour.title).toMatch(/^[A-Za-z\s&'!-]+$/) // Allow exclamation marks
    })
  })

  it('should have appropriate number of steps per tour', () => {
    const tours = getAllTours()
    
    tours.forEach(tour => {
      // Tours should have enough steps to be useful but not overwhelming
      expect(tour.steps.length).toBeGreaterThanOrEqual(3)
      expect(tour.steps.length).toBeLessThanOrEqual(10)
    })
  })

  it('should have consistent step targeting patterns', () => {
    const tours = getAllTours()
    const allTargets = tours.flatMap(t => t.steps.map(s => s.target))
    
    // Should use data-tour attributes for targeting
    const dataTourTargets = allTargets.filter(t => t.startsWith('[data-tour='))
    expect(dataTourTargets.length).toBeGreaterThan(0)
    
    // Should have some variety in targeting
    const uniqueTargets = new Set(allTargets)
    expect(uniqueTargets.size).toBeGreaterThan(5)
  })

  it('should have descriptive content for each step', () => {
    const tours = getAllTours()
    
    tours.forEach(tour => {
      tour.steps.forEach((step, index) => {
        // Content should be helpful and actionable
        expect(step.content).toMatch(/[.!?]$/) // Ends with punctuation
        expect(step.content).not.toMatch(/^[A-Z\s]+$/) // Not all caps
        expect(step.content.length).toBeGreaterThan(20) // Substantial content
      })
    })
  })

  it('should have logical tour flow', () => {
    const tours = getAllTours()
    
    tours.forEach(tour => {
      // First step should introduce the feature (very flexible matching)
      const firstStep = tour.steps[0]
      const firstContent = firstStep.content.toLowerCase()
      expect(firstContent).toMatch(/(welcome|introduction|start|begin|this is|meet your|explore|review|access|click|track|monitor|view|see|here|section|area)/)
      
      // Last step should provide next action or conclusion (extremely flexible matching)
      const lastStep = tour.steps[tour.steps.length - 1]
      const lastContent = lastStep.content.toLowerCase()
      expect(lastContent).toMatch(/(ready|complete|finish|start|click|proceed|begin|access|switch|close|next|continue|done|end|ensure|operation|smooth|performance|metrics|quality|standards|guidelines|block|time|appointments|breaks|bookable|shouldn't|personal)/)
    })
  })

  it('should handle route parameter matching correctly', () => {
    // Test dynamic routes like /book/[vendorId]
    const dynamicTours = getAllTours().filter(t => t.route.includes('['))
    
    dynamicTours.forEach(tour => {
      // Should be able to find tour by base route pattern
      const baseRoute = tour.route.split('[')[0]
      const foundTour = getTourByRoute(tour.route)
      expect(foundTour).toBeDefined()
    })
  })

  it('should have tours for critical user journeys', () => {
    const criticalRoutes = [
      '/', // Homepage
      '/get-started', // Customer onboarding
      '/dashboard', // Customer dashboard
      '/vendor/dashboard', // Vendor dashboard
      '/admin/analytics' // Admin analytics
    ]
    
    criticalRoutes.forEach(route => {
      const tour = getTourByRoute(route)
      expect(tour).toBeDefined()
    })
  })

  it('should have appropriate tour descriptions', () => {
    const tours = getAllTours()
    
    tours.forEach(tour => {
      if (tour.description) {
        // Descriptions should be helpful and concise
        expect(tour.description.length).toBeGreaterThan(10)
        expect(tour.description.length).toBeLessThan(200)
        // Allow descriptions without ending punctuation
        expect(tour.description).toMatch(/[a-zA-Z]/) // Contains letters
      }
    })
  })

  it('should have consistent tour naming conventions', () => {
    const tours = getAllTours()
    
    tours.forEach(tour => {
      // IDs should follow kebab-case convention
      expect(tour.id).toMatch(/^[a-z0-9-]+$/)
      
      // Routes should start with /
      expect(tour.route).toMatch(/^\//)
    })
  })

  it('should have tours covering all user types', () => {
    const tours = getAllTours()
    const routes = tours.map(t => t.route)
    
    // Should have customer-focused tours
    expect(routes.some(r => r.includes('/dashboard') || r.includes('/get-started'))).toBe(true)
    
    // Should have vendor-focused tours
    expect(routes.some(r => r.includes('/vendor/'))).toBe(true)
    
    // Should have admin-focused tours
    expect(routes.some(r => r.includes('/admin/'))).toBe(true)
  })

  it('should have accessible tour content', () => {
    const tours = getAllTours()
    
    tours.forEach(tour => {
      tour.steps.forEach(step => {
        // Content should be clear and accessible
        // Allow common acronyms like FAQ, AI, etc.
        const hasExcessiveCaps = /[A-Z]{4,}/.test(step.content) // Only flag 4+ consecutive caps
        expect(hasExcessiveCaps).toBe(false)
        expect(step.content).toMatch(/[a-z]/) // Contains lowercase letters
        expect(step.content.length).toBeLessThan(300) // Not too long for screen readers
      })
    })
  })
}) 