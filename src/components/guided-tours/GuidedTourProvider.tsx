'use client';

import { createContext, useContext, ReactNode } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

interface StepOption extends Shepherd.Step.StepOptions {
  helpArticleSlug?: string;
}

interface TourContextValue {
  startTour: (tourId: string, steps: StepOption[]) => void;
  hasCompletedTour: (tourId: string) => boolean;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const startTour = (tourId: string, steps: StepOption[]) => {
    const tour = new Shepherd.Tour({
      defaultStepOptions: {
        scrollTo: true,
        cancelIcon: { enabled: true }
      }
    });

    steps.forEach(step => {
      const { helpArticleSlug, ...rest } = step;
      if (helpArticleSlug) {
        const text = Array.isArray(rest.text) ? rest.text.join(' ') : rest.text || '';
        const link = `<a href="/help/${helpArticleSlug}" target="_blank" rel="noreferrer" class="shepherd-help-link">Learn more</a>`;
        rest.text = text + ' ' + link;
      }
      tour.addStep(rest);
    });

    const markComplete = () => {
      try {
        localStorage.setItem(`tour_completed_${tourId}`, 'true');
      } catch {}
    };

    tour.on('complete', markComplete);
    tour.on('cancel', markComplete);

    tour.start();
  };

  const hasCompletedTour = (tourId: string) => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(`tour_completed_${tourId}`) === 'true';
    } catch {
      return true;
    }
  };

  return (
    <TourContext.Provider value={{ startTour, hasCompletedTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useGuidedTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useGuidedTour must be used within GuidedTourProvider');
  return ctx;
}

