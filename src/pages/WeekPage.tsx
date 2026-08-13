import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { boardApi } from '../api/client'
import { ConsequencePanel } from '../components/ConsequencePanel'
import type { WeekSummaryDto, Assignment, Assignee } from '../types'

function monday(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 })
}

function fmtWeek(d: Date) {
  return format(monday(d), 'yyyy-MM-dd')
}

export function WeekPage() {
  const [weekDate, setWeekDate]  = useState(() => monday(new Date()))
  const [summary, setSummary]    = useState<WeekSummaryDto | null>(null)
  const [loading, setLoading]    = useState(true)

  const loadSummary = useCallback((date: Date) => {
    setLoading(true)
    boardApi.getWeekSummary(fmtWeek(date))
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadSummary(weekDate) }, [weekDate, loadSummary])

  // ── Actions ─────────────────────────────────────────────────────────────
  // Punitive model: completing a task earns no points, so instead of hand
  // -maintaining optimistic point math here, we patch the touched assignment
  // immediately for a snappy UI and then re-fetch the full week summary so
  // occurrence counts / the consequence ladder always match the server.

  const toggleComplete = useCallback(async (a: Assignment) => {
    try {
      const updated = a.completed
        ? await boardApi.uncomplete(a.id)
        : await boardApi.complete(a.id)
      setSummary(prev => prev ? {
        ...prev,
        assignments: prev.assignments.map(x => x.id === a.id ? updated : x),
      } : prev)
      loadSummary(weekDate)
    } catch (e) { console.error('toggleComplete', e) }
  }, [loadSummary, weekDate])

  /** Change who is responsible for an assignment */
  const reassign = useCallback(async (a: Assignment, to: Assignee) => {
    if (a.completed) return
    try {
      const isDaily = a.taskFrequency === 'DAILY' || a.taskFrequency === 'EVERY_2_DAYS'
      const updated = await boardApi.assign(
        a.taskId, to,
        isDaily ? a.periodDate : undefined,
        isDaily ? undefined : a.periodDate
      )
      setSummary(prev => prev ? {
        ...prev,
        assignments: prev.assignments.map(x => x.id === a.id ? updated : x)
      } : prev)
    } catch (e) { console.error('reassign', e) }
  }, [])

  /** Registrar/remover ocorrência manual (tarefa não feita / incompleta) */
  const togglePenalty = useCallback(async (a: Assignment) => {
    try {
      const updated = a.penaltyApplied
        ? await boardApi.unpenalty(a.id)
        : await boardApi.penalty(a.id)
      setSummary(prev => prev ? {
        ...prev,
        assignments: prev.assignments.map(x => x.id === a.id ? updated : x),
      } : prev)
      loadSummary(weekDate)
    } catch (e) { console.error('togglePenalty', e) }
  }, [loadSummary, weekDate])

  /** Delete an assignment */
  const deleteAssignment = useCallback(async (a: Assignment) => {
    try {
      await boardApi.deleteAssignment(a.id)
      setSummary(prev => prev ? {
        ...prev,
        assignments: prev.assignments.filter(x => x.id !== a.id)
      } : prev)
      loadSummary(weekDate)
    } catch (e) { console.error('deleteAssignment', e) }
  }, [loadSummary, weekDate])

  // ── Labels ───────────────────────────────────────────────────────────────

  const weekLabel    = format(weekDate, "dd 'de' MMMM", { locale: ptBR })
  const weekEndLabel = format(new Date(weekDate.getTime() + 6 * 86400000), "dd 'de' MMMM", { locale: ptBR })
  const isCurrentWeek = fmtWeek(weekDate) === fmtWeek(new Date())

  return (
    <div style={{ maxWidth:800, margin:'0 auto', padding:'22px 14px 80px' }}>
      {/* Header navigation */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button onClick={() => setWeekDate(d => subWeeks(d, 1))} style={{
          width:34, height:34, borderRadius:'50%',
          border:'1px solid var(--border-strong)', fontSize:16, color:'var(--text-secondary)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>‹</button>

        <div style={{ flex:1 }}>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:500 }}>
            Visão geral da semana
          </h1>
          <p style={{ fontSize:13, color:'var(--text-secondary)' }}>
            {weekLabel} – {weekEndLabel}
            {isCurrentWeek && (
              <span style={{
                marginLeft:8, fontSize:11, background:'var(--daily-bg)',
                border:'1px solid var(--daily-border)', color:'var(--daily-text)',
                padding:'1px 8px', borderRadius:10,
              }}>semana atual</span>
            )}
          </p>
        </div>

        <button onClick={() => setWeekDate(d => addWeeks(d, 1))} disabled={isCurrentWeek} style={{
          width:34, height:34, borderRadius:'50%',
          border:'1px solid var(--border-strong)', fontSize:16, color:'var(--text-secondary)',
          display:'flex', alignItems:'center', justifyContent:'center',
          opacity: isCurrentWeek ? 0.3 : 1,
        }}>›</button>
      </div>

      {loading && <p style={{ textAlign:'center', padding:'40px 0', color:'var(--text-hint)' }}>Carregando…</p>}

      {!loading && summary && (
        <>
          <ConsequencePanel
            status={summary.weeklyStatus}
            child1Name={summary.child1Name}
            child2Name={summary.child2Name}
          />

          <WeekGrid
            summary={summary}
            weekStart={weekDate}
            onToggleComplete={toggleComplete}
            onReassign={reassign}
            onTogglePenalty={togglePenalty}
            onDelete={deleteAssignment}
          />
        </>
      )}

      {!loading && !summary && (
        <div style={{ textAlign:'center', padding:'48px 24px', background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)' }}>
          <p style={{ fontSize:28, marginBottom:10 }}>📋</p>
          <p style={{ fontSize:14, color:'var(--text-secondary)' }}>Ainda não há dados para esta semana.</p>
        </div>
      )}
    </div>
  )
}

// ── WeekGrid ──────────────────────────────────────────────────────────────────

interface GridProps {
  summary: WeekSummaryDto
  weekStart: Date
  onToggleComplete: (a: Assignment) => Promise<void>
  onReassign: (a: Assignment, to: Assignee) => Promise<void>
  onTogglePenalty: (a: Assignment) => Promise<void>
  onDelete: (a: Assignment) => Promise<void>
}

function WeekGrid({ summary, weekStart, onToggleComplete, onReassign, onTogglePenalty, onDelete }: GridProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * 86400000)
    return format(d, 'yyyy-MM-dd')
  })

  const dayLabel = (dateStr: string) =>
    format(new Date(dateStr + 'T12:00:00'), "EEEE, dd/MM", { locale: ptBR })

  const isDailyLike = (f: string) => f === 'DAILY' || f === 'EVERY_2_DAYS'

  const weeklyTasks = summary.assignments.filter(a => !isDailyLike(a.taskFrequency))
  const dailyByDay  = (dateStr: string) =>
    summary.assignments.filter(a => isDailyLike(a.taskFrequency) && a.periodDate === dateStr)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {weeklyTasks.length > 0 && (
        <Section title="Tarefas semanais">
          {weeklyTasks.map(a => (
            <TaskRow key={a.id} a={a} summary={summary}
              onToggleComplete={onToggleComplete} onReassign={onReassign}
              onTogglePenalty={onTogglePenalty} onDelete={onDelete} />
          ))}
        </Section>
      )}
      {days.map(d => {
        const tasks = dailyByDay(d)
        if (tasks.length === 0) return null
        return (
          <Section key={d} title={dayLabel(d)}>
            {tasks.map(a => (
              <TaskRow key={a.id} a={a} summary={summary}
                onToggleComplete={onToggleComplete} onReassign={onReassign}
                onTogglePenalty={onTogglePenalty} onDelete={onDelete} />
            ))}
          </Section>
        )
      })}
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
      <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface-2)' }}>
        <p style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)', textTransform:'capitalize' }}>{title}</p>
      </div>
      <div style={{ padding:'4px 0' }}>{children}</div>
    </div>
  )
}

// ── TaskRow ───────────────────────────────────────────────────────────────────

interface RowProps {
  a: Assignment
  summary: WeekSummaryDto
  onToggleComplete: (a: Assignment) => Promise<void>
  onReassign: (a: Assignment, to: Assignee) => Promise<void>
  onTogglePenalty: (a: Assignment) => Promise<void>
  onDelete: (a: Assignment) => Promise<void>
}

function TaskRow({ a, summary, onToggleComplete, onReassign, onTogglePenalty, onDelete }: RowProps) {
  const [busy, setBusy]               = useState(false)
  const [confirmDel, setConfirmDel]   = useState(false)
  const [showAssign, setShowAssign]   = useState(false)

  const child1Name = summary.child1Name
  const child2Name = summary.child2Name

  const assigneeName =
    a.assignedTo === 'CHILD1' ? child1Name
    : a.assignedTo === 'CHILD2' ? child2Name
    : a.assignedTo === 'BOTH' ? `${child1Name} & ${child2Name}`
    : 'Não atribuída'

  const completedTime = a.completedAt
    ? format(new Date(a.completedAt), "dd/MM HH:mm")
    : null

  async function run(fn: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  return (
    <div style={{
      padding:'10px 14px', borderBottom:'1px solid var(--border)',
      animation:'fadeIn .15s ease',
      background: confirmDel ? '#FFF5F5' : 'transparent',
      transition:'background .2s',
    }}>
      {/* Confirm delete bar */}
      {confirmDel && (
        <div style={{
          marginBottom:8, padding:'7px 10px',
          background:'#FCEBEB', border:'1px solid #F7C1C1', borderRadius:'var(--radius-sm)',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
        }}>
          <span style={{ fontSize:12, color:'#A32D2D', fontWeight:500 }}>Excluir este assignment?</span>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => run(async () => { await onDelete(a); setConfirmDel(false) })} style={{
              fontSize:11, padding:'3px 10px', borderRadius:8,
              background:'#A32D2D', color:'white', border:'none', cursor:'pointer',
            }}>Excluir</button>
            <button onClick={() => setConfirmDel(false)} style={{
              fontSize:11, padding:'3px 10px', borderRadius:8,
              border:'1px solid #F7C1C1', background:'transparent', color:'#A32D2D', cursor:'pointer',
            }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Reassign picker */}
      {showAssign && !a.completed && (
        <div style={{
          marginBottom:8, padding:'8px 10px',
          background:'var(--surface-2)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-sm)',
        }}>
          <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:6 }}>Atribuir para:</p>
          <div style={{ display:'flex', gap:6 }}>
            {([
              { id:'CHILD1' as Assignee, label: child1Name },
              { id:'CHILD2' as Assignee, label: child2Name },
              { id:'BOTH'   as Assignee, label: 'Ambos' },
            ]).map(opt => (
              <button key={opt.id}
                onClick={() => { setShowAssign(false); run(() => onReassign(a, opt.id)) }}
                style={{
                  flex:1, padding:'5px 0', borderRadius:'var(--radius-sm)',
                  border: a.assignedTo === opt.id ? '2px solid var(--child1-strong)' : '1px solid var(--border)',
                  background: a.assignedTo === opt.id ? 'var(--child1-light)' : 'var(--surface)',
                  fontSize:12, cursor:'pointer', color:'var(--text-primary)',
                }}
              >{opt.label}</button>
            ))}
            <button onClick={() => setShowAssign(false)} style={{
              padding:'5px 8px', borderRadius:'var(--radius-sm)',
              border:'1px solid var(--border)', background:'transparent',
              color:'var(--text-hint)', fontSize:12, cursor:'pointer',
            }}>✕</button>
          </div>
        </div>
      )}

      {/* Main row */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {/* Status dot */}
        <div style={{
          width:10, height:10, borderRadius:'50%', flexShrink:0,
          background: a.completed ? 'var(--weekly-border)' : 'var(--border-strong)',
        }} />

        {/* Name + assignee */}
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{
            fontSize:13, fontWeight:500,
            textDecoration: a.completed ? 'line-through' : 'none',
            color: a.completed ? 'var(--text-hint)' : 'var(--text-primary)',
          }}>{a.taskName}</p>
          <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:2 }}>
            <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{assigneeName}</span>
            {/* Reassign button — only for incomplete tasks */}
            {!a.completed && (
              <button onClick={() => setShowAssign(v => !v)} style={{
                fontSize:10, color:'var(--text-hint)',
                background:'var(--surface-2)', border:'1px solid var(--border)',
                borderRadius:8, padding:'1px 6px', cursor:'pointer',
              }}>✎</button>
            )}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
          {a.completed ? (
            <span style={{ fontSize:12, color:'var(--weekly-text)', fontWeight:500 }}>
              ✓ {completedTime}
            </span>
          ) : (
            <button onClick={() => run(() => onTogglePenalty(a))} disabled={busy} title={a.penaltyApplied ? 'Remover ocorrência' : 'Registrar ocorrência (não feita/incompleta)'} style={{
              fontSize:11, padding:'2px 8px', borderRadius:10,
              border: a.penaltyApplied ? '1px solid #F7C1C1' : '1px dashed #F7C1C1',
              background: a.penaltyApplied ? '#FCEBEB' : 'transparent',
              color:'#A32D2D', cursor:'pointer', opacity: busy ? 0.5 : 1, transition:'all .15s',
            }}>
              {a.penaltyApplied ? '✕ ocorrência (−1)' : 'pendente'}
            </button>
          )}
        </div>

        {/* Done toggle */}
        <button onClick={() => run(() => onToggleComplete(a))} disabled={busy} data-testid="week-done-btn" style={{
          width:26, height:26, borderRadius:'50%',
          border:`1.5px solid ${a.completed ? 'var(--weekly-border)' : 'var(--border-strong)'}`,
          background: a.completed ? 'var(--weekly-border)' : 'transparent',
          color: a.completed ? 'white' : 'transparent',
          fontSize:13, fontWeight:700, flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor: busy ? 'not-allowed' : 'pointer', transition:'all .15s',
          opacity: busy ? 0.5 : 1,
        }} title={a.completed ? 'Desmarcar' : 'Marcar como feito'}>
          {a.completed ? '✓' : ''}
        </button>

        {/* Delete button */}
        <button onClick={() => setConfirmDel(true)} title="Excluir" style={{
          width:22, height:22, borderRadius:'50%', flexShrink:0,
          border:'1px solid var(--border)', background:'transparent',
          color:'var(--text-hint)', fontSize:12,
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', transition:'all .15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#A32D2D'; (e.currentTarget as HTMLButtonElement).style.color = '#A32D2D' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-hint)' }}
        >🗑</button>
      </div>
    </div>
  )
}
