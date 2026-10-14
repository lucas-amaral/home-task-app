import { pushApi, type ReminderChild } from '../api/client'

const CHILD_KEY = 'hometask.push.child'

/** Whether this browser can receive push notifications at all. */
export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** iPhones only get push in the app installed on the home screen (iOS 16.4 or later). */
export function isIosOutsideApp(): boolean {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  return ios && !standalone
}

/** The VAPID key as the browser wants it: base64url text to bytes. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const text = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(text.length))
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i)
  return bytes
}

const toBase64Url = (buffer: ArrayBuffer | null): string =>
  buffer ? btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : ''

/** Which child this device gets reminders for, if any. */
export function savedChild(): ReminderChild | null {
  try {
    const value = localStorage.getItem(CHILD_KEY)
    return value === 'CHILD1' || value === 'CHILD2' ? value : null
  } catch {
    return null
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/**
 * Asks for permission, subscribes this device and tells the backend whose reminders it gets.
 * Throws with a message in Portuguese when it cannot.
 */
export async function enablePush(child: ReminderChild): Promise<PushSubscription> {
  const { publicKey, enabled } = await pushApi.publicKey()
  if (!enabled || !publicKey) throw new Error('As notificações ainda não foram configuradas no servidor.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permita as notificações para este site nas configurações do celular.')
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }))
  await pushApi.subscribe(
    { endpoint: subscription.endpoint, p256dh: toBase64Url(subscription.getKey('p256dh')), auth: toBase64Url(subscription.getKey('auth')) },
    child,
  )
  try {
    localStorage.setItem(CHILD_KEY, child)
  } catch {
    // Without storage the device still gets the reminders; only the screen forgets the choice.
  }
  return subscription
}

/** Stops the reminders on this device, here and on the backend. */
export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription()
  if (subscription) {
    await pushApi.unsubscribe(subscription.endpoint)
    await subscription.unsubscribe()
  }
  try {
    localStorage.removeItem(CHILD_KEY)
  } catch {
    // Nothing to forget.
  }
}
