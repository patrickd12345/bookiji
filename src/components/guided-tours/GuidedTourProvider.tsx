'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';

interface StepOption {
  id?: string;
  text?: string | HTMLElement | (string | HTMLElement)[];
  title?: string;
  buttons?: any[];
  classes?: string;
  highlightClass?: string;
  scrollTo?: boolean;
  modalOverlayOpeningPadding?: number;
  modalOverlayOpeningRadius?: number;
  popperOptions?: any;
  helpArticleSlug?: string;
}

interface TourContextValue {
  startTour: (tourId: string, steps: StepOption[]) => void;
  hasCompletedTour: (tourId: string) => boolean;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

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
        const baseText = Array.isArray(rest.text) ? rest.text.join(' ') : rest.text || '';
        const container = document.createElement('span');
        container.textContent = baseText + ' ';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Learn more';
        button.className = 'underline text-blue-600 hover:text-blue-700';
        button.addEventListener('click', () => router.push(`/help/${helpArticleSlug}`));
        container.appendChild(button);
        rest.text = container;
      }
      tour.addStep(rest as any);
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

