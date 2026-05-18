const CACHE = 'finance-ai-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// ── Cache strategy ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE).then((cache) => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// ── Web Push events (requires VAPID + server; supported as scaffold) ──────
self.addEventListener('push', (event) => {
    if (!event.data) return;
    let payload;
    try {
        payload = event.data.json();
    } catch {
        payload = { title: 'Finance AI', body: event.data.text() };
    }
    event.waitUntil(
        self.registration.showNotification(payload.title || 'Finance AI', {
            body: payload.body || '',
            icon: '/icons/icon.svg',
            badge: '/icons/icon.svg',
            tag: payload.tag || 'push',
            renotify: payload.renotify || false,
            data: payload.data || {},
        })
    );
});

// ── Notification clicks → focus app and request navigation ────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const data = event.notification.data || {};

    event.waitUntil((async () => {
        const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        // Focus an existing finance.html window if open
        for (const client of all) {
            if (client.url.includes('/finance.html')) {
                await client.focus();
                client.postMessage({ type: 'navigate', ...data });
                return;
            }
        }
        // Otherwise open a new one
        await self.clients.openWindow('/finance.html');
    })());
});

// ── Periodic Background Sync (Chrome Android, installed PWA only) ─────────
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'finance-check') {
        event.waitUntil(runBackgroundCheck());
    }
});

async function runBackgroundCheck() {
    // The service worker has no access to the in-page TransactionStore, so it
    // notifies any open client which performs the check; if none are open it
    // shows a generic daily nudge.
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clientsList.length > 0) {
        clientsList[0].postMessage({ type: 'periodic-check' });
        return;
    }
    await self.registration.showNotification('💰 Finance AI', {
        body: 'Abre a app para veres a tua análise diária e o mercado.',
        icon: '/icons/icon.svg',
        badge: '/icons/icon.svg',
        tag: 'periodic-nudge',
        data: { tab: 'dashboard' },
    });
}
