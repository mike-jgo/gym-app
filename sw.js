let notifTimer = null;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const data = event.data;

  if (data?.type === 'SCHEDULE_NOTIF') {
    clearTimeout(notifTimer);
    // event.waitUntil keeps the SW alive until the promise resolves,
    // preventing the browser/OS from terminating it before the timer fires.
    event.waitUntil(
      new Promise((resolve) => {
        notifTimer = setTimeout(() => {
          self.registration
            .showNotification('Rest over — GO!', {
              body: 'Time to get back to it.',
              vibrate: [200, 100, 200, 100, 200],
              tag: 'rest-timer',
              renotify: true,
              silent: false,
            })
            .then(resolve, resolve);
        }, data.delayMs);
      })
    );
  }

  if (data?.type === 'CANCEL_NOTIF') {
    clearTimeout(notifTimer);
    notifTimer = null;
  }
});
