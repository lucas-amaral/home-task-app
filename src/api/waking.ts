import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

// The backend sleeps on Render's free plan when idle and takes a while to wake up: until then a request fails
// without reaching it (or Render answers with one of these). The call is retried meanwhile, and the
// "starting" notice (WakingNotice) is shown so the app doesn't look frozen.
const WAKING_STATUSES = new Set([502, 503, 504])
export const RETRY_INTERVAL_MS = 5_000
export const RETRY_LIMIT_MS = 5 * 60_000
/** A call pending this long shows the notice even before its first retry. */
export const SLOW_NOTICE_MS = 5_000

let waitingCalls = 0
const listeners = new Set<() => void>()

/** Whether some call is waiting for the backend to wake up (for `useSyncExternalStore`). */
export const wakingStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot: () => waitingCalls > 0,
}

function addWaitingCall(delta: number) {
  waitingCalls += delta
  listeners.forEach((listener) => listener())
}

/** True once the backend answered anything since the page loaded. */
let serverAnswered = false

/** Back to the state of a freshly loaded page; for the tests. */
export function resetWakingState() {
  serverAnswered = false
}

interface WakingState {
  startedAt: number
  noticed: boolean
  slowTimer?: ReturnType<typeof setTimeout>
}

type WakingConfig = InternalAxiosRequestConfig & { waking?: WakingState }

function notice(state: WakingState) {
  if (state.noticed) return
  state.noticed = true
  addWaitingCall(1)
}

function finish(state: WakingState | undefined) {
  if (!state) return
  clearTimeout(state.slowTimer)
  if (state.noticed) {
    state.noticed = false
    addWaitingCall(-1)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Makes every call of [api] wait for a sleeping backend instead of failing at once. */
export function installWakingRetry(api: AxiosInstance) {
  api.interceptors.request.use((config: WakingConfig) => {
    // A retry goes through here again and keeps the state of the first try.
    if (!config.waking) {
      const state: WakingState = { startedAt: Date.now(), noticed: false }
      state.slowTimer = setTimeout(() => notice(state), SLOW_NOTICE_MS)
      config.waking = state
    }
    return config
  })

  api.interceptors.response.use(
    (response) => {
      serverAnswered = true
      finish((response.config as WakingConfig).waking)
      return response
    },
    async (error: AxiosError) => {
      const config = error.config as WakingConfig | undefined
      const state = config?.waking
      if (!config || !state || axios.isCancel(error)) {
        finish(state)
        throw error
      }
      const status = error.response?.status
      if (status !== undefined && !WAKING_STATUSES.has(status)) {
        // A real answer from the backend (404, 400...): it is awake.
        serverAnswered = true
        finish(state)
        throw error
      }
      // A write is only repeated while the backend hasn't answered anything yet (it is asleep, so nothing got
      // there). Later on, a write that failed may have been applied, and sending it again could duplicate it.
      const retriable = config.method === 'get' || !serverAnswered
      if (!retriable || Date.now() - state.startedAt + RETRY_INTERVAL_MS > RETRY_LIMIT_MS) {
        finish(state)
        throw error
      }
      notice(state)
      await sleep(RETRY_INTERVAL_MS)
      return api.request(config)
    },
  )
}
