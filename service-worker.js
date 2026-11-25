importScripts('./js/version.js');
const CACHE='monsieur-blanc-'+APP_VERSION;
const ASSETS=['./','./index.html','./manifest.json','./css/style.css','./js/version.js','./js/players.js','./js/words.js','./js/storage.js','./js/game.js','./js/app.js','./icons/icon-192.png','./icons/icon-512.png','./images/role-blank.webp','./images/role-civil.webp','./images/role-undercover.webp','./images/home-dog.webp'];

self.addEventListener('install',e=>{
  // cache:'reload' : on récupère les fichiers sur le serveur, jamais dans le cache HTTP du navigateur
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
// Réseau d'abord (toujours la dernière version quand on est en ligne), cache en secours hors ligne.
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  e.respondWith(
    fetch(req,{cache:'no-cache'}).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}
      return res;
    }).catch(()=>caches.match(req).then(hit=>hit||(req.mode==='navigate'?caches.match('./index.html'):Response.error())))
  );
});
