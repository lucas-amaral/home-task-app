import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { RETRY_INTERVAL_MS, RETRY_LIMIT_MS, SLOW_NOTICE_MS, installWakingRetry, resetWakingState, wakingStore } from '../api/waking'

type Outcome = 'down' | 'asleep' | 'ok' | 'not-found' | 'pending'

/** An axios instance whose "network" answers each call with the next outcome of the list (the last one repeats). */
function apiAnswering(...outcomes: Outcome[]) {
  const calls: string[] = []
  let release: () => void = () => undefined
  const adapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
    calls.push(`${config.method} ${config.url}`)
    const outcome = outcomes.length > 1 ? outcomes.shift()! : outcomes[0]
    const response = (status: number): AxiosResponse => ({ data: { ok: status === 200 }, status, statusText: '', headers: {}, config })
    switch (outcome) {
      case 'down':
        return Promise.reject(new axios.AxiosError('Network Error', 'ERR_NETWORK', config))
      case 'asleep':
        return Promise.reject(new axios.AxiosError('Service Unavailable', 'ERR_BAD_RESPONSE', config, undefined, response(503)))
      case 'not-found':
        return Promise.reject(new axios.AxiosError('Not Found', 'ERR_BAD_REQUEST', config, undefined, response(404)))
      case 'pending':
        return new Promise((resolve) => (release = () => resolve(response(200))))
      default:
        return Promise.resolve(response(200))
    }
  }
  const api = axios.create({ adapter })
  installWakingRetry(api)
  return { api, calls, release: () => release() }
}

describe('waiting for a sleeping backend', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => {
    vi.useRealTimers()
    resetWakingState()
  })

  it('retries until the backend answers, showing the notice meanwhile', async () => {
    const { api, calls } = apiAnswering('down', 'asleep', 'ok')

    const result = api.get('/board')
    await vi.advanceTimersByTimeAsync(0)
    expect(wakingStore.getSnapshot()).toBe(true)

    await vi.advanceTimersByTimeAsync(2 * RETRY_INTERVAL_MS)
    expect((await result).data).toEqual({ ok: true })
    expect(calls).toHaveLength(3)
    expect(wakingStore.getSnapshot()).toBe(false)
  })

  it('gives up after the time limit', async () => {
    const { api } = apiAnswering('down')

    const result = api.get('/board').catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(RETRY_LIMIT_MS)

    expect(axios.isAxiosError(await result)).toBe(true)
    expect(wakingStore.getSnapshot()).toBe(false)
  })

  it('also retries a write while the backend has not answered anything yet', async () => {
    const { api, calls } = apiAnswering('down', 'ok')

    const result = api.post('/assignments/1/complete', {})
    await vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS)

    expect((await result).status).toBe(200)
    expect(calls).toHaveLength(2)
  })

  it('does not repeat a write once the backend has answered, so nothing is done twice', async () => {
    const { api, calls } = apiAnswering('ok', 'down')
    await api.get('/board')

    await expect(api.post('/assignments/1/complete', {})).rejects.toThrow('Network Error')
    expect(calls).toHaveLength(2)
  })

  it('passes a real error from the backend on at once', async () => {
    const { api, calls } = apiAnswering('not-found')

    await expect(api.get('/tasks/9')).rejects.toThrow('Not Found')
    expect(calls).toHaveLength(1)
    expect(wakingStore.getSnapshot()).toBe(false)
  })

  it('shows the notice for a call that is merely slow, and hides it when it ends', async () => {
    const { api, release } = apiAnswering('pending')

    const result = api.get('/board')
    await vi.advanceTimersByTimeAsync(SLOW_NOTICE_MS - 1)
    expect(wakingStore.getSnapshot()).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(wakingStore.getSnapshot()).toBe(true)

    release()
    await result
    expect(wakingStore.getSnapshot()).toBe(false)
  })
})
