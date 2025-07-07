// Simple guided tour implementation
// No external dependencies to prevent build issues

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

  constructor(_?: TourOptions) {
    // Stub constructor
  }

  addStep(step: TourStep): Tour {
    this.steps.push(step);
    return this;
  }

  start(): void {
    console.log('Guided tour started (stub implementation)');
  }

  complete(): void {
    console.log('Tour completed');
  }

  cancel(): void {
    console.log('Tour cancelled');
  }

  show(stepId?: string): void {
    console.log('Showing tour step:', stepId);
  }

  hide(): void {
    console.log('Tour hidden');
  }
}

// Backward compatibility exports
export const BookijiTour = {
  resetTour: () => console.log('Tour reset'),
  start: () => new Tour().start(),
  complete: () => console.log('Tour completed'),
  show: (stepId?: string) => console.log('Showing step:', stepId),
  hide: () => console.log('Tour hidden')
};

export default Tour; 