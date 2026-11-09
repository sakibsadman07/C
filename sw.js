// Network-first service worker: always loads the newest files when online,
// falls back to the cached copy when offline. Bump V to force a full refresh.
const V="class-routine-v8";
self.addEventListener("install",function(){self.skipWaiting()});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==V}).map(function(k){return caches.delete(k)}))
  }).then(function(){return self.clients.claim()}))
});
self.addEventListener("fetch",function(e){
  var r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin||/\.apk$/i.test(u.pathname))return;
  e.respondWith(
    fetch(r,{cache:"no-store"}).then(function(res){
      if(res&&res.status===200){var c=res.clone();caches.open(V).then(function(x){x.put(r,c)})}
      return res
    }).catch(function(){
      return caches.match(r).then(function(m){return m||caches.match("index.html")})
    })
  )
});
