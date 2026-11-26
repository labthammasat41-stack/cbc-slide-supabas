/* ตาม Slide CBC — service worker
   หน้าแอป: โหลดจากเน็ตก่อนเสมอ (ได้เวอร์ชันล่าสุดทุกครั้ง) ถ้าออฟไลน์จึงใช้สำเนาที่เก็บไว้
   ข้อมูลจาก Supabase: ไม่เก็บสำเนาเลย */
const CACHE = 'cbc-slide-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;
  if (req.mode === 'navigate' || url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  // ฟอนต์และตัวสแกนบาร์โค้ดจาก CDN: ใช้สำเนาถ้ามี
  if (/fonts\.(googleapis|gstatic)\.com|unpkg\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
  }
});
// แจ้งเตือนเด้งจากเซิร์ฟเวอร์ (ออร์เดอร์ใหม่ / สไลด์พร้อมรับ / หาไม่เจอ)
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'ตาม Slide CBC', {
    body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag, icon: 'icon-192.png', badge: 'icon-192.png',
    vibrate: [200, 100, 200], data: { url: './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    if (cs.length) { cs[0].postMessage({ type: 'cbc-refresh' }); return cs[0].focus(); }
    return self.clients.openWindow('./');
  }));
});
