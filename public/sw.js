self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Do not intercept requests until a real offline shell is deliberately
  // implemented. A failed network request must remain a normal browser
  // response, never an invalid Response that prevents the storefront loading.
  event.waitUntil(self.clients.claim());
});
