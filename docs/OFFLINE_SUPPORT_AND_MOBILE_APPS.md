# Service Worker & Offline Support

Bookiji is built as a mobile-first PWA. The application can be installed on any modern browser and functions offline using a service worker.

## Service Worker Setup

1. Install [`next-pwa`](https://github.com/shadowwalker/next-pwa):
   ```bash
   pnpm add next-pwa
   ```
2. Update `next.config.ts` to enable the plugin:
   ```ts
   // next.config.ts
   import withPWA from 'next-pwa';
   export default withPWA({ dest: 'public' });
   ```
3. Create a custom `service-worker.js` under `public/` if additional caching logic is required. Assets are automatically precached during build.
4. Deploy with `pnpm build` and `pnpm start`; the service worker will register and cache resources.

## Offline Support

- Static assets and the application shell are cached for offline use.
- Dynamic requests can be cached with fallback to network using Workbox strategies.
- Display a friendly offline page when the network is unreachable.
- Sync important actions once connectivity is restored (e.g., queued bookings).

## Native Mobile Apps

A dedicated native mobile app is not yet planned. The current PWA provides an app-like experience on iOS and Android. If demand grows, we may wrap the PWA with React Native or Capacitor for push notifications and App Store distribution.
