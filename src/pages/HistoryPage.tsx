import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { boardApi } from '../api/client'
import type { PointLedgerDto, FamilyConfig } from '../types'

export function HistoryPage() {
  const [history, setHistory] = useState<PointLedgerDto[]>([])
  const [config, setConfig] = useState<FamilyConfig>({ child1Name: 'Filho 1', child2Name: 'Filho 2' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([boardApi.pointsHistory(), boardApi.getConfig()])
      .then(([h, c]) => { setHistory(h); setConfig(c) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const weeks = Array.from(new Set(history.map(h => h.weekStart))).sort().reverse()

  // Punitive model: `total` is a ledger sum that's ≤ 0 (each occurrence is
  // −1). We show it as occurrence counts (positive, easier to read) instead.
  const occurrences = (assignee: 'CHILD1' | 'CHILD2') =>
    Math.max(0, -history.filter(h => h.assignee === assignee).reduce((s, h) => s + h.total, 0))

  const totalC1 = occurrences('CHILD1')
  const totalC2 = occurrences('CHILD2')

  const weekOccurrences = (w: string, assignee: 'CHILD1' | 'CHILD2') =>
    Math.max(0, -(history.find(h => h.weekStart === w && h.assignee === assignee)?.total ?? 0))

  const maxWeekOccurrences = Math.max(
    ...weeks.map(w => Math.max(weekOccurrences(w, 'CHILD1'), weekOccurrences(w, 'CHILD2'))), 1
  )

  return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:'22px 14px 80px' }}>
      <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:500, marginBottom:4 }}>Histórico</h1>
      <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:22 }}>Ocorrências (−1 pontos) acumuladas por semana</p>

      {/* Totals */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:26 }}>
        {[
          { name:config.child1Name, color:'child1' as const, total:totalC1 },
          { name:config.child2Name, color:'child2' as const, total:totalC2 },
        ].map(({ name, color, total }) => (
          <div key={color} style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-lg)', padding:'14px 18px',
            borderTop:`4px solid ${total === 0 ? `var(--${color}-strong)` : '#A32D2D'}`, textAlign:'center',
          }}>
            <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:4 }}>{name}</p>
            <p style={{ fontSize:38, fontWeight:600, fontFamily:'var(--font-display)', color: total === 0 ? `var(--${color}-strong)` : '#A32D2D', lineHeight:1 }}>{total}</p>
            <p style={{ fontSize:11, color:'var(--text-hint)', marginTop:3 }}>ocorrências no total</p>
          </div>
        ))}
      </div>

      {loading && <p style={{ textAlign:'center', color:'var(--text-hint)', padding:40 }}>Carregando…</p>}

      {!loading && weeks.length === 0 && (
        <div style={{ textAlign:'center', padding:'44px 20px', background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)' }}>
          <p style={{ fontSize:28, marginBottom:10 }}>🎉</p>
          <p style={{ fontSize:14, color:'var(--text-secondary)' }}>Nenhuma ocorrência registrada ainda.</p>
          <p style={{ fontSize:12, color:'var(--text-hint)', marginTop:5 }}>Um bom sinal — continue assim!</p>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {weeks.map(w => {
          const c1 = weekOccurrences(w, 'CHILD1')
          const c2 = weekOccurrences(w, 'CHILD2')
          const wDate = new Date(w + 'T12:00:00')
          const endDate = addDays(wDate, 6)
          const label = `${format(wDate, "dd/MM", { locale: ptBR })} – ${format(endDate, "dd/MM", { locale: ptBR })}`
          const cleanWeek = c1 === 0 && c2 === 0

          return (
            <div key={w} style={{
              background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:'var(--radius-lg)', padding:'15px 18px',
              animation:'fadeIn .2s ease',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:13 }}>
                <p style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)' }}>Semana de {label}</p>
                {cleanWeek && (
                  <span style={{ fontSize:11, background:'var(--daily-bg)', border:'1px solid var(--daily-border)', color:'var(--daily-text)', padding:'2px 8px', borderRadius:10 }}>
                    🎉 semana limpa
                  </span>
                )}
              </div>
              <Bar name={config.child1Name} occurrences={c1} max={maxWeekOccurrences} color="child1" />
              <Bar name={config.child2Name} occurrences={c2} max={maxWeekOccurrences} color="child2" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Bar({ name, occurrences, max, color }: { name: string; occurrences: number; max: number; color: 'child1'|'child2' }) {
  const pct = max > 0 ? Math.round((occurrences / max) * 100) : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
      <span style={{ width:62, fontSize:13, color:'var(--text-primary)' }}>{name}</span>
      <div style={{ flex:1, height:20, background:'var(--surface-2)', borderRadius:10, overflow:'hidden', position:'relative' }}>
        <div style={{
          width:`${pct}%`, height:'100%',
          background: occurrences === 0 ? `var(--${color}-mid)` : '#E39B9B',
          borderRadius:10,
          transition:'width .5s cubic-bezier(0.34,1.56,0.64,1)',
          display:'flex', alignItems:'center', paddingLeft:8,
          minWidth: occurrences > 0 ? 24 : 0,
        }}>
          {occurrences > 0 && <span style={{ fontSize:11, fontWeight:500, color:'#5C1414' }}>{occurrences}</span>}
        </div>
      </div>
      <span style={{ fontSize:13, fontWeight:500, minWidth:70, textAlign:'right', color:'var(--text-secondary)' }}>
        {occurrences} ocorrência{occurrences !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
