import { NavLink } from 'react-router-dom'

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { to: '/',          icon: '🏠', label: 'Quadro' },
  { to: '/week',      icon: '📅', label: 'Essa semana' },
  { to: '/history',   icon: '📊', label: 'Histórico' },
  { to: '/admin',     icon: '⚙️',  label: 'Admin' },
]

export function Nav() {
  return (
    <nav style={{
      position:'fixed', bottom:0, left:0, right:0,
      background:'var(--surface)', borderTop:'1px solid var(--border)',
      display:'flex', zIndex:100,
      paddingBottom:'env(safe-area-inset-bottom)',
    }}>
      {NAV_LINKS.map(l => (
        <NavLink key={l.to} to={l.to} end={l.to === '/'}
          style={({ isActive }) => ({
            flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            gap:2, padding:'10px 0', textDecoration:'none',
            color: isActive ? 'var(--child1-strong)' : 'var(--text-hint)',
            fontSize:11, fontFamily:'var(--font-body)',
            fontWeight: isActive ? 500 : 400,
            borderTop: isActive ? '2px solid var(--child1-strong)' : '2px solid transparent',
            transition:'color .15s',
          })}
        >
          <span style={{ fontSize:18 }}>{l.icon}</span>
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

interface HeaderProps { todayLabel: string; weekLabel: string; onRefresh: () => void; loading: boolean }

const DEADLINE_PILLS = [
    { label:'Banheiro', time:'até 07:30', warnHour:7 },
    { label:'Almoço', time:'até 13:05', warnHour:12 },
    { label:'Sala', time:'até 19:30', warnHour:19 },
    { label:'Jantar', time:'30 min depois', warnHour:0 },
]

export function Header({ todayLabel, weekLabel, onRefresh, loading }: HeaderProps) {
  const hour = new Date().getHours()
  return (
    <header style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:13 }}>
        <div>
          <h1 style={{ fontSize:30, fontFamily:'var(--font-display)', fontWeight:500, lineHeight:1.1 }}>
            Tarefas da Casa
          </h1>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:3, textTransform:'capitalize' }}>
            {todayLabel}
          </p>
        </div>
        <button
          onClick={onRefresh} disabled={loading}
          style={{
            padding:'7px 15px', borderRadius:'var(--radius-md)',
            border:'1px solid var(--border-strong)', fontSize:13,
            color:'var(--text-secondary)', background:'var(--surface)',
            opacity: loading ? 0.5 : 1, transition:'all .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background='var(--surface-2)')}
          onMouseLeave={e => (e.currentTarget.style.background='var(--surface)')}
        >
          {loading ? 'Carregando…' : '↻ Atualizar'}
        </button>
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {DEADLINE_PILLS.map(d => {
          const warn = d.warnHour > 0 && hour >= d.warnHour
          return (
            <span key={d.label} style={{
              fontSize:12, padding:'3px 11px', borderRadius:20,
              background: warn ? 'var(--rule-bg)' : 'var(--daily-bg)',
              border:`1px solid ${warn ? 'var(--rule-border)' : 'var(--daily-border)'}`,
              color: warn ? 'var(--rule-text)' : 'var(--daily-text)',
              fontWeight: warn ? 500 : 400,
            }}>
              {d.label}: {d.time}
            </span>
          )
        })}
      </div>
    </header>
  )
}

// ── ScorePanel ────────────────────────────────────────────────────────────────

interface ScoreProps {
  child1Name: string; child2Name: string
  child1Points: number; child2Points: number
  rewards?: Array<{ id: number; name: string; pointsCost: number; emoji: string }>
}

export function ScorePanel({ child1Name, child2Name, child1Points, child2Points, rewards = [] }: ScoreProps) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
      <PersonScore name={child1Name} points={child1Points} color="child1" />
      <PersonScore name={child2Name} points={child2Points} color="child2" />

      {rewards.length > 0 && (
        <div style={{
          gridColumn:'1 / -1', background:'var(--surface)',
          border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'13px 17px',
        }}>
          <p style={{ fontSize:11, fontWeight:500, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>
            Prêmios
          </p>
          {rewards.map(r => {
            const barMax = Math.max(r.pointsCost, child1Points, child2Points, 1)
            const c1pct = Math.min(100, (child1Points / barMax) * 100)
            const c2pct = Math.min(100, (child2Points / barMax) * 100)
            const thresh = (r.pointsCost / barMax) * 100
            return (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:15 }}>{r.emoji}</span>
                <span style={{ fontSize:13, flex:1 }}>{r.name}</span>
                <div style={{ width:120, height:6, background:'var(--surface-2)', borderRadius:3, position:'relative', flexShrink:0 }}>
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${c1pct}%`, background:'var(--child1-mid)', borderRadius:3, transition:'width .4s' }} />
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${c2pct}%`, background:'var(--child2-mid)', borderRadius:3, opacity:0.55, transition:'width .4s' }} />
                  <div style={{ position:'absolute', left:`${thresh}%`, top:-2, bottom:-2, width:2, background:'var(--text-hint)', borderRadius:1 }} />
                </div>
                <span style={{ fontSize:12, color:'var(--text-hint)', minWidth:38, textAlign:'right' }}>{r.pointsCost} pts</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function PersonScoreCards({ child1Name, child2Name, child1Points, child2Points }: { child1Name: string; child2Name: string; child1Points: number; child2Points: number }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
      <PersonScore name={child1Name} points={child1Points} color="child1" />
      <PersonScore name={child2Name} points={child2Points} color="child2" />
    </div>
  )
}

export function RewardsPanel({ child1Points, child2Points, rewards }: { child1Points: number; child2Points: number; rewards: Array<{ id: number; name: string; pointsCost: number; emoji: string }> }) {
  return (
    <>
      {rewards.length > 0 && (
        <div style={{
          background:'var(--surface)',
          border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'13px 17px', marginBottom:20
        }}>
          <p style={{ fontSize:11, fontWeight:500, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>
            Prêmios
          </p>
          {rewards.map(r => {
            const barMax = Math.max(r.pointsCost, child1Points, child2Points, 1)
            const c1pct = Math.min(100, (child1Points / barMax) * 100)
            const c2pct = Math.min(100, (child2Points / barMax) * 100)
            const thresh = (r.pointsCost / barMax) * 100
            return (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:15 }}>{r.emoji}</span>
                <span style={{ fontSize:13, flex:1 }}>{r.name}</span>
                <div style={{ width:120, height:6, background:'var(--surface-2)', borderRadius:3, position:'relative', flexShrink:0 }}>
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${c1pct}%`, background:'var(--child1-mid)', borderRadius:3, transition:'width .4s' }} />
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${c2pct}%`, background:'var(--child2-mid)', borderRadius:3, opacity:0.55, transition:'width .4s' }} />
                  <div style={{ position:'absolute', left:`${thresh}%`, top:-2, bottom:-2, width:2, background:'var(--text-hint)', borderRadius:1 }} />
                </div>
                <span style={{ fontSize:12, color:'var(--text-hint)', minWidth:38, textAlign:'right' }}>{r.pointsCost} pts</span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function PersonScore({ name, points, color }: { name: string; points: number; color: 'child1'|'child2' }) {
  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--radius-lg)', padding:'15px 18px',
      textAlign:'center', borderTop:`4px solid var(--${color}-strong)`,
    }}>
      <div style={{
        width:38, height:38, borderRadius:'50%', margin:'0 auto 7px',
        background:`var(--${color}-light)`,
        border:`2px solid var(--${color}-strong)`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:12, fontWeight:500, color:`var(--${color}-dark)`,
      }}>
        {name.slice(0,2).toUpperCase()}
      </div>
      <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:3 }}>{name}</p>
      <p style={{
        fontSize:38, fontWeight:600, fontFamily:'var(--font-display)',
        color:`var(--${color}-strong)`, lineHeight:1, animation:'pop .3s ease',
      }}>{points}</p>
      <p style={{ fontSize:11, color:'var(--text-hint)', marginTop:2 }}>Pontos essa semana</p>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

export function Legend() {
 const types = [
    { color:'var(--daily-border)', label:'Diária (+1 ponto)' },
    { color:'var(--weekly-border)', label:'Semanal (+3 pontos)' },
    { color:'var(--joint-border)', label:'Conjunta (juntos)' },
    { color:'var(--rule-border)', label:'Regra da casa' },
 ]
  const consequences = [
    { emoji:'⭐', label:'Feito sem lembrete', value:'+1 bônus' },
    { emoji:'🚀', label:'Tarefa de casa feita proativamente', value:'+1 ponto' },
    { emoji:'✨', label:'Comportamento alinhado com nossos valores', value:'+1 ponto' },
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'13px 15px' }}>
        <p style={{ fontSize:11, fontWeight:500, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:9 }}>Tipos de tarefas</p>
        {types.map(t => (
          <div key={t.label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <div style={{ width:9, height:9, borderRadius:'50%', background:t.color }} />
            <span style={{ fontSize:13 }}>{t.label}</span>
          </div>
        ))}
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'13px 15px' }}>
        <p style={{ fontSize:11, fontWeight:500, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:9 }}>Bonus & consequências</p>
        {consequences.map(c => (
          <div key={c.label} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
            <span style={{ fontSize:13, width:17, textAlign:'center', flexShrink:0 }}>{c.emoji}</span>
            <span style={{ fontSize:12, color:'var(--text-secondary)', flex:1 }}>{c.label}</span>
            <span style={{ fontSize:12, fontWeight:500, color: c.value.startsWith('+') ? 'var(--weekly-text)' : '#A32D2D' }}>{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
