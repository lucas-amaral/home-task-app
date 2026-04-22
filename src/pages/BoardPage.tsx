import { useEffect, useState } from 'react'
import { useBoard } from '../hooks/useBoard'
import { Header, PersonScoreCards, RewardsPanel, Legend } from '../components/Layout'
import { BoardColumns } from '../components/BoardColumns'
import { boardApi } from '../api/client'
import type { Reward } from '../types'

export function BoardPage() {
  const { board, loading, error, assign, toggleComplete, applyPenalty, weekLabel, todayLabel, refetch } = useBoard()
  const [rewards, setRewards] = useState<Reward[]>([])

  useEffect(() => { boardApi.listRewards().then(setRewards).catch(() => {}) }, [])

  if (error) {
    return (
      <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-lg)', padding:'30px 38px',
          textAlign:'center', maxWidth:400,
        }}>
          <p style={{ fontSize:30, marginBottom:11 }}>⚠️</p>
          <h2 style={{ fontSize:19, marginBottom:7 }}>Connection error</h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:18 }}>{error}</p>
          <button onClick={refetch} style={{
            padding:'9px 22px', borderRadius:'var(--radius-md)',
            background:'var(--text-primary)', color:'var(--bg)',
            fontSize:13, fontWeight:500, border:'none', fontFamily:'var(--font-body)',
          }}>Try again</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth:1160, margin:'0 auto', padding:'22px 14px 80px' }}>
      <Header
        todayLabel={todayLabel}
        weekLabel={weekLabel}
        onRefresh={refetch}
        loading={loading}
      />

       {loading && !board ? (
         <p style={{ textAlign:'center', padding:'60px 0', color:'var(--text-hint)', fontSize:14 }}>
           Loading board…
         </p>
       ) : board ? (
         <>
           <PersonScoreCards
             child1Name={board.child1Name}
             child2Name={board.child2Name}
             child1Points={board.weekPoints['CHILD1'] ?? 0}
             child2Points={board.weekPoints['CHILD2'] ?? 0}
           />
           <p style={{ fontSize:11, color:'var(--text-hint)', marginBottom:11 }}>
             Arraste os cards entre as colunas · Clique no avatar para atribuir · Círculo = marcar como concluído          </p>
           <div style={{ marginBottom:20 }}>
             <BoardColumns
               board={board}
               onAssign={assign}
               onToggleComplete={toggleComplete}
               onPenalty={applyPenalty}
             />
           </div>
           <RewardsPanel
             child1Points={board.weekPoints['CHILD1'] ?? 0}
             child2Points={board.weekPoints['CHILD2'] ?? 0}
             rewards={rewards}
           />
           <Legend />
         </>
       ) : null}
    </div>
  )
}
