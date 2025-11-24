// Bookiji Service Worker - Web Push Notifications 2.0

self.addEventListener('install', function(event) {
  console.log('🔔 Service worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('🔔 Service worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', function(event) {
  console.log('🔔 Push notification received:', event);
  
  let notificationData = {
    title: 'Bookiji Notification',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'default',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        data: payload.data || notificationData.data,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false
      };
    } catch (e) {
      console.error('Failed to parse push payload:', e);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      vibrate: [200, 100, 200],
      actions: notificationData.data?.actions || []
    })
  );

  // Notify clients about the push
  event.waitUntil(
    self.clients.matchAll().then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({
          type: 'PUSH_RECEIVED',
          payload: notificationData
        });
      });
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  if (action) {
    // Handle action button clicks
    event.waitUntil(
      self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({
            type: 'NOTIFICATION_ACTION',
            action: action,
            notification: notificationData
          });
        });
      })
    );
  } else {
    // Handle notification body click
    const urlToOpen = notificationData.url || '/';
    
    event.waitUntil(
      self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(function(clientList) {
        // Check if there's already a window/tab open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Handle messages from the app
self.addEventListener('message', function(event) {
  console.log('🔔 Service worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'UPDATE_PREFERENCES') {
    // Store preferences for filtering notifications
    // This could be stored in IndexedDB or sent to the server
    console.log('🔔 Preferences updated:', event.data.preferences);
  }
});
