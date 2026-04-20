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
}

type ColId = 'CHILD1' | 'UNASSIGNED' | 'CHILD2' | 'BOTH'

const COLUMNS: { id: ColId; labelKey: 'child1' | 'child2' | 'unassigned' | 'both' }[] = [
  { id: 'CHILD1',     labelKey: 'child1' },
  { id: 'UNASSIGNED', labelKey: 'unassigned' },
  { id: 'CHILD2',     labelKey: 'child2' },
  { id: 'BOTH',       labelKey: 'both' },
]

export function BoardColumns({ board, onAssign, onToggleComplete, onPenalty }: Props) {
  const [activeId, setActiveId] = useState<number | null>(null)

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
  )
}

// ── Droppable column ──────────────────────────────────────────────────────────

function DroppableColumn({ colId, label, accent, count, children }: {
  colId: string; label: string; accent: string; count: number; children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId })
  return (
    <div ref={setNodeRef} style={{
      background: isOver ? 'var(--surface-2)' : 'var(--surface-2)',
      borderRadius: 'var(--radius-lg)',
      padding: '13px 11px',
      border: `1.5px solid ${isOver ? accent : 'var(--border)'}`,
      minHeight: 260,
      transition: 'border-color .15s, background .15s',
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
      {children}
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
