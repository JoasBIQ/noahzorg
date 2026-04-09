// Custom service worker — wordt door next-pwa samengevoegd met de workbox SW

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: "Noah's Zorg", body: event.data.text(), url: '/' }
  }

  const options = {
    body: data.body ?? '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag ?? 'noahs-zorg',
    renotify: true,
    data: { url: data.url ?? '/' },
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Noah's Zorg", options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Als de app al open is, focus dan dat venster
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        // Anders open een nieuw venster
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})
