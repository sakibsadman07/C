// Offline-first-ish service worker:
//  - pre-saves the app files on install, so it opens offline right after the first visit
//  - online: always fetches the newest copy (falls back to the saved copy if the network is slow/offline)
//  - also saves notice photos so they show offline
// Bump V to force every phone to refresh its saved files.
const V = "class-routine-v9";
const PRE = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "announcements.json"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(V).then(function (c) {
      return Promise.all(PRE.map(function (u) {
        return c.add(new Request(u, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function timeout(ms) { return new Promise(function (_, rej) { setTimeout(rej, ms); }); }

self.addEventListener("fetch", function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  var same = u.origin === location.origin;
  var noticeImg = u.hostname === "raw.githubusercontent.com" && /\/notice-img\//.test(u.pathname);
  if (!same && !noticeImg) return;
  if (same && /\.apk$/i.test(u.pathname)) return;
  var key = same ? u.origin + u.pathname : r.url;   // ignore ?t=... cache-busters
  e.respondWith(
    Promise.race([fetch(r, { cache: "no-store" }), timeout(noticeImg ? 8000 : 5000)]).then(function (res) {
      if (res && (res.status === 200 || res.type === "opaque")) {
        var c = res.clone();
        caches.open(V).then(function (x) { x.put(key, c); });
      }
      return res;
    }).catch(function () {
      return caches.match(key, { ignoreSearch: true })
        .then(function (m) { return m || (r.mode === "navigate" ? caches.match("index.html") : null); })
        .then(function (m) { return m || Response.error(); });
    })
  );
});
