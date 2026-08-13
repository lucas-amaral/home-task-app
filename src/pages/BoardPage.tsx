import { useBoard } from '../hooks/useBoard'
import { Header, Legend } from '../components/Layout'
import { ConsequencePanel } from '../components/ConsequencePanel'
import { BoardColumns } from '../components/BoardColumns'

export function BoardPage() {
  const {
    board, loading, error,
    assign, toggleComplete, applyPenalty, deleteAssignment, addOneOff,
    weekLabel, todayLabel, refetch,
  } = useBoard()

  if (error) {
    return (
      <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-lg)', padding:'30px 38px',
          textAlign:'center', maxWidth:400,
        }}>
          <p style={{ fontSize:30, marginBottom:11 }}>⚠️</p>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:19, marginBottom:7 }}>Erro de conexão</h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:18 }}>{error}</p>
          <button onClick={refetch} style={{
            padding:'9px 22px', borderRadius:'var(--radius-md)',
            background:'var(--text-primary)', color:'var(--bg)',
            fontSize:13, fontWeight:500, border:'none', fontFamily:'var(--font-body)',
          }}>Tentar novamente</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth:1160, margin:'0 auto', padding:'22px 14px 80px' }}>
      <Header todayLabel={todayLabel} weekLabel={weekLabel} onRefresh={refetch} loading={loading} />

       {loading && !board ? (
         <p style={{ textAlign:'center', padding:'60px 0', color:'var(--text-hint)', fontSize:14 }}>
           Carregando o quadro…
         </p>
       ) : board ? (
         <>
           <ConsequencePanel
             status={board.weeklyStatus}
             child1Name={board.child1Name}
             child2Name={board.child2Name}
           />
           <p style={{ fontSize:11, color:'var(--text-hint)', marginBottom:11 }}>
             Arraste os cards entre as colunas (ou toque no avatar) para atribuir · Círculo = marcar como concluído
           </p>
           <div style={{ marginBottom:20 }}>
             <BoardColumns
               board={board}
               onAssign={assign}
               onToggleComplete={toggleComplete}
               onPenalty={applyPenalty}
               onDelete={deleteAssignment}
               onAddOneOff={addOneOff}
             />
           </div>
           <Legend />
         </>
       ) : null}
    </div>
  )
}
