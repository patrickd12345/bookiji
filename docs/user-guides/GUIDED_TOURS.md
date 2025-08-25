# Guided Tours Implementation

Bookiji's onboarding experience includes interactive dashboard tours for both customers and vendors. Tours are initialized via the `GuidedTourManager` component and can be triggered automatically or through the `TourButton` component.

The core logic lives in `guidedTourSimple.ts`, a lightweight wrapper that mirrors the Shepherd.js API. In production we still load `shepherd.js` dynamically for full functionality, but the wrapper lets tests and limited environments run without the external dependency.

Key features:

- Step-by-step tooltips highlighting important interface elements
- Support for automatic route-based tours (`useAutoTour` hook)
- Customizable button text and placement for each step

See `src/components/GuidedTourManager.tsx` and `src/lib/guidedTourSimple.ts` for implementation details.
