import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskCard } from '../components/TaskCard'
import type { Assignment } from '../types'

const base: Assignment = {
  id: 1, taskId: 10, taskName: 'Vacuum',
  taskDescription: 'Vacuum the living room',
  taskType: 'DAILY', taskFrequency: 'DAILY',
  assignedTo: 'CHILD1', periodDate: '2024-01-15',
  completed: false, completedAt: null,
  bonusEarned: false, penaltyApplied: false, points: 1,
  deadlineDate: null,
}

const props = {
  assignment: base,
  child1Name: 'Alice',
  child2Name: 'Bob',
  onAssign: vi.fn(),
  onToggleComplete: vi.fn(),
  onPenalty: vi.fn(),
  onDelete: vi.fn(),
}

describe('TaskCard', () => {
  it('renders task name', () => {
    render(<TaskCard {...props} />)
    expect(screen.getByText('Vacuum')).toBeInTheDocument()
  })

  it('shows bonus prompt when done button clicked and not yet complete', () => {
    render(<TaskCard {...props} />)
    fireEvent.click(screen.getByTestId('done-btn'))
    expect(screen.getByText(/Feito sem ser lembrado/i)).toBeInTheDocument()
  })

  it('calls onToggleComplete with bonusEarned=true when Yes clicked', () => {
    const onToggle = vi.fn()
    render(<TaskCard {...props} onToggleComplete={onToggle} />)
    fireEvent.click(screen.getByTestId('done-btn'))
    fireEvent.click(screen.getByText(/Sim/i))
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('calls onToggleComplete with bonusEarned=false when No clicked', () => {
    const onToggle = vi.fn()
    render(<TaskCard {...props} onToggleComplete={onToggle} />)
    fireEvent.click(screen.getByTestId('done-btn'))
    fireEvent.click(screen.getByText(/Não/i))
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('shows completedAt timestamp when completed', () => {
    const completed = { ...base, completed: true, completedAt: '2024-01-15T14:30:00' }
    render(<TaskCard {...props} assignment={completed} />)
    expect(screen.getByText(/14:30/)).toBeInTheDocument()
  })

  it('renders BOTH avatars for JOINT task and shows together label', () => {
    const joint = { ...base, assignedTo: 'BOTH' as const, taskType: 'JOINT' as const }
    render(<TaskCard {...props} assignment={joint} />)
    expect(screen.getByText('juntos')).toBeInTheDocument()
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('BO')).toBeInTheDocument()
  })

  it('calls onToggleComplete directly when already completed', () => {
    const onToggle = vi.fn()
    const completed = { ...base, completed: true, completedAt: '2024-01-15T10:00:00' }
    render(<TaskCard {...props} assignment={completed} onToggleComplete={onToggle} />)
    fireEvent.click(screen.getByTestId('done-btn'))
    expect(onToggle).toHaveBeenCalledWith()
  })
})
