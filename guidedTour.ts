// @ts-nocheck
// Bookiji Guided Tour utility built on Shepherd.js
import Shepherd from 'shepherd.js'
import 'shepherd.js/dist/css/shepherd.css'

// Inline styles to brand the tour consistently with Bookiji
const tourStyles = `
  .shepherd-element {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: white;
    border-radius: 12px;
    box-shadow: 0 25px 50px rgba(0,0,0,0.3);
    max-width: 400px;
  }
  .shepherd-text {
    font-size: 16px;
    line-height: 1.6;
    padding: 20px;
  }
  .shepherd-header {
    background: rgba(255,255,255,0.1);
    padding: 15px 20px;
    border-radius: 12px 12px 0 0;
    font-weight: 600;
    font-size: 18px;
  }
  .shepherd-button {
    background: rgba(255,255,255,0.2);
    color: white;
    border: 2px solid rgba(255,255,255,0.3);
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    margin: 0 5px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .shepherd-button:hover {
    background: rgba(255,255,255,0.3);
    transform: translateY(-2px);
  }
  .shepherd-button.shepherd-button-primary {
    background: white;
    color: #4f46e5;
  }
`

// Inject custom styles once in the browser context
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style')
  styleEl.textContent = tourStyles
  document.head.appendChild(styleEl)
}

export interface TourStep {
  id: string
  title: string
  text: string
  attachTo?: { element: string; on: 'top' | 'bottom' | 'left' | 'right' }
  beforeShow?: () => void
  when?: { show?: () => void; hide?: () => void }
}

export class BookijiTour {
  // Runtime tour instance
  private tour: any
  private currentStep = 0
  private totalSteps = 0

  constructor() {
    this.tour = new Shepherd.Tour({
      defaultStepOptions: {
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true },
        classes: 'bookiji-tour-step',
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 8,
      },
      useModalOverlay: true,
    })
  }

  addSteps(steps: TourStep[]) {
    this.totalSteps = steps.length

    steps.forEach((step, index) => {
      const isFirst = index === 0
      const isLast = index === steps.length - 1

      const buttons: any[] = []

      if (!isFirst) {
        buttons.push({ text: 'Back', action: () => { this.currentStep--; this.tour.back() } })
      }
      if (isLast) {
        buttons.push({ text: 'Finish Tour', action: () => { this.tour.complete(); this.onTourComplete() } })
      } else {
        buttons.push({ text: 'Next', action: () => { this.currentStep++; this.tour.next() } })
      }

      this.tour.addStep({
        id: step.id,
        title: step.title,
        text: `
          <div class="shepherd-header">${step.title}</div>
          <div class="shepherd-text">${step.text}
            <div style="margin-top:15px;font-size:14px;opacity:0.8;">Step ${index + 1} of ${steps.length}</div>
          </div>
        `,
        attachTo: step.attachTo,
        buttons,
        beforeShow: step.beforeShow,
        when: {
          show: () => { this.currentStep = index; step.when?.show?.() },
          hide: step.when?.hide,
        },
      })
    })
  }

  start() {
    this.currentStep = 0
    this.tour.start()
  }

  complete() {
    this.tour.complete()
    this.onTourComplete()
  }

  private onTourComplete() {
    if (typeof window === 'undefined') return
    localStorage.setItem('bookiji_tour_completed', 'true')
    localStorage.setItem('bookiji_tour_completed_date', new Date().toISOString())
  }

  /* ---------- static helpers ---------- */

  static hasCompletedTour(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('bookiji_tour_completed') === 'true'
  }

  static shouldShowTour(): boolean {
    return !BookijiTour.hasCompletedTour()
  }

  static resetTour(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('bookiji_tour_completed')
    localStorage.removeItem('bookiji_tour_completed_date')
  }
}

// Default step definitions for the customer booking flow
export const BOOKING_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Bookiji!',
    text: `<p>Quick tour highlights:</p><ul><li>Find the right service</li><li>Pick the perfect time</li><li>Secure with \$1</li></ul>`
  },
  {
    id: 'service-selection',
    title: 'Choose Your Service',
    text: `<p>Select the service you need. Ratings, descriptions, and prices are right there.</p>`,
    attachTo: { element: '.service-selector', on: 'bottom' },
  },
  {
    id: 'date-picker',
    title: 'Pick Your Date',
    text: `<p>Our calendar shows real-time availability.</p>`,
    attachTo: { element: '.date-picker', on: 'right' },
  },
  {
    id: 'time-slots',
    title: 'Choose Your Time',
    text: `<p>Select from available slots and get instant confirmation.</p>`,
    attachTo: { element: '.time-slots', on: 'top' },
  },
  {
    id: 'confirm-booking',
    title: 'Confirm Your Booking',
    text: `<p>Review and lock in your booking. You only pay \$1 now.</p>`,
    attachTo: { element: '.confirm-button', on: 'top' },
  },
]

export function startBookingTour() {
  const tour = new BookijiTour()
  tour.addSteps(BOOKING_TOUR_STEPS)
  tour.start()
  return tour
} 