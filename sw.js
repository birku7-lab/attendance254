const CACHE_NAME = 'edugate-v1';
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
    './js/auth.js',
    './js/config.js',
    './js/dashboard.js',
    './js/records.js',
    './js/scanner.js',
    './js/settings.js',
    './js/staff.js',
    './js/students.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching offline assets');
            return cache.addAll(ASSETS_TO_CACHE);
        }).catch(err => console.log('SW cache error', err))
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
