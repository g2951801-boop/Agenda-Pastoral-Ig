// Service worker de Mi Casa de Avivamiento
// - La Biblia (rv1909.json) se guarda una vez y funciona sin conexión.
// - La app abre aunque no haya internet (la última versión visitada).
// - Nunca toca Firebase, EmailJS ni /api (solo archivos de este mismo sitio).
const CACHE = "mca-v1";
const BIBLE = "/rv1909.json";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(["/", BIBLE, "/icon-192.png"].map((u) => c.add(u))))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Páginas: primero la red; si no hay internet, la última copia guardada
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put("/", copy)); return r; })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Biblia: se guarda una vez y no se vuelve a descargar (4 MB)
  if (url.pathname === BIBLE) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((r) => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return r;
      }))
    );
    return;
  }

  // Resto de archivos de la app: usa la copia y la actualiza en segundo plano
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
