// Simple guided tour implementation
// No external dependencies to prevent build issues
import { logger } from './logger'

export interface TourStep {
  id: string;
  title: string;
  text: string;
  attachTo?: {
    element: string;
    on: string;
  };
  buttons?: Array<{
    text: string;
    action: string;
    classes?: string;
  }>;
}

export interface TourOptions {
  useModalOverlay: boolean;
  defaultStepOptions: {
    classes: string;
    scrollTo: boolean;
  };
}

// Stub tour class
export class Tour {
  private steps: TourStep[] = [];

  constructor() {
    // Stub constructor
  }

  addStep(step: TourStep): Tour {
    this.steps.push(step);
    return this;
  }

  start(): void {
    logger.debug('Guided tour started (stub implementation)');
  }

  complete(): void {
    logger.debug('Tour completed');
  }

  cancel(): void {
    logger.debug('Tour cancelled');
  }

  show(stepId?: string): void {
    logger.debug('Showing tour step:', { stepId });
  }

  hide(): void {
    logger.debug('Tour hidden');
  }
}

// Backward compatibility exports
export const BookijiTour = {
  resetTour: () => logger.debug('Tour reset'),
  start: () => new Tour().start(),
  complete: () => logger.debug('Tour completed'),
  show: (stepId?: string) => logger.debug('Showing step:', { stepId }),
  hide: () => logger.debug('Tour hidden')
};

export default Tour; 