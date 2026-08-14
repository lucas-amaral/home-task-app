import { useState, useEffect, useCallback } from 'react'
import { boardApi } from '../api/client'
import type { BoardDto, Assignee } from '../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Punitive model: completing a task on time earns no points, so we no longer
 * try to hand-maintain optimistic point/occurrence math on the client (that
 * used to track +points/-points locally). Instead we optimistically patch the
 * touched assignment for a snappy UI, then re-fetch the board in the
 * background so weekPoints and weeklyStatus (occurrence counts + the
 * consequence ladder) always reflect the server's calculation exactly.
 */
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
      setError('Não foi possível carregar o quadro. Verifique a conexão com o servidor.')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  const patchAssignment = useCallback((updated: any) => {
    setBoard(prev => prev ? {
      ...prev,
      // defensive: guard against prev.assignments being undefined
      assignments: (prev.assignments ?? []).map(a => a.id === updated.id ? updated : a),
    } : prev)
  }, [])

  const assign = useCallback(async (
    assignmentId: number,
    taskId: number,
    assignedTo: Assignee,
    periodDate: string,
    isDaily: boolean
  ) => {
    try {
      const updated = await boardApi.assign(
        taskId, assignedTo,
        isDaily ? periodDate : undefined,
        isDaily ? undefined : periodDate
      )
      patchAssignment(updated)
      fetchBoard()
    } catch (e) { console.error('assign error', e) }
  }, [patchAssignment, fetchBoard])

  const toggleComplete = useCallback(async (id: number) => {
    if (!board) return
    const existing = board.assignments.find(a => a.id === id)
    if (!existing) return
    try {
      const updated = existing.completed
        ? await boardApi.uncomplete(id)
        : await boardApi.complete(id)
      patchAssignment(updated)
      fetchBoard()
    } catch (e) { console.error('toggleComplete error', e) }
  }, [board, patchAssignment, fetchBoard])

  const applyPenalty = useCallback(async (id: number) => {
    if (!board) return
    try {
      const updated = await boardApi.penalty(id)
      patchAssignment(updated)
      fetchBoard()
    } catch (e) { console.error('penalty error', e) }
  }, [board, patchAssignment, fetchBoard])

  /**
   * Feature 1 — Delete an assignment from the board.
   * A recorded penalty (occurrence) is reversed server-side; we optimistically
   * remove it from local state and refresh the week totals.
   */
  const deleteAssignment = useCallback(async (id: number) => {
    if (!board) return
    try {
      await boardApi.deleteAssignment(id)
      setBoard(prev => prev ? {
        ...prev,
        // defensive: guard against prev.assignments being undefined
        assignments: (prev.assignments ?? []).filter(a => a.id !== id),
      } : prev)
      fetchBoard()
    } catch (e) { console.error('deleteAssignment error', e) }
  }, [board, fetchBoard])

  /**
   * Feature 2 — Create a one-off task for today only.
   * The task is flagged oneOff=true so BoardService never recreates it.
   * Points are always 0 in the punitive model (no positive scoring).
   */
  const addOneOff = useCallback(async (assignedTo: Assignee, name: string) => {
    if (!board) return
    try {
      const task = await boardApi.createTask({
        name,
        type: 'DAILY',
        frequency: 'DAILY',
        defaultAssignee: assignedTo,
        points: 0,
        oneOff: true,   // ← prevents recreation on subsequent days
      })
      const assignment = await boardApi.assign(task.id, assignedTo, date)
      setBoard(prev => prev ? {
        ...prev,
        // defensive: guard against prev.assignments being undefined
        assignments: [...(prev.assignments ?? []), assignment],
      } : prev)
    } catch (e) { console.error('addOneOff error', e) }
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
