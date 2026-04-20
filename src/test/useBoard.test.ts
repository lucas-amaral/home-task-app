import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useBoard } from '../hooks/useBoard'
import { boardApi } from '../api/client'

vi.mock('../api/client', () => ({
  boardApi: {
    getBoard: vi.fn(),
    assign: vi.fn(),
    complete: vi.fn(),
    uncomplete: vi.fn(),
    penalty: vi.fn(),
  },
}))

const mockBoard = {
  date: '2024-01-15',
  weekStart: '2024-01-15',
  child1Name: 'Alice',
  child2Name: 'Bob',
  assignments: [
    {
      id: 1, taskId: 10, taskName: 'Vacuum',
      taskType: 'DAILY', taskFrequency: 'DAILY',
      assignedTo: 'CHILD1', periodDate: '2024-01-15',
      completed: false, completedAt: null,
      bonusEarned: false, penaltyApplied: false, points: 1,
    },
    {
      id: 2, taskId: 20, taskName: 'Clean bathroom',
      taskType: 'JOINT', taskFrequency: 'DAILY',
      assignedTo: 'BOTH', periodDate: '2024-01-15',
      completed: false, completedAt: null,
      bonusEarned: false, penaltyApplied: false, points: 1,
    },
  ],
  weekPoints: { CHILD1: 3, CHILD2: 1 },
}

describe('useBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(boardApi.getBoard).mockResolvedValue(mockBoard as any)
  })

  it('fetches board on mount', async () => {
    const { result } = renderHook(() => useBoard())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.board?.child1Name).toBe('Alice')
    expect(result.current.board?.assignments).toHaveLength(2)
  })

  it('sets error when API fails', async () => {
    vi.mocked(boardApi.getBoard).mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useBoard())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
  })

  it('toggleComplete adds points optimistically for CHILD1', async () => {
    const completed = { ...mockBoard.assignments[0], completed: true, completedAt: '2024-01-15T10:00:00' }
    vi.mocked(boardApi.complete).mockResolvedValue(completed as any)

    const { result } = renderHook(() => useBoard())
    await waitFor(() => expect(result.current.board).not.toBeNull())

    await act(async () => { await result.current.toggleComplete(1) })

    expect(result.current.board?.weekPoints['CHILD1']).toBe(4)
  })

  it('toggleComplete awards points to BOTH children for joint task', async () => {
    const completed = { ...mockBoard.assignments[1], completed: true, completedAt: '2024-01-15T10:00:00' }
    vi.mocked(boardApi.complete).mockResolvedValue(completed as any)

    const { result } = renderHook(() => useBoard())
    await waitFor(() => expect(result.current.board).not.toBeNull())

    await act(async () => { await result.current.toggleComplete(2) })

    expect(result.current.board?.weekPoints['CHILD1']).toBe(4)
    expect(result.current.board?.weekPoints['CHILD2']).toBe(2)
  })

  it('applyPenalty deducts 1 from correct child', async () => {
    const penalised = { ...mockBoard.assignments[0], penaltyApplied: true }
    vi.mocked(boardApi.penalty).mockResolvedValue(penalised as any)

    const { result } = renderHook(() => useBoard())
    await waitFor(() => expect(result.current.board).not.toBeNull())

    await act(async () => { await result.current.applyPenalty(1) })

    expect(result.current.board?.weekPoints['CHILD1']).toBe(2)
  })

  it('weekLabel is derived from backend weekStart, not client date', async () => {
    const { result } = renderHook(() => useBoard())
    await waitFor(() => expect(result.current.weekLabel).toBeTruthy())
    // weekStart = '2024-01-15' → "15 de janeiro"
    expect(result.current.weekLabel).toContain('15')
  })
})
