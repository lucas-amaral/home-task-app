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
  active: boolean
  sortOrder: number
  oneOff: boolean
}

export interface Assignment {
  id: number
  taskId: number
  taskName: string
  taskDescription?: string
  taskType: TaskType
  taskFrequency: TaskFrequency
  assignedTo: Assignee
  periodDate: string
  completed: boolean
  completedAt: string | null
  bonusEarned: boolean
  penaltyApplied: boolean
  points: number
}

export interface BoardDto {
  date: string
  weekStart: string
  child1Name: string
  child2Name: string
  assignments: Assignment[]
  weekPoints: Record<string, number>
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
  oneOff?: boolean
}
