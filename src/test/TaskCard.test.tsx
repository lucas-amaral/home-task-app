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
  bonusEarned: false, penaltyApplied: false, points: 0,
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

  it('calls onToggleComplete directly when task has no checklist steps', () => {
    const onToggle = vi.fn()
    render(<TaskCard {...props} onToggleComplete={onToggle} />)
    fireEvent.click(screen.getByTestId('done-btn'))
    expect(onToggle).toHaveBeenCalledWith()
  })

  it('requires all checklist steps to be checked before completing', () => {
    const onToggle = vi.fn()
    const withSteps: Assignment = { ...base, taskDescription: '- Step one\n- Step two' }
    render(<TaskCard {...props} assignment={withSteps} onToggleComplete={onToggle} />)

    // First click opens the checklist instead of completing right away
    fireEvent.click(screen.getByTestId('done-btn'))
    expect(onToggle).not.toHaveBeenCalled()
    expect(screen.getByText('Step one')).toBeInTheDocument()

    // "Confirmar concluído" stays disabled until every step is checked
    const confirmBtn = screen.getByText('Confirmar concluído')
    expect(confirmBtn).toBeDisabled()

    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(cb => fireEvent.click(cb))

    expect(screen.getByText('Confirmar concluído')).not.toBeDisabled()
    fireEvent.click(screen.getByText('Confirmar concluído'))
    expect(onToggle).toHaveBeenCalledWith()
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

  it('shows an "ocorrência" badge when a penalty has been applied', () => {
    const penalized = { ...base, penaltyApplied: true }
    render(<TaskCard {...props} assignment={penalized} />)
    expect(screen.getByText('ocorrência')).toBeInTheDocument()
  })
})
