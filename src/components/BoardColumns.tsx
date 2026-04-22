import { useState } from 'react'
import {
  DndContext, DragOverlay, closestCenter,
  type DragStartEvent, type DragEndEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { TaskCard } from './TaskCard'
import type { Assignment, Assignee, BoardDto } from '../types'

interface Props {
  board: BoardDto
  onAssign: (assignmentId: number, taskId: number, to: Assignee, periodDate: string, isDaily: boolean) => void
  onToggleComplete: (id: number, bonus?: boolean) => void
  onPenalty: (id: number) => void
  onAddOneOff: (assignedTo: Assignee, name: string, points: number) => Promise<void>
}

type ColId = 'CHILD1' | 'UNASSIGNED' | 'CHILD2' | 'BOTH'

const COLUMNS: { id: ColId; labelKey: 'child1' | 'child2' | 'unassigned' | 'both' }[] = [
  { id: 'CHILD1',     labelKey: 'child1' },
  { id: 'UNASSIGNED', labelKey: 'unassigned' },
  { id: 'CHILD2',     labelKey: 'child2' },
  { id: 'BOTH',       labelKey: 'both' },
]

export function BoardColumns({ board, onAssign, onToggleComplete, onPenalty, onAddOneOff }: Props) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const [addingTo, setAddingTo] = useState<ColId | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  function tasksForCol(col: ColId): Assignment[] {
    return board.assignments.filter(a => a.assignedTo === col)
  }

  function handleDragStart(e: DragStartEvent) { setActiveId(e.active.id as number) }

  function handleDragEnd(e: DragEndEvent) {
    const { over } = e
    if (over && activeId !== null) {
      const target = over.id as Assignee
      const a = board.assignments.find(a => a.id === activeId)
      if (a && !a.completed && a.assignedTo !== target) {
        const isDaily = a.taskFrequency === 'DAILY'
        onAssign(a.id, a.taskId, target, a.periodDate, isDaily)
      }
    }
    setActiveId(null)
  }

  const activeAssignment = activeId ? board.assignments.find(a => a.id === activeId) : null

  const colLabel = (col: ColId) => {
    if (col === 'CHILD1') return board.child1Name
    if (col === 'CHILD2') return board.child2Name
    if (col === 'BOTH')   return 'Ambos'
    return 'Não atribuído'
  }

  const colAccent = (col: ColId) =>
    col === 'CHILD1' ? 'var(--child1-strong)'
    : col === 'CHILD2' ? 'var(--child2-strong)'
    : col === 'BOTH'   ? 'var(--both-strong)'
    : 'var(--text-hint)'

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter}
                  onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}>
          {COLUMNS.map(col => {
            const tasks = tasksForCol(col.id)
            const accent = colAccent(col.id)
            return (
              <DroppableColumn
                key={col.id}
                colId={col.id}
                label={colLabel(col.id)}
                accent={accent}
                count={tasks.length}
                onAddClick={() => setAddingTo(col.id)}
              >
                {tasks.map(a => (
                  <DraggableWrapper key={a.id} id={a.id} disabled={a.taskType === 'JOINT'}>
                    <TaskCard
                      assignment={a}
                      child1Name={board.child1Name}
                      child2Name={board.child2Name}
                      onAssign={to => onAssign(a.id, a.taskId, to, a.periodDate, a.taskFrequency === 'DAILY')}
                      onToggleComplete={bonus => onToggleComplete(a.id, bonus)}
                      onPenalty={() => onPenalty(a.id)}
                      dragging={activeId === a.id}
                    />
                  </DraggableWrapper>
                ))}
                {tasks.length === 0 && (
                  <div style={{
                    textAlign:'center', padding:'20px 8px',
                    color:'var(--text-hint)', fontSize:12,
                    border:'1.5px dashed var(--border)', borderRadius:'var(--radius-md)',
                  }}>
                    {col.id === 'UNASSIGNED' ? 'All assigned!' : 'Drop here'}
                  </div>
                )}
              </DroppableColumn>
            )
          })}
        </div>

        <DragOverlay dropAnimation={{ duration:180, easing:'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
          {activeAssignment ? (
            <div style={{ transform:'rotate(2deg)', opacity:0.88 }}>
              <TaskCard
                assignment={activeAssignment}
                child1Name={board.child1Name}
                child2Name={board.child2Name}
                onAssign={() => {}} onToggleComplete={() => {}} onPenalty={() => {}}
                dragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* One-off task modal */}
      {addingTo && (
        <OneOffModal
          colLabel={colLabel(addingTo)}
          accent={colAccent(addingTo)}
          onConfirm={async (name, points) => {
            await onAddOneOff(addingTo, name, points)
            setAddingTo(null)
          }}
          onClose={() => setAddingTo(null)}
        />
      )}
    </>
  )
}

// ── One-off task modal ────────────────────────────────────────────────────────

function OneOffModal({ colLabel, accent, onConfirm, onClose }: {
  colLabel: string
  accent: string
  onConfirm: (name: string, points: number) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [points, setPoints] = useState(1)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onConfirm(name.trim(), points)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.35)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:100, backdropFilter:'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'var(--surface)', borderRadius:'var(--radius-lg)',
          padding:'24px 26px', width:340, boxShadow:'var(--shadow-md)',
          border:`2px solid ${accent}`,
          animation:'fadeIn .15s ease',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:accent }} />
          <h3 style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)' }}>
            Nova tarefa para <span style={{ color: accent }}>{colLabel}</span>
          </h3>
        </div>

        <p style={{ fontSize:12, color:'var(--text-hint)', marginBottom:14 }}>
          Tarefa única para hoje — não se repete nos próximos dias.
        </p>

        <label style={{ display:'block', fontSize:12, color:'var(--text-secondary)', marginBottom:5 }}>
          Nome da tarefa
        </label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose() }}
          placeholder="Ex: Regar as plantas"
          style={{
            width:'100%', padding:'9px 11px', borderRadius:'var(--radius-sm)',
            border:'1.5px solid var(--border-strong)', fontSize:13,
            fontFamily:'var(--font-body)', outline:'none', boxSizing:'border-box',
            marginBottom:14, color:'var(--text-primary)', background:'var(--bg)',
          }}
        />

        <label style={{ display:'block', fontSize:12, color:'var(--text-secondary)', marginBottom:5 }}>
          Pontos
        </label>
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {[1, 2, 3, 5].map(p => (
            <button
              key={p}
              onClick={() => setPoints(p)}
              style={{
                flex:1, padding:'7px 0', borderRadius:'var(--radius-sm)',
                border: points === p ? `2px solid ${accent}` : '1.5px solid var(--border)',
                background: points === p ? `color-mix(in srgb, ${accent} 12%, white)` : 'var(--bg)',
                fontSize:13, fontWeight: points === p ? 600 : 400,
                color: points === p ? accent : 'var(--text-secondary)',
                transition:'all .1s',
              }}
            >+{p}</button>
          ))}
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button
            onClick={onClose}
            style={{
              flex:1, padding:'9px 0', borderRadius:'var(--radius-sm)',
              border:'1px solid var(--border)', fontSize:13,
              color:'var(--text-secondary)', background:'var(--bg)',
            }}
          >Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            style={{
              flex:2, padding:'9px 0', borderRadius:'var(--radius-sm)',
              background: name.trim() ? accent : 'var(--border)',
              color: name.trim() ? 'white' : 'var(--text-hint)',
              fontSize:13, fontWeight:500, border:'none',
              opacity: saving ? 0.7 : 1, transition:'all .15s',
            }}
          >{saving ? 'Salvando…' : 'Adicionar tarefa'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Droppable column ──────────────────────────────────────────────────────────

function DroppableColumn({ colId, label, accent, count, children, onAddClick }: {
  colId: string; label: string; accent: string; count: number
  children: React.ReactNode; onAddClick: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId })
  const [hoveringFooter, setHoveringFooter] = useState(false)

  return (
    <div ref={setNodeRef} style={{
      background: isOver ? 'var(--surface-2)' : 'var(--surface-2)',
      borderRadius: 'var(--radius-lg)',
      padding: '13px 11px 0',
      border: `1.5px solid ${isOver ? accent : 'var(--border)'}`,
      minHeight: 260,
      transition: 'border-color .15s, background .15s',
      display: 'flex', flexDirection: 'column',
      ...(isOver ? { background: accent === 'var(--text-hint)' ? '#F0EDE8' : `color-mix(in srgb, ${accent} 8%, white)` } : {})
    }}>
      {/* Column header */}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:13 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:accent, flexShrink:0 }} />
        <p style={{ fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-secondary)' }}>
          {label}
        </p>
        <span style={{
          marginLeft:'auto', fontSize:11, background:'rgba(0,0,0,0.07)',
          borderRadius:10, padding:'1px 7px', color:'var(--text-secondary)',
        }}>{count}</span>
      </div>

      {/* Cards */}
      <div style={{ flex:1, paddingBottom:4 }}>{children}</div>

      {/* Add one-off footer */}
      <div
        onMouseEnter={() => setHoveringFooter(true)}
        onMouseLeave={() => setHoveringFooter(false)}
        onClick={onAddClick}
        style={{
          marginTop:4, padding: hoveringFooter ? '8px 6px' : '4px 6px',
          borderTop: hoveringFooter ? `1px dashed ${accent}` : '1px dashed transparent',
          cursor:'pointer',
          transition:'all .18s',
          display:'flex', alignItems:'center', justifyContent:'center', gap:5,
          color: hoveringFooter ? accent : 'transparent',
          fontSize:12, fontWeight:500,
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          background: hoveringFooter ? `color-mix(in srgb, ${accent} 6%, white)` : 'transparent',
          userSelect:'none',
        }}
      >
        <span style={{ fontSize:16, lineHeight:1 }}>+</span>
        Adicionar tarefa
      </div>
    </div>
  )
}

// ── Draggable wrapper ─────────────────────────────────────────────────────────

function DraggableWrapper({ id, children, disabled }: { id: number; children: React.ReactNode; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled: disabled ?? false })
  return (
    <div ref={setNodeRef} {...(disabled ? {} : { ...listeners, ...attributes })}
         style={{ opacity: isDragging ? 0.25 : 1, transition:'opacity .15s' }}>
      {children}
    </div>
  )
}
