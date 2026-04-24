import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { boardApi } from '../api/client'
import type { PointLedgerDto, FamilyConfig } from '../types'

export function HistoryPage() {
  const [history, setHistory] = useState<PointLedgerDto[]>([])
  const [config, setConfig] = useState<FamilyConfig>({ child1Name: 'Filho 1', child2Name: 'Filho 2', child1Phone: null, child2Phone: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([boardApi.pointsHistory(), boardApi.getConfig()])
      .then(([h, c]) => { setHistory(h); setConfig(c) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const weeks = Array.from(new Set(history.map(h => h.weekStart))).sort().reverse()

  const totalC1 = history.filter(h => h.assignee === 'CHILD1').reduce((s, h) => s + h.total, 0)
  const totalC2 = history.filter(h => h.assignee === 'CHILD2').reduce((s, h) => s + h.total, 0)

  const maxWeekPts = Math.max(
    ...weeks.map(w => {
      const c1 = history.find(h => h.weekStart === w && h.assignee === 'CHILD1')?.total ?? 0
      const c2 = history.find(h => h.weekStart === w && h.assignee === 'CHILD2')?.total ?? 0
      return Math.max(c1, c2)
    }), 1
  )

  return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:'22px 14px 80px' }}>
      <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:500, marginBottom:4 }}>Histórico</h1>
      <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:22 }}>Pontos acumulados por semana</p>

      {/* Totals */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:26 }}>
        {[
          { key:'CHILD1', name:config.child1Name, color:'child1' as const, total:totalC1 },
          { key:'CHILD2', name:config.child2Name, color:'child2' as const, total:totalC2 },
        ].map(({ name, color, total }) => (
          <div key={color} style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-lg)', padding:'14px 18px',
            borderTop:`4px solid var(--${color}-strong)`, textAlign:'center',
          }}>
            <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:4 }}>{name}</p>
            <p style={{ fontSize:38, fontWeight:600, fontFamily:'var(--font-display)', color:`var(--${color}-strong)`, lineHeight:1 }}>{total}</p>
            <p style={{ fontSize:11, color:'var(--text-hint)', marginTop:3 }}>total de pontos</p>
          </div>
        ))}
      </div>

      {loading && <p style={{ textAlign:'center', color:'var(--text-hint)', padding:40 }}>Carregando…</p>}

      {!loading && weeks.length === 0 && (
        <div style={{ textAlign:'center', padding:'44px 20px', background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)' }}>
          <p style={{ fontSize:28, marginBottom:10 }}>📋</p>
          <p style={{ fontSize:14, color:'var(--text-secondary)' }}>Ainda não há tarefas concluídas.</p>
          <p style={{ fontSize:12, color:'var(--text-hint)', marginTop:5 }}>Conclua tarefas no quadro para ver o histórico aqui.</p>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {weeks.map(w => {
          const c1 = history.find(h => h.weekStart === w && h.assignee === 'CHILD1')?.total ?? 0
          const c2 = history.find(h => h.weekStart === w && h.assignee === 'CHILD2')?.total ?? 0
          const wDate = new Date(w + 'T12:00:00')
          const endDate = addDays(wDate, 6)
          const label = `${format(wDate, "dd/MM", { locale: ptBR })} – ${format(endDate, "dd/MM", { locale: ptBR })}`
          const winner = c1 > c2 ? config.child1Name : c2 > c1 ? config.child2Name : null

          return (
            <div key={w} style={{
              background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:'var(--radius-lg)', padding:'15px 18px',
              animation:'fadeIn .2s ease',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:13 }}>
                <p style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)' }}>Semana de {label}</p>
                {winner && (
                  <span style={{ fontSize:11, background:'var(--daily-bg)', border:'1px solid var(--daily-border)', color:'var(--daily-text)', padding:'2px 8px', borderRadius:10 }}>
                    🏆 {winner}
                  </span>
                )}
              </div>
              <Bar name={config.child1Name} pts={c1} max={maxWeekPts} color="child1" />
              <Bar name={config.child2Name} pts={c2} max={maxWeekPts} color="child2" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Bar({ name, pts, max, color }: { name: string; pts: number; max: number; color: 'child1'|'child2' }) {
  const pct = max > 0 ? Math.round((pts / max) * 100) : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
      <span style={{ width:62, fontSize:13, color:'var(--text-primary)' }}>{name}</span>
      <div style={{ flex:1, height:20, background:'var(--surface-2)', borderRadius:10, overflow:'hidden', position:'relative' }}>
        <div style={{
          width:`${pct}%`, height:'100%',
          background:`var(--${color}-mid)`,
          borderRadius:10,
          transition:'width .5s cubic-bezier(0.34,1.56,0.64,1)',
          display:'flex', alignItems:'center', paddingLeft:8,
          minWidth: pts > 0 ? 24 : 0,
        }}>
          {pts > 0 && <span style={{ fontSize:11, fontWeight:500, color:`var(--${color}-dark)` }}>{pts}</span>}
        </div>
      </div>
      <span style={{ fontSize:13, fontWeight:500, minWidth:34, textAlign:'right', color:'var(--text-secondary)' }}>
        {pts} ponto{pts !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
