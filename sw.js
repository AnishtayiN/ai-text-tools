const CACHE='ai-text-tools-v1';
const ASSETS=['/ai-text-tools/','/ai-text-tools/index.html','/ai-text-tools/styles.css','/ai-text-tools/app.js','/ai-text-tools/manifest.json','/ai-text-tools/icon.svg'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin===location.origin&&e.request.url.includes('r.jina.ai'))return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached;
      return fetch(e.request).then(resp=>{
        if(resp.ok&&url.origin===location.origin){
          const clone=resp.clone();
          caches.open(CACHE).then(c=>c.put(e.request,clone));
        }
        return resp;
      }).catch(()=>caches.match('/ai-text-tools/'));
    })
  );
});