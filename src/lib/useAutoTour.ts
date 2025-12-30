import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Shepherd from 'shepherd.js'
import { getTourByRoute } from './guidedTourRegistry'
import { isTruthyEnv } from './env/isTruthyEnv'

export function useAutoTour() {
  const pathname = usePathname() ?? ''

  useEffect(() => {
    if (isTruthyEnv(process.env.NEXT_PUBLIC_E2E)) return

    const tourDef = getTourByRoute(pathname)
    if (!tourDef) return

    const tour = new Shepherd.Tour({ defaultStepOptions: { cancelIcon: { enabled: true }, scrollTo: { behavior: 'smooth', block: 'center' } } })

    tourDef.steps.forEach((s) => {
      tour.addStep({
        title: tourDef.title,
        text: s.content,
        attachTo: { element: s.target, on: 'bottom' },
        buttons: [
          {
            text: 'Next',
            action: tour.next
          }
        ]
      })
    })

    const seenKey = `tour_seen_${tourDef.id}`
    if (typeof window !== 'undefined' && !localStorage.getItem(seenKey)) {
      tour.start()
      localStorage.setItem(seenKey, 'true')
    }
     
  }, [pathname])
} 
