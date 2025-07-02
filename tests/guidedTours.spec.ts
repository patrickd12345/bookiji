import { describe, it, expect } from 'vitest'
import requiredRoutes from '../guidedTourRequiredRoutes.json'
import { getAllTours } from '../src/lib/guidedTourRegistry'

// This test ensures every required route has a registered guided tour.

describe('Guided tour coverage', () => {
  it('has tours for all required routes', () => {
    const tours = getAllTours()
    const routesWithTours = tours.map((t) => t.route)

    const missing = requiredRoutes.filter((r) => !routesWithTours.includes(r))
    expect(missing, `Missing guided tours for routes: ${missing.join(', ')}`).toEqual([])
  })
}) 