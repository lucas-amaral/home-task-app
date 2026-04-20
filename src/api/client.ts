import axios from 'axios'
import type {
  BoardDto, Task, Assignment, Reward, PointLedgerDto,
  FamilyConfig, CreateTaskRequest, Assignee, WeekSummaryDto
} from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const boardApi = {
  // Board
  getBoard: (date?: string): Promise<BoardDto> =>
    api.get('/board', { params: date ? { date } : {} }).then(r => r.data),

  // Tasks
  listTasks: (): Promise<Task[]> =>
    api.get('/tasks').then(r => r.data),

  createTask: (req: CreateTaskRequest): Promise<Task> =>
    api.post('/tasks', req).then(r => r.data),

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

  // History
  pointsHistory: (): Promise<PointLedgerDto[]> =>
    api.get('/points/history').then(r => r.data),

  getWeekSummary: (weekStart: string): Promise<WeekSummaryDto> =>
    api.get(`/weeks/${weekStart}`).then(r => r.data),

  // Rewards
  listRewards: (): Promise<Reward[]> =>
    api.get('/rewards').then(r => r.data),
}
