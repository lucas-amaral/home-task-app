import { useSyncExternalStore } from 'react'
import { wakingStore } from '../api/waking'

/** Shown over any screen while a call waits for the backend to wake up (the call retries by itself). */
export function WakingNotice() {
  const waking = useSyncExternalStore(wakingStore.subscribe, wakingStore.getSnapshot)
  if (!waking) return null
  return (
    <div className="waking-notice" role="status">
      <span className="waking-spinner" aria-hidden="true" />
      Iniciando o sistema, isso pode levar alguns instantes…
    </div>
  )
}
