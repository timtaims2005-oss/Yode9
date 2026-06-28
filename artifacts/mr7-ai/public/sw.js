/**
 * KaliGPT Service Worker — PWA offline support
 */
const CACHE_NAME = "kaligpt-v4";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API requests or Vite dev-server source files
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.startsWith("/@") ||
    url.search.includes("t=") ||
    url.search.includes("v=")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.status === 200 && request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return res;
      }).catch(() => {
        if (request.mode === "navigate") {
          return caches.match("/") || new Response("Offline");
        }
        return new Response("Offline", { status: 503 });
      });
    })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "KaliGPT", {
      body: data.body || "",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: data.tag || "kaligpt",
      data: data,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow("/");
    })
  );
});
