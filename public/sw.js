const CACHE = "ke-avo-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first for navigations and data, falling back to the last cached
// response when offline — the field app's own IndexedDB queue (see
// lib/offline-queue.ts) handles receipts actually taken while offline; this
// just keeps the shell itself loadable on a weak or dropped connection.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
