const CACHE='church-v2-shell-10-v500';
const ASSETS=['/','/assets/styles.css?v=500','/assets/app.js?v=500','/assets/i18n.js?v=500','/assets/icon-192.png','/assets/icon-512.png','/manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  const isModule=url.pathname.endsWith('.js')||url.pathname==='/admin'||url.pathname==='/admin/';
  if(isModule){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('/'))));
    return;
  }
  const staticAsset=url.pathname.startsWith('/assets/')||url.pathname==='/manifest.webmanifest';
  if(staticAsset){
    event.respondWith(caches.match(event.request).then(cached=>{
      const refresh=fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>cached);
      return cached||refresh;
    }));
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('/'))));
});
