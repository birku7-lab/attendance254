const CACHE_NAME = 'edugate-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './login.html',
    './scanner.html',
    './records.html',
    './students.html',
    './add_student.html',
    './reports.html',
    './settings.html',
    './staff.html',
    './css/style.css',
    './js/app.js',
    './js/config.js',
    './js/dashboard.js',
    './js/records.js',
    './js/scanner.js',
    './js/settings.js',
    './js/staff.js',
    './js/students.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            console.log('Caching offline assets sequentially to prevent failure');
            for (const asset of ASSETS_TO_CACHE) {
                try {
                    await cache.add(asset);
                } catch(e) {
                    console.log('Failed to cache asset:', asset);
                }
            }
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
});

self.addEventListener('fetch', event => {
    // Skip non-GET requests or API requests
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return;
    }

    // Network-first strategy for HTML/JS/CSS to ensure latest updates
    event.respondWith(
        fetch(event.request).catch(() => {
            // If offline, return from cache
            return caches.match(event.request);
        })
    );
});
