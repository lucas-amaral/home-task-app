export type TaskType = 'DAILY' | 'WEEKLY' | 'JOINT' | 'RULE'
export type TaskFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
export type Assignee = 'CHILD1' | 'CHILD2' | 'BOTH' | 'UNASSIGNED'

export interface Task {
  id: number
  name: string
  description: string
  type: TaskType
  frequency: TaskFrequency
  defaultAssignee: Assignee
  points: number
  timeWindow: string
  deadline: string
  deadlineDate: string | null   // ISO datetime "yyyy-MM-ddTHH:mm"
  active: boolean
  sortOrder: number
}

export interface Assignment {
  id: number
  taskId: number
  taskName: string
  taskDescription?: string
  taskType: TaskType
  taskFrequency: TaskFrequency
  assignedTo: Assignee
  periodDate: string        // ISO date string — exact day for daily, Monday for weekly
  completed: boolean
  completedAt: string | null
  bonusEarned: boolean
  penaltyApplied: boolean
  points: number
  deadlineDate: string | null   // ISO datetime "yyyy-MM-ddTHH:mm"
}

export interface BoardDto {
  date: string
  weekStart: string
  child1Name: string
  child2Name: string
  assignments: Assignment[]
  weekPoints: Record<string, number>   // "CHILD1" -> 12
}

export interface WeekSummaryDto {
  weekStart: string
  child1Name: string
  child2Name: string
  assignments: Assignment[]
  points: Record<string, number>
}

export interface FamilyConfig {
  child1Name: string
  child2Name: string
  /**
   * WhatsApp via Callmebot — formato "5554999990000:APIKEY"
   * Deixar vazio para desativar notificações.
   */
  child1Phone: string
  child2Phone: string
}

export interface Reward {
  id: number
  name: string
  pointsCost: number
  emoji: string
}

export interface PointLedgerDto {
  assignee: Assignee
  weekStart: string
  total: number
}

export interface CreateTaskRequest {
  name: string
  description?: string
  type: TaskType
  frequency: TaskFrequency
  defaultAssignee?: Assignee
  points?: number
  timeWindow?: string
  deadline?: string
  deadlineDate?: string | null   // ISO datetime "yyyy-MM-ddTHH:mm"
}
