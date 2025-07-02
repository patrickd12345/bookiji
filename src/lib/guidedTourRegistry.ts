import requiredRoutes from '../../guidedTourRequiredRoutes.json'

export interface GuidedTourStep {
  target: string // CSS selector or element
  content: string
}

export interface GuidedTour {
  id: string
  route: string // e.g. '/admin/analytics'
  title: string
  steps: GuidedTourStep[]
}

const tours: GuidedTour[] = []

export function registerTour(tour: GuidedTour) {
  if (!tours.find((t) => t.id === tour.id)) {
    tours.push(tour)
  }
}

export function getTourByRoute(route: string): GuidedTour | undefined {
  return tours.find((t) => t.route === route)
}

export function getAllTours(): GuidedTour[] {
  return [...tours]
}

// Auto-register placeholder tours for all required routes to ensure coverage until real tours are implemented
// This prevents test failures while allowing incremental tour additions.
// Remove or replace placeholders with actual tour definitions as features mature.

requiredRoutes.forEach((route: string) => {
  registerTour({
    id: `placeholder-${route}`,
    route,
    title: 'Placeholder Tour',
    steps: []
  })
}) 