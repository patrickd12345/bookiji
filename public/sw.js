// Bookiji Service Worker
self.addEventListener('install', function(event) {
  console.log('Service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service worker activating...');
});

self.addEventListener('fetch', function(event) {
  // Let network handle all requests for now
  return;
});
