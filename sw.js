const CACHE_NAME = "galactic-lottery-cache-v1.0.0";

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return Promise.all(
          CORE_ASSETS.map((asset) => {
            return cache.add(asset).catch(() => null);
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirstPage(request) {
  try {
    const freshResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, freshResponse.clone());
    return freshResponse;
  } catch (error) {
    const cachedResponse =
      (await caches.match(request)) ||
      (await caches.match("/index.html")) ||
      (await caches.match("/offline.html"));

    return cachedResponse || new Response("Mode hors-ligne indisponible.", {
      status: 503,
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    refreshCache(request);
    return cachedResponse;
  }

  try {
    const freshResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, freshResponse.clone());
    return freshResponse;
  } catch (error) {
    if (request.destination === "document") {
      return caches.match("/offline.html");
    }

    return new Response("", {
      status: 504,
      statusText: "Offline"
    });
  }
}

async function refreshCache(request) {
  try {
    const freshResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, freshResponse);
  } catch (error) {
    return null;
  }
}
