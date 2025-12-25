'use client'

import { useEffect, useRef } from 'react'
import { useTour } from './TourProvider'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export function TourOverlay() {
  const { activeTour, currentStep, isRunning, nextStep, previousStep, skipTour } = useTour()
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isRunning || !activeTour) return

    const step = activeTour.steps[currentStep]
    if (!step) return

    const targetElement = document.querySelector(step.target)
    if (!targetElement) {
      console.warn(`Tour target not found: ${step.target}`)
      return
    }

    // Scroll target into view
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Highlight target element
    const rect = targetElement.getBoundingClientRect()
    const overlay = overlayRef.current
    if (overlay) {
      // Create highlight effect
      const highlight = document.createElement('div')
      highlight.style.position = 'fixed'
      highlight.style.left = `${rect.left}px`
      highlight.style.top = `${rect.top}px`
      highlight.style.width = `${rect.width}px`
      highlight.style.height = `${rect.height}px`
      highlight.style.border = '3px solid #8b5cf6'
      highlight.style.borderRadius = '8px'
      highlight.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.5)'
      highlight.style.pointerEvents = 'none'
      highlight.style.zIndex = '9998'
      highlight.id = 'tour-highlight'
      
      // Remove existing highlight
      const existing = document.getElementById('tour-highlight')
      if (existing) existing.remove()
      
      document.body.appendChild(highlight)

      return () => {
        const toRemove = document.getElementById('tour-highlight')
        if (toRemove) toRemove.remove()
      }
    }
  }, [isRunning, activeTour, currentStep])

  if (!isRunning || !activeTour) return null

  const step = activeTour.steps[currentStep]
  if (!step) return null

  const targetElement = document.querySelector(step.target)
  if (!targetElement) return null

  const rect = targetElement.getBoundingClientRect()
  const placement = step.placement || 'bottom'
  
  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = {}
  switch (placement) {
    case 'top':
      tooltipStyle = {
        bottom: `${window.innerHeight - rect.top + 10}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translateX(-50%)',
      }
      break
    case 'bottom':
      tooltipStyle = {
        top: `${rect.bottom + 10}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translateX(-50%)',
      }
      break
    case 'left':
      tooltipStyle = {
        top: `${rect.top + rect.height / 2}px`,
        right: `${window.innerWidth - rect.left + 10}px`,
        transform: 'translateY(-50%)',
      }
      break
    case 'right':
      tooltipStyle = {
        top: `${rect.top + rect.height / 2}px`,
        left: `${rect.right + 10}px`,
        transform: 'translateY(-50%)',
      }
      break
  }

  return (
    <>
      {/* Overlay backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-[9997]"
        onClick={skipTour}
        aria-label="Click to skip tour"
      />

      {/* Tooltip */}
      <div
        className="fixed z-[9999] bg-white rounded-lg shadow-xl p-6 max-w-sm"
        style={tooltipStyle}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-content"
      >
        <div className="flex items-start justify-between mb-2">
          <h3 id="tour-title" className="text-lg font-bold text-gray-900">
            {step.title}
          </h3>
          <button
            onClick={skipTour}
            className="text-gray-400 hover:text-gray-600 ml-2"
            aria-label="Skip tour"
          >
            <X size={20} />
          </button>
        </div>
        <p id="tour-content" className="text-gray-600 mb-4">
          {step.content}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Step {currentStep + 1} of {activeTour.steps.length}
          </span>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={previousStep}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 flex items-center gap-1"
            >
              {currentStep < activeTour.steps.length - 1 ? (
                <>
                  Next
                  <ChevronRight size={16} />
                </>
              ) : (
                'Finish'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
