'use strict';
// Opt-in, same-origin shell only. No JSON feeds, identity, or operations caches.
const CACHE = 'night-garden-play-room-shell-v1';
const ROOT = new URL('./', self.location.href);
const FILES = ['play-room.html', 'play-room.css', 'play-room.js', 'play-room.webmanifest', 'play-room-icon.svg'];
const URLS = new Set(FILES.map(name => new URL(name, ROOT).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all([...URLS].map(async url => {
    const response = await fetch(url, {credentials: 'omit', redirect: 'error', cache: 'reload'});
    if (!response.ok || response.type !== 'basic') throw new Error('Static shell unavailable');
    await cache.put(url, response);
  }))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('night-garden-play-room-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin || url.search || !URLS.has(url.href)) return;
  event.respondWith(fetch(new Request(event.request, {credentials: 'omit', redirect: 'error'})).then(response => {
    if (!response.ok || response.type !== 'basic') throw new Error('Shell unavailable');
    const copy = response.clone();
    event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request.url, copy)));
    return response;
  }).catch(async () => {
    const saved = await caches.match(event.request.url, {cacheName: CACHE});
    return saved || new Response('This room has not been saved offline yet.', {status: 503, headers: {'Content-Type': 'text/plain'}});
  }));
});
