import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { boardApi } from '../api/client'
import type { WeekSummaryDto, Assignment } from '../types'

function monday(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 })
}

function fmtWeek(d: Date) {
  return format(monday(d), 'yyyy-MM-dd')
}

export function WeekPage() {
  const [weekDate, setWeekDate] = useState(() => monday(new Date()))
  const [summary, setSummary] = useState<WeekSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSummary = useCallback((date: Date) => {
    setLoading(true)
    boardApi.getWeekSummary(fmtWeek(date))
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadSummary(weekDate) }, [weekDate, loadSummary])

  /** Toggle bonus on a completed assignment and refresh points */
  const toggleBonus = useCallback(async (a: Assignment) => {
    if (!a.completed) return
    try {
      await boardApi.uncomplete(a.id)
      const updated = await boardApi.complete(a.id, !a.bonusEarned)
      setSummary(prev => {
        if (!prev) return prev
        const assignments = prev.assignments.map(x => x.id === a.id ? updated : x)
        const points = { ...prev.points }
        const delta = updated.bonusEarned ? 1 : -1
        targets(a).forEach(p => { points[p] = Math.max(0, (points[p] ?? 0) + delta) })
        return { ...prev, assignments, points }
      })
    } catch (e) { console.error('toggleBonus', e) }
  }, [])

  const applyLatePenalty = useCallback(async (a: Assignment) => {
    if (!a.completed || a.penaltyApplied) return
    try {
      const updated = await boardApi.penalty(a.id)
      setSummary(prev => {
        if (!prev) return prev
        const assignments = prev.assignments.map(x => x.id === a.id ? updated : x)
        const points = { ...prev.points }
        targets(a).forEach(p => { points[p] = Math.max(0, (points[p] ?? 0) - 1) })
        return { ...prev, assignments, points }
      })
    } catch (e) { console.error('applyLatePenalty', e) }
  }, [])

  const removeLatePenalty = useCallback(async (a: Assignment) => {
    if (!a.penaltyApplied) return
    try {
      const updated = await boardApi.unpenalty(a.id)
      setSummary(prev => {
        if (!prev) return prev
        const assignments = prev.assignments.map(x => x.id === a.id ? updated : x)
        const points = { ...prev.points }
        targets(a).forEach(p => { points[p] = (points[p] ?? 0) + 1 })
        return { ...prev, assignments, points }
      })
    } catch (e) { console.error('removeLatePenalty', e) }
  }, [])

  const weekLabel    = format(weekDate, "dd 'de' MMMM", { locale: ptBR })
  const weekEndLabel = format(new Date(weekDate.getTime() + 6 * 86400000), "dd 'de' MMMM", { locale: ptBR })
  const isCurrentWeek = fmtWeek(weekDate) === fmtWeek(new Date())

  return (
    <div style={{ maxWidth:800, margin:'0 auto', padding:'22px 14px 80px' }}>
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

        <button
          onClick={() => setWeekDate(d => addWeeks(d, 1))}
          disabled={isCurrentWeek}
          style={{
            width:34, height:34, borderRadius:'50%',
            border:'1px solid var(--border-strong)', fontSize:16, color:'var(--text-secondary)',
            display:'flex', alignItems:'center', justifyContent:'center',
            opacity: isCurrentWeek ? 0.3 : 1,
          }}
        >›</button>
      </div>

      {loading && <p style={{ textAlign:'center', padding:'40px 0', color:'var(--text-hint)' }}>Carregando…</p>}

      {!loading && summary && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:22 }}>
            {[
              { key:'CHILD1', name: summary.child1Name, color:'child1' as const },
              { key:'CHILD2', name: summary.child2Name, color:'child2' as const },
            ].map(({ key, name, color }) => {
              const pts  = summary.points[key] ?? 0
              const done = summary.assignments.filter(a =>
                (a.assignedTo === key || a.assignedTo === 'BOTH') && a.completed
              ).length
              return (
                <div key={key} style={{
                  background:'var(--surface)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius-lg)', padding:'14px 18px',
                  borderTop:`4px solid var(--${color}-strong)`,
                }}>
                  <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:4 }}>{name}</p>
                  <p style={{ fontSize:36, fontWeight:600, fontFamily:'var(--font-display)', color:`var(--${color}-strong)`, lineHeight:1 }}>{pts}</p>
                  <p style={{ fontSize:11, color:'var(--text-hint)', marginTop:3 }}>
                    pontos · {done} tarefa{done !== 1 ? 's' : ''} concluída{done !== 1 ? 's' : ''}
                  </p>
                </div>
              )
            })}
          </div>

          <WeekGrid
            assignments={summary.assignments}
            child1Name={summary.child1Name}
            child2Name={summary.child2Name}
            weekStart={weekDate}
            onToggleBonus={toggleBonus}
            onLatePenalty={applyLatePenalty}
            onRemovePenalty={removeLatePenalty}
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

// ── helpers ───────────────────────────────────────────────────────────────────

function targets(a: Assignment): string[] {
  if (a.assignedTo === 'BOTH')       return ['CHILD1', 'CHILD2']
  if (a.assignedTo === 'UNASSIGNED') return []
  return [a.assignedTo]
}

// ── WeekGrid ──────────────────────────────────────────────────────────────────

function WeekGrid({ assignments, child1Name, child2Name, weekStart, onToggleBonus, onLatePenalty, onRemovePenalty }: {
  assignments: Assignment[]
  child1Name: string
  child2Name: string
  weekStart: Date
  onToggleBonus: (a: Assignment) => void
  onLatePenalty: (a: Assignment) => void
  onRemovePenalty: (a: Assignment) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * 86400000)
    return format(d, 'yyyy-MM-dd')
  })

  const dayLabel = (dateStr: string) =>
    format(new Date(dateStr + 'T12:00:00'), "EEEE dd/MM", { locale: ptBR })

  const weeklyTasks = assignments.filter(a => a.taskFrequency !== 'DAILY')
  const dailyByDay  = (dateStr: string) =>
    assignments.filter(a => a.taskFrequency === 'DAILY' && a.periodDate === dateStr)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {weeklyTasks.length > 0 && (
        <Section title="Tarefas semanais">
          {weeklyTasks.map(a => (
            <TaskRow key={a.id} a={a} child1Name={child1Name} child2Name={child2Name}
              onToggleBonus={onToggleBonus} onLatePenalty={onLatePenalty} onRemovePenalty={onRemovePenalty} />
          ))}
        </Section>
      )}
      {days.map(d => {
        const tasks = dailyByDay(d)
        if (tasks.length === 0) return null
        return (
          <Section key={d} title={dayLabel(d)}>
            {tasks.map(a => (
              <TaskRow key={a.id} a={a} child1Name={child1Name} child2Name={child2Name}
                onToggleBonus={onToggleBonus} onLatePenalty={onLatePenalty} onRemovePenalty={onRemovePenalty} />
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

function TaskRow({ a, child1Name, child2Name, onToggleBonus, onLatePenalty, onRemovePenalty }: {
  a: Assignment
  child1Name: string
  child2Name: string
  onToggleBonus: (a: Assignment) => void
  onLatePenalty: (a: Assignment) => void
  onRemovePenalty: (a: Assignment) => void
}) {
  const [togglingBonus,    setTogglingBonus]    = useState(false)
  const [togglingPenalty,  setTogglingPenalty]  = useState(false)

  const assigneeName =
    a.assignedTo === 'CHILD1' ? child1Name
    : a.assignedTo === 'CHILD2' ? child2Name
    : a.assignedTo === 'BOTH' ? `${child1Name} & ${child2Name}`
    : 'Não atribuída'

  const completedTime = a.completedAt
    ? format(new Date(a.completedAt), 'HH:mm')
    : null

  async function handleBonus() {
    if (!a.completed || togglingBonus) return
    setTogglingBonus(true)
    try { await onToggleBonus(a) } finally { setTogglingBonus(false) }
  }

  async function handlePenaltyToggle() {
    if (togglingPenalty) return
    setTogglingPenalty(true)
    try {
      if (a.penaltyApplied) await onRemovePenalty(a)
      else await onLatePenalty(a)
    } finally { setTogglingPenalty(false) }
  }

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      padding:'10px 16px', borderBottom:'1px solid var(--border)',
      animation:'fadeIn .18s ease',
    }}>
      {/* Status dot */}
      <div style={{
        width:10, height:10, borderRadius:'50%', flexShrink:0,
        background: a.completed ? 'var(--weekly-border)' : 'var(--border-strong)',
      }} />

      {/* Nome + responsável */}
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{
          fontSize:13, fontWeight:500,
          textDecoration: a.completed ? 'line-through' : 'none',
          color: a.completed ? 'var(--text-hint)' : 'var(--text-primary)',
        }}>{a.taskName}</p>
        <p style={{ fontSize:11, color:'var(--text-secondary)' }}>{assigneeName}</p>
      </div>

      {/* Coluna direita */}
      <div style={{ textAlign:'right', flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
        {a.completed ? (
          <>
            <span style={{ fontSize:12, color:'var(--weekly-text)', fontWeight:500 }}>
              ✓ {completedTime}
            </span>

            <div style={{ display:'flex', gap:5 }}>
              {/* Bônus toggle */}
              <button
                onClick={handleBonus}
                disabled={togglingBonus}
                title={a.bonusEarned ? 'Remover bônus' : 'Adicionar bônus (feito sem lembrete)'}
                style={{
                  fontSize:11, padding:'2px 8px', borderRadius:10,
                  border: a.bonusEarned ? '1px solid var(--daily-border)' : '1px dashed var(--border-strong)',
                  background: a.bonusEarned ? 'var(--daily-bg)' : 'transparent',
                  color: a.bonusEarned ? 'var(--daily-text)' : 'var(--text-hint)',
                  cursor:'pointer', fontFamily:'var(--font-body)',
                  opacity: togglingBonus ? 0.5 : 1, transition:'all .15s',
                }}
              >
                {a.bonusEarned ? '⭐ bônus' : '+ bônus?'}
              </button>

              {/* Penalidade de atraso — toggle: aplica / remove */}
              <button
                onClick={handlePenaltyToggle}
                disabled={togglingPenalty}
                title={a.penaltyApplied ? 'Remover penalidade de atraso' : 'Aplicar penalidade por atraso (−1 pt)'}
                style={{
                  fontSize:11, padding:'2px 8px', borderRadius:10,
                  border: a.penaltyApplied ? '1px solid #F7C1C1' : '1px dashed #F7C1C1',
                  background: a.penaltyApplied ? '#FCEBEB' : 'transparent',
                  color: '#A32D2D',
                  cursor:'pointer', fontFamily:'var(--font-body)',
                  opacity: togglingPenalty ? 0.5 : 1, transition:'all .15s',
                }}
              >
                {a.penaltyApplied ? '✕ atraso' : '− atraso?'}
              </button>
            </div>
          </>
        ) : a.penaltyApplied ? (
          <span style={{ fontSize:12, color:'#A32D2D' }}>penalidade</span>
        ) : (
          <span style={{ fontSize:12, color:'var(--text-hint)' }}>pendente</span>
        )}

        <p style={{ fontSize:11, color:'var(--text-hint)' }}>
          +{a.points} ponto{a.points !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
