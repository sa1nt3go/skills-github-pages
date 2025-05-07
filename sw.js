self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('skills-github-pages-v1').then((cache) => {
        return cache.addAll([
          '/skills-github-pages/index.html',
          '/skills-github-pages/styles.css',
          '/skills-github-pages/script.js',
          '/skills-github-pages/manifest.json',
          '/skills-github-pages/ico.png'
        ]);
      })
    );
  });
  
  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => response || fetch(event.request))
    );
  });
