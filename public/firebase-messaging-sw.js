/* global importScripts, firebase, clients, self */

importScripts('https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging-compat.js')

function readFirebaseConfig() {
  const url = new URL(self.location.href)
  const query = url.searchParams

  const apiKey = query.get('apiKey') || ''
  const projectId = query.get('projectId') || ''
  const messagingSenderId = query.get('messagingSenderId') || ''
  const appId = query.get('appId') || ''

  if (!apiKey || !projectId || !messagingSenderId || !appId) {
    return null
  }

  return {
    apiKey: apiKey,
    projectId: projectId,
    messagingSenderId: messagingSenderId,
    appId: appId,
    authDomain: query.get('authDomain') || undefined,
    storageBucket: query.get('storageBucket') || undefined,
    measurementId: query.get('measurementId') || undefined,
  }
}

const firebaseConfig = readFirebaseConfig()

if (firebaseConfig) {
  firebase.initializeApp(firebaseConfig)

  const messaging = firebase.messaging()

  messaging.onBackgroundMessage(function (payload) {
    const title = (payload.notification && payload.notification.title) || 'Notification'
    const body = (payload.notification && payload.notification.body) || 'You have a new update.'

    let actionValue = '/dashboard'
    if (payload.data && payload.data.actionValue) {
      actionValue = payload.data.actionValue
    }

    // Browsers can't play a custom sound on a system notification, so an open tab plays it
    // (src/utils/notificationSound.ts); with no tab open the system's default sound plays.
    return Promise.all([
      self.registration.showNotification(title, {
        body: body,
        icon: '/R_Logo.svg',
        badge: '/favicon-32x32.png',
        silent: false,
        data: {
          actionValue: actionValue,
        },
        tag: payload.data && payload.data.notificationId ? payload.data.notificationId : undefined,
      }),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
        clientList.forEach(function (client) {
          client.postMessage({ type: 'RELY_PLAY_NOTIFICATION_SOUND' })
        })
      }),
    ])
  })
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  let actionPath = '/dashboard'
  if (event.notification && event.notification.data && event.notification.data.actionValue) {
    actionPath = event.notification.data.actionValue
  }

  const targetUrl = new URL(actionPath, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i += 1) {
        const client = clientList[i]
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})
