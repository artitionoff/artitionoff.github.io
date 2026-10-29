// Сначала сеть (чтобы обновления доходили), без сети отдаём из кэша.
const C = "cuzinar-cache";
const FILES = ["./", "index.html", "style.css", "motion.css", "theme.css", "theme.js", "recipes.js", "app.js", "manifest.json", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(FILES))); });
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request))
  );
});
