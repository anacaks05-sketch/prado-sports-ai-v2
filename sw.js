const CACHE_NAME = "prado-sports-ai-v16-noticias-limpa";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./style.css?v=api-news-clean-v16-20260613",
  "./data.js",
  "./data.js?v=api-news-clean-v16-20260613",
  "./config.js",
  "./config.js?v=api-news-clean-v16-20260613",
  "./api.js",
  "./api.js?v=api-news-clean-v16-20260613",
  "./app.js",
  "./app.js?v=api-news-clean-v16-20260613",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/') || url.hostname.includes('googleusercontent.com') || url.hostname.includes('google.com')) {
    event.respondWith(fetch(req));
    return;
  }

  // HTML primeiro pela rede para evitar que o celular fique preso em versão antiga após publicar.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", clone));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => undefined);
    })
  );
});

// Placeholder for future push notifications (goals, cards, kickoff, etc.)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Prado Sports AI", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Prado Sports AI";
  const options = {
    body: data.body || "",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    vibrate: [100, 50, 100],
    data: data.url || "./index.html"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "./index.html";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
