import type { WeeklyStatusDto } from '../types'

interface Props {
  status: WeeklyStatusDto[]
  child1Name: string
  child2Name: string
}

const COLOR: Record<string, 'child1' | 'child2'> = { CHILD1: 'child1', CHILD2: 'child2' }

/**
 * Shows, per child, how many occurrences (−1 each) have piled up this week
 * and which rungs of the automatic consequence ladder are active as a
 * result. Purely informational — the backend already applies consequences
 * automatically; this is just the "quadro de monitoramento" the house rules
 * call for.
 */
export function ConsequencePanel({ status, child1Name, child2Name }: Props) {
  if (status.length === 0) return null

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
      {status.map(s => (
        <ChildLadder key={s.assignee} status={s} color={COLOR[s.assignee] ?? 'child1'} />
      ))}
      <p style={{
        gridColumn:'1 / -1', fontSize:11, color:'var(--text-hint)', textAlign:'center', marginTop:-4,
      }}>
        {child1Name} e {child2Name} — as consequências são automáticas, sem negociação no momento da tarefa.
      </p>
    </div>
  )
}

function ChildLadder({ status, color }: { status: WeeklyStatusDto; color: 'child1' | 'child2' }) {
  const isClean = status.occurrenceCount === 0
  const activeRung = [...status.consequences].reverse().find(c => c.active)

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--radius-lg)', padding:'14px 16px',
      borderTop: `4px solid ${isClean ? `var(--${color}-strong)` : '#A32D2D'}`,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <div style={{
          width:28, height:28, borderRadius:'50%',
          background:`var(--${color}-light)`, border:`2px solid var(--${color}-strong)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:10, fontWeight:500, color:`var(--${color}-dark)`, flexShrink:0,
        }}>
          {status.name.slice(0,2).toUpperCase()}
        </div>
        <p style={{ fontSize:13, fontWeight:500, flex:1 }}>{status.name}</p>
        <span style={{
          fontSize:12, fontWeight:600, padding:'2px 9px', borderRadius:20,
          background: isClean ? `var(--${color}-light)` : '#FCEBEB',
          color: isClean ? `var(--${color}-dark)` : '#A32D2D',
        }}>
          {status.occurrenceCount} {status.occurrenceCount === 1 ? 'ocorrência' : 'ocorrências'}
        </span>
      </div>

      {/* Ladder dots */}
      <div style={{ display:'flex', gap:4, marginBottom: activeRung ? 8 : 0 }}>
        {status.consequences.map(c => (
          <div
            key={c.level}
            title={c.description}
            style={{
              flex:1, height:6, borderRadius:3,
              background: c.active ? '#A32D2D' : 'var(--surface-2)',
              transition:'background .2s',
            }}
          />
        ))}
      </div>

      {activeRung && (
        <p style={{ fontSize:11.5, color:'#A32D2D', lineHeight:1.4 }}>
          {activeRung.description}
        </p>
      )}
      {isClean && (
        <p style={{ fontSize:11.5, color:'var(--text-hint)' }}>Nenhuma ocorrência essa semana 🎉</p>
      )}
    </div>
  )
}
