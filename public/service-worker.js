const CACHE_NAME = 'flashcard-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 安裝 Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: 安裝中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: 快取檔案');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: 快取失敗', error);
      })
  );
});

// 啟用 Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: 啟用中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 刪除舊快取', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 攔截請求
self.addEventListener('fetch', (event) => {
  // 跳過 chrome-extension 和非 http(s) 請求
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果快取中有，直接返回
        if (response) {
          return response;
        }

        // 否則從網路獲取
        return fetch(event.request).then((response) => {
          // 檢查是否是有效的回應
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // 複製回應並存入快取
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // 如果離線且沒有快取，返回離線頁面
        return caches.match('/index.html');
      })
  );
});
