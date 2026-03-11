// public/sw.js
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Daily Check-In 🎯";
  const options = {
    body: data.body || "Vergiss nicht dein heutiges Versprechen!",
    icon: "/logo192.png",
    badge: "/logo192.png",
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Reagiert auf Klicks auf die Nachricht
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/') // Öffnet deine App
  );
});