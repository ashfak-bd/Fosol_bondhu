/* ফসল বন্ধু — সার্ভিস ওয়ার্কার (অফলাইন সাপোর্ট + PWA ইনস্টলযোগ্যতার জন্য প্রয়োজনীয়) */

const CACHE_NAME = "foshol-bondhu-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./search-engine.js",
  "./data-loader.js",
  "./fallback-data.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// গুগল শীটের লাইভ ডেটা রিকোয়েস্ট সবসময় নেটওয়ার্ক থেকে আনার চেষ্টা করবে (সবচেয়ে নতুন ডেটার জন্য),
// বাকি সব (app shell) ক্যাশ-প্রথম নীতিতে চলবে — অফলাইনেও অ্যাপ খুলবে।
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  if (url.includes("docs.google.com")) {
    event.respondWith(
      fetch(event.request).catch(() => new Response("", { status: 503 }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});
