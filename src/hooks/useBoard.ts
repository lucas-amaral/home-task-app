import { useState, useEffect, useCallback } from 'react'
import { boardApi } from '../api/client'
import type { BoardDto, Assignee } from '../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function useBoard() {
  const [board, setBoard] = useState<BoardDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [date] = useState(todayStr)

  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await boardApi.getBoard(date)
      setBoard(data)
    } catch {
      setError('Could not load the board. Check backend connection.')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  const assign = useCallback(async (
    assignmentId: number,
    taskId: number,
    assignedTo: Assignee,
    periodDate: string,
    isDaily: boolean
  ) => {
    try {
      const updated = await boardApi.assign(
        taskId,
        assignedTo,
        isDaily ? periodDate : undefined,
        isDaily ? undefined : periodDate
      )
      setBoard(prev => prev ? {
        ...prev,
        assignments: prev.assignments.map(a => a.id === assignmentId ? updated : a)
      } : prev)
    } catch (e) {
      console.error('assign error', e)
    }
  }, [])

  const toggleComplete = useCallback(async (id: number, bonusEarned = false) => {
    if (!board) return
    const existing = board.assignments.find(a => a.id === id)
    if (!existing) return
    try {
      const updated = existing.completed
        ? await boardApi.uncomplete(id)
        : await boardApi.complete(id, bonusEarned)

      const pts = existing.points + (bonusEarned && !existing.completed ? 1 : 0)
      const sign = existing.completed ? -1 : 1
      const targets = existing.assignedTo === 'BOTH'
        ? ['CHILD1', 'CHILD2']
        : existing.assignedTo === 'UNASSIGNED' ? [] : [existing.assignedTo]

      setBoard(prev => {
        if (!prev) return prev
        const newPts = { ...prev.weekPoints }
        targets.forEach(p => { newPts[p] = Math.max(0, (newPts[p] ?? 0) + sign * pts) })
        return {
          ...prev,
          weekPoints: newPts,
          assignments: prev.assignments.map(a => a.id === id ? updated : a),
        }
      })
    } catch (e) {
      console.error('toggleComplete error', e)
    }
  }, [board])

  const applyPenalty = useCallback(async (id: number) => {
    if (!board) return
    const existing = board.assignments.find(a => a.id === id)
    if (!existing) return
    try {
      const updated = await boardApi.penalty(id)
      const targets = existing.assignedTo === 'BOTH'
        ? ['CHILD1', 'CHILD2']
        : existing.assignedTo === 'UNASSIGNED' ? [] : [existing.assignedTo]
      setBoard(prev => {
        if (!prev) return prev
        const newPts = { ...prev.weekPoints }
        targets.forEach(p => { newPts[p] = Math.max(0, (newPts[p] ?? 0) - 1) })
        return {
          ...prev,
          weekPoints: newPts,
          assignments: prev.assignments.map(a => a.id === id ? updated : a),
        }
      })
    } catch (e) {
      console.error('penalty error', e)
    }
  }, [board])

  const deleteAssignment = useCallback(async (id: number) => {
    if (!board) return
    const existing = board.assignments.find(a => a.id === id)
    if (!existing) return
    try {
      await boardApi.deleteAssignment(id)

      // Reverse points locally if it was completed
      const targets = existing.assignedTo === 'BOTH'
        ? ['CHILD1', 'CHILD2']
        : existing.assignedTo === 'UNASSIGNED' ? [] : [existing.assignedTo]

      setBoard(prev => {
        if (!prev) return prev
        const newPts = { ...prev.weekPoints }
        if (existing.completed) {
          const pts = existing.points + (existing.bonusEarned ? 1 : 0)
          targets.forEach(p => { newPts[p] = Math.max(0, (newPts[p] ?? 0) - pts) })
        }
        return {
          ...prev,
          weekPoints: newPts,
          assignments: prev.assignments.filter(a => a.id !== id),
        }
      })
    } catch (e) {
      console.error('deleteAssignment error', e)
    }
  }, [board])

  /** Creates a one-off task (DAILY, active=true) and immediately assigns it to today */
  const addOneOff = useCallback(async (assignedTo: Assignee, name: string, points: number) => {
    if (!board) return
    try {
      const task = await boardApi.createTask({
        name,
        type: 'DAILY',
        frequency: 'DAILY',
        defaultAssignee: assignedTo,
        points,
      })
      const assignment = await boardApi.assign(task.id, assignedTo, date)
      setBoard(prev => prev ? {
        ...prev,
        assignments: [...prev.assignments, assignment],
      } : prev)
    } catch (e) {
      console.error('addOneOff error', e)
    }
  }, [board, date])

  const weekLabel = board
    ? format(new Date(board.weekStart + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })
    : ''

  const todayLabel = board
    ? format(new Date(board.date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })
    : ''

  return {
    board, loading, error,
    assign, toggleComplete, applyPenalty, deleteAssignment, addOneOff,
    weekLabel, todayLabel,
    refetch: fetchBoard,
  }
}
