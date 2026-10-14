import axios from 'axios'
import { installWakingRetry } from './waking'
import type {
  BoardDto, Task, Assignment, Reward, PointLedgerDto,
  FamilyConfig, CreateTaskRequest, UpdateTaskRequest, Assignee, WeekSummaryDto
} from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Add request/response logging for debugging
api.interceptors.request.use((config) => {
  console.log(`📤 Request: ${config.method?.toUpperCase()} ${config.url}`)
  return config
})

api.interceptors.response.use(
  (response) => {
    console.log(`📥 Response from ${response.config.url}:`, response.status, response.data)
    return response
  },
  (error) => {
    console.error(`❌ API Error on ${error.config?.url}:`, error.message, error.response?.data)
    return Promise.reject(error)
  }
)

// Waits for the backend while Render wakes it up, instead of failing the first call of the day.
installWakingRetry(api)

export const boardApi = {
  // ...existing code...
  // Board
  getBoard: (date?: string): Promise<BoardDto> =>
    api.get('/board', { params: date ? { date } : {} }).then(r => r.data),

  // Tasks
  listTasks: (): Promise<Task[]> =>
    api.get('/tasks').then(r => r.data),

  createTask: (req: CreateTaskRequest): Promise<Task> =>
    api.post('/tasks', req).then(r => r.data),

  updateTask: (id: number, req: UpdateTaskRequest): Promise<Task> =>
    api.put(`/tasks/${id}`, req).then(r => r.data),

  deleteTask: (id: number): Promise<void> =>
    api.delete(`/tasks/${id}`).then(() => undefined),

  // Family config
  getConfig: (): Promise<FamilyConfig> =>
    api.get('/config').then(r => r.data),

  updateConfig: (child1Name: string, child2Name: string): Promise<FamilyConfig> =>
    api.put('/config', { child1Name, child2Name }).then(r => r.data),

  // Assignments
  assign: (taskId: number, assignedTo: Assignee, date?: string, weekStart?: string): Promise<Assignment> =>
    api.post('/assignments/assign', { taskId, assignedTo, date, weekStart }).then(r => r.data),

  complete: (id: number, bonusEarned = false): Promise<Assignment> =>
    api.post(`/assignments/${id}/complete`, { bonusEarned }).then(r => r.data),

  uncomplete: (id: number): Promise<Assignment> =>
    api.post(`/assignments/${id}/uncomplete`).then(r => r.data),

  penalty: (id: number): Promise<Assignment> =>
    api.post(`/assignments/${id}/penalty`).then(r => r.data),

  unpenalty: (id: number): Promise<Assignment> =>
    api.post(`/assignments/${id}/unpenalty`).then(r => r.data),

  deleteAssignment: (id: number): Promise<void> =>
    api.delete(`/assignments/${id}`).then(() => undefined),

  // History
  pointsHistory: (): Promise<PointLedgerDto[]> =>
    api.get('/points/history').then(r => r.data),

  getWeeklyStatus: (weekStart?: string) =>
    api.get('/points/status', { params: weekStart ? { weekStart } : {} }).then(r => r.data),

  getWeekSummary: (weekStart: string): Promise<WeekSummaryDto> =>
    api.get(`/weeks/${weekStart}`).then(r => r.data),

  // Rewards
  listRewards: (): Promise<Reward[]> =>
    api.get('/rewards').then(r => r.data),
}

export type ReminderChild = 'CHILD1' | 'CHILD2'

/** Reminders on the children's phones (Web Push). */
export const pushApi = {
  /** The VAPID public key, and whether the backend is set up to send pushes at all. */
  publicKey: (): Promise<{ publicKey: string; enabled: boolean }> =>
    api.get('/push/public-key').then(r => r.data),

  subscribe: (subscription: { endpoint: string; p256dh: string; auth: string }, assignee: ReminderChild): Promise<void> =>
    api.post('/push/subscriptions', { ...subscription, assignee }).then(() => undefined),

  unsubscribe: (endpoint: string): Promise<void> =>
    api.delete('/push/subscriptions', { data: { endpoint } }).then(() => undefined),

  test: (endpoint: string): Promise<{ result: 'SENT' | 'GONE' | 'FAILED' }> =>
    api.post('/push/test', { endpoint }).then(r => r.data),
}

