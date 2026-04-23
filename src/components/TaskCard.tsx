import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Assignment, Assignee, TaskType } from '../types'

interface Props {
  assignment: Assignment
  child1Name: string
  child2Name: string
  onAssign: (assignedTo: Assignee) => void
  onToggleComplete: (bonusEarned?: boolean) => void
  onPenalty: () => void
  onDelete: () => void
  dragging?: boolean
}

const TYPE: Record<TaskType, { bg: string; border: string; text: string; label: string }> = {
  DAILY:  { bg:'var(--daily-bg)',  border:'var(--daily-border)',  text:'var(--daily-text)',  label:'diária' },
  WEEKLY: { bg:'var(--weekly-bg)', border:'var(--weekly-border)', text:'var(--weekly-text)', label:'semanal' },
  JOINT:  { bg:'var(--joint-bg)',  border:'var(--joint-border)',  text:'var(--joint-text)',  label:'compartilhada' },
  RULE:   { bg:'var(--rule-bg)',   border:'var(--rule-border)',   text:'var(--rule-text)',   label:'regra' },
}

export function TaskCard({
  assignment, child1Name, child2Name,
  onAssign, onToggleComplete, onPenalty, onDelete, dragging
}: Props) {
  const [bonusPrompt, setBonusPrompt] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const s = TYPE[assignment.taskType]
  const isJoint = assignment.assignedTo === 'BOTH'
  const isCompleted = assignment.completed

  const completedDateLabel = isCompleted && assignment.completedAt
    ? format(new Date(assignment.completedAt), "dd/MM HH:mm", { locale: ptBR })
    : null

  const periodDate = new Date(assignment.periodDate + 'T12:00:00')
  const periodLabel = assignment.taskType === 'WEEKLY'
    ? (() => {
      const startDate = periodDate
      const endDate = addDays(periodDate, 6)
      return `${format(startDate, 'dd')}–${format(endDate, 'dd MMM', { locale: ptBR })}`
    })()
    : format(periodDate, 'dd/MM', { locale: ptBR })

  // Deadline badge — show if deadlineDate is set and not yet completed
  const deadlineBadge = assignment.deadlineDate && !isCompleted
    ? (() => {
      const dl = new Date(assignment.deadlineDate)
      const overdue = dl < new Date()
      const label = format(dl, "dd/MM HH:mm", { locale: ptBR })
      return { label, overdue }
    })()
    : null

  function handleDoneClick() {
    if (isCompleted) { onToggleComplete(); return }
    setBonusPrompt(true)
  }

  function confirmBonus(bonus: boolean) {
    onToggleComplete(bonus)
    setBonusPrompt(false)
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setMenuOpen(true)
      return
    }
    onDelete()
    setMenuOpen(false)
    setConfirmDelete(false)
  }

  return (
    <div
      data-testid="task-card"
      style={{
        background: s.bg,
        border: `1.5px solid ${s.border}`,
        borderRadius: 'var(--radius-md)',
        padding: '11px 13px',
        marginBottom: 9,
        opacity: dragging ? 0.35 : isCompleted ? 0.58 : 1,
        transition: 'opacity .2s, transform .15s, box-shadow .15s',
        cursor: 'grab',
        position: 'relative',
        animation: 'fadeIn .22s ease',
      }}
      onMouseEnter={e => {
        if (!isCompleted) {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = 'rotate(-0.6deg) translateY(-2px)'
          el.style.boxShadow = 'var(--shadow-md)'
        }
        if (assignment.taskDescription) setShowTooltip(true)
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
        el.style.boxShadow = ''
        setShowTooltip(false)
      }}
    >
      {/* Tooltip */}
      {showTooltip && assignment.taskDescription && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0,
          background: s.border, color: s.bg,
          padding: '8px 10px', borderRadius: 'var(--radius-sm)',
          fontSize: 12, marginBottom: 6, zIndex: 50,
          boxShadow: 'var(--shadow-md)',
          pointerEvents: 'none',
          lineHeight: 1.4,
          wordWrap: 'break-word',
        }}>
          {assignment.taskDescription}
        </div>
      )}

      {/* Header row */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:7, marginBottom:5 }}>
        <div style={{ flex:1 }}>
          <p style={{
            fontSize:13, fontWeight:500, color: s.text, lineHeight:1.35,
            textDecoration: isCompleted ? 'line-through' : 'none',
          }}>
            {assignment.taskName}
          </p>
        </div>
        <span style={{
          fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20,
          background: s.border, color: s.bg, whiteSpace:'nowrap', flexShrink:0,
        }}>
          {s.label} +{assignment.points}
        </span>
      </div>

      {/* Period date + deadline badge */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:7 }}>
        {deadlineBadge && (
          <span style={{
            fontSize:10, fontWeight:500, padding:'1px 7px', borderRadius:10,
            background: deadlineBadge.overdue ? '#FCEBEB' : '#FFF8E1',
            color: deadlineBadge.overdue ? '#A32D2D' : '#7A5C00',
            border: `1px solid ${deadlineBadge.overdue ? '#F7C1C1' : '#F0D080'}`,
          }}>
            {deadlineBadge.overdue ? '⚠️' : '📅'} prazo {deadlineBadge.label}
          </span>
        )}
        <span style={{ fontSize:11, color:s.text, opacity:0.5, marginLeft:'auto' }}>
          {periodLabel}
        </span>
      </div>

      {/* Bonus prompt */}
      {bonusPrompt && (
        <div style={{
          background:'rgba(255,255,255,0.75)', borderRadius:'var(--radius-sm)',
          padding:'8px 10px', marginBottom:8,
        }}>
          <p style={{ fontSize:12, color:s.text, fontWeight:500, marginBottom:6 }}>
            Feito sem ser lembrado?
          </p>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => confirmBonus(true)} style={{
              flex:1, padding:'4px 0', borderRadius:'var(--radius-sm)',
              background: s.border, color: s.bg, fontSize:12, fontWeight:500,
            }}>Sim +1 bonus</button>
            <button onClick={() => confirmBonus(false)} style={{
              flex:1, padding:'4px 0', borderRadius:'var(--radius-sm)',
              border:`1px solid ${s.border}`, color:s.text, fontSize:12,
            }}>Não</button>
          </div>
        </div>
      )}

      {/* Footer: avatars + completion date + done button */}
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        {/* Avatar(s) */}
        {isJoint ? (
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            <Avatar label={child1Name.slice(0,2).toUpperCase()} color="child1" active />
            <Avatar label={child2Name.slice(0,2).toUpperCase()} color="child2" active />
            <span style={{ fontSize:11, color:s.text, opacity:0.65 }}>juntos</span>
          </div>
        ) : (
          <div style={{ display:'flex', gap:4 }}>
            <Avatar
              label={child1Name.slice(0,2).toUpperCase()} color="child1"
              active={assignment.assignedTo === 'CHILD1'}
              onClick={() => !isCompleted && onAssign('CHILD1')}
            />
            <Avatar
              label={child2Name.slice(0,2).toUpperCase()} color="child2"
              active={assignment.assignedTo === 'CHILD2'}
              onClick={() => !isCompleted && onAssign('CHILD2')}
            />
          </div>
        )}

        {/* Completion timestamp */}
        {completedDateLabel && (
          <span style={{ fontSize:10, color:s.text, opacity:0.55 }}>
            ✓ {completedDateLabel}
          </span>
        )}

        <div style={{ flex:1 }} />

        {/* ⋯ menu */}
        <div style={{ position:'relative' }}>
          <button
            onClick={() => { setMenuOpen(v => !v); setConfirmDelete(false) }}
            style={{ fontSize:15, color:s.text, opacity:0.45, padding:'0 3px', lineHeight:1 }}
          >⋯</button>
          {menuOpen && (
            <div style={{
              position:'absolute', right:0, bottom:'110%',
              background:'var(--surface)', border:'1px solid var(--border-strong)',
              borderRadius:'var(--radius-sm)', boxShadow:'var(--shadow-md)',
              minWidth:178, zIndex:20,
            }}>
              {/* Penalty option — only for incomplete assigned tasks */}
              {!isCompleted && assignment.assignedTo !== 'UNASSIGNED' && (
                <button
                  onClick={() => { onPenalty(); setMenuOpen(false) }}
                  style={{
                    display:'block', width:'100%', textAlign:'left',
                    padding:'8px 12px', fontSize:12, color:'#A32D2D',
                    borderBottom:'1px solid var(--border)',
                  }}
                >Aplicar penalidade −1 pt</button>
              )}

              {/* Delete — two-step confirm */}
              {!confirmDelete ? (
                <button
                  onClick={handleDelete}
                  style={{
                    display:'block', width:'100%', textAlign:'left',
                    padding:'8px 12px', fontSize:12, color:'var(--text-secondary)',
                  }}
                >🗑 Excluir tarefa</button>
              ) : (
                <div style={{ padding:'8px 12px' }}>
                  <p style={{ fontSize:12, color:'#A32D2D', marginBottom:6, fontWeight:500 }}>
                    Confirmar exclusão?
                  </p>
                  <div style={{ display:'flex', gap:6 }}>
                    <button
                      onClick={handleDelete}
                      style={{
                        flex:1, padding:'4px 0', borderRadius:'var(--radius-sm)',
                        background:'#A32D2D', color:'#fff', fontSize:12, fontWeight:500,
                      }}
                    >Sim</button>
                    <button
                      onClick={() => { setConfirmDelete(false); setMenuOpen(false) }}
                      style={{
                        flex:1, padding:'4px 0', borderRadius:'var(--radius-sm)',
                        border:'1px solid var(--border-strong)', fontSize:12,
                        color:'var(--text-secondary)',
                      }}
                    >Não</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Done circle */}
        {(isJoint || assignment.assignedTo !== 'UNASSIGNED') && (
          <button
            onClick={handleDoneClick}
            data-testid="done-btn"
            style={{
              width:23, height:23, borderRadius:'50%',
              border:`1.5px solid ${s.border}`,
              background: isCompleted ? s.border : 'transparent',
              color: isCompleted ? s.bg : 'transparent',
              fontSize:12, fontWeight:700,
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all .15s', flexShrink:0,
            }}
            title={isCompleted ? 'Marcar como não feito' : 'Marcar como feito'}
          >
            {isCompleted ? '✓' : ''}
          </button>
        )}
      </div>

      {/* Penalty badge */}
      {assignment.penaltyApplied && (
        <span style={{
          position:'absolute', top:7, right:7,
          fontSize:10, background:'#FCEBEB', color:'#A32D2D',
          padding:'1px 6px', borderRadius:10,
        }}>atrasado</span>
      )}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────

interface AvatarProps {
  label: string
  color: 'child1' | 'child2' | 'both'
  active?: boolean
  size?: number
  onClick?: () => void
}

export function Avatar({ label, color, active, size = 23, onClick }: AvatarProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        width:size, height:size, borderRadius:'50%',
        background: active
          ? `var(--${color}-mid)`
          : 'var(--surface-2)',
        border: `1.5px solid ${active ? `var(--${color}-strong)` : 'var(--border)'}`,
        color: active ? `var(--${color}-dark)` : 'var(--text-hint)',
        fontSize: size * 0.37,
        fontWeight:500,
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor: onClick ? 'pointer' : 'default',
        transition:'all .15s',
        flexShrink:0,
        fontFamily:'var(--font-body)',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.14)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
    >
      {label}
    </button>
  )
}
