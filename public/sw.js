// Bookiji Service Worker
self.addEventListener('install', function(event) {
  console.log('Service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service worker activating...');
});

// Removed no-op fetch handler to prevent overhead warnings
// If you need caching, implement proper fetch handling here
