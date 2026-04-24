import { useState, useEffect } from 'react'
import { boardApi } from '../api/client'
import type { Task, Reward, TaskType, TaskFrequency, Assignee, FamilyConfig } from '../types'

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'8px 11px',
  border:'1px solid var(--border-strong)', borderRadius:'var(--radius-sm)',
  fontSize:14, fontFamily:'var(--font-body)',
  background:'var(--surface)', color:'var(--text-primary)', outline:'none',
}
const labelStyle: React.CSSProperties = {
  fontSize:12, fontWeight:500, color:'var(--text-secondary)', display:'block', marginBottom:4,
}

const TYPE_OPTIONS = [
  { value: 'DAILY', label: 'Diária' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'JOINT', label: 'Conjunta' },
  { value: 'RULE', label: 'Regra' },
]
const ASSIGNEE_OPTIONS = [
  { value: 'UNASSIGNED', label: 'Não atribuída' },
  { value: 'CHILD1', label: 'Filho 1' },
  { value: 'CHILD2', label: 'Filho 2' },
  { value: 'BOTH', label: 'Ambos' },
]
const FREQ_OPTIONS = [
  { value: 'DAILY', label: 'Diária' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'BIWEEKLY', label: 'Quinzenal' },
  { value: 'MONTHLY', label: 'Mensal' },
]
const TYPE_LABEL: Record<TaskType, string> = {
  DAILY: 'diária', WEEKLY: 'semanal', JOINT: 'conjunta', RULE: 'regra',
}
const FREQ_LABEL: Record<TaskFrequency, string> = {
  DAILY: 'diária', WEEKLY: 'semanal', BIWEEKLY: 'quinzenal', MONTHLY: 'mensal',
}
const ASSIGNEE_LABEL: Record<Assignee, string> = {
  UNASSIGNED: 'não atribuída', CHILD1: 'criança 1', CHILD2: 'criança 2', BOTH: 'ambos',
}
const TYPE_COLOR: Record<TaskType, string> = {
  DAILY:'var(--daily-border)', WEEKLY:'var(--weekly-border)',
  JOINT:'var(--joint-border)', RULE:'var(--rule-border)',
}

const emptyConfig: FamilyConfig = { child1Name:'', child2Name:'', child1Phone:'', child2Phone:'' }

export function AdminPage() {
  const [tab, setTab] = useState<'tasks'|'rewards'|'config'>('tasks')
  const [tasks, setTasks] = useState<Task[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [config, setConfig] = useState<FamilyConfig>(emptyConfig)
  const [configDirty, setConfigDirty] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string|null>(null)

  const [form, setForm] = useState({
    name:'', description:'', type:'DAILY' as TaskType,
    frequency:'DAILY' as TaskFrequency, defaultAssignee:'UNASSIGNED' as Assignee,
    points:1, timeWindow:'', deadline:'', deadlineDate:'',
  })

  useEffect(() => {
    boardApi.listTasks().then(setTasks).catch(() => {})
    boardApi.listRewards().then(setRewards).catch(() => {})
    boardApi.getConfig().then(setConfig).catch(() => {})
  }, [])

  function showFlash(msg: string) {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2500)
  }

  async function saveTask() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const t = await boardApi.createTask({
        ...form,
        deadlineDate: form.deadlineDate || null,
      })
      setTasks(p => [...p, t])
      setForm({ name:'', description:'', type:'DAILY', frequency:'DAILY', defaultAssignee:'UNASSIGNED', points:1, timeWindow:'', deadline:'', deadlineDate:'' })
      setShowForm(false)
      showFlash('Tarefa criada!')
    } catch { alert('Erro ao salvar a tarefa.') }
    finally { setSaving(false) }
  }

  async function saveConfig() {
    setSaving(true)
    try {
      const updated = await boardApi.updateConfig(config)
      setConfig(updated)
      setConfigDirty(false)
      showFlash('Configurações atualizadas!')
    } catch { alert('Erro ao atualizar as configurações.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:'22px 14px 80px' }}>
      <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:500, marginBottom:4 }}>Administração</h1>
      <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:22 }}>Gerencie tarefas, recompensas e configurações da família</p>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:20, border:'1px solid var(--border)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
        {(['tasks','rewards','config'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:'10px 0', fontSize:13,
            background: tab === t ? 'var(--text-primary)' : 'var(--surface)',
            color: tab === t ? 'var(--bg)' : 'var(--text-secondary)',
            fontFamily:'var(--font-body)', fontWeight: tab === t ? 500 : 400,
            border:'none', transition:'all .15s',
          }}>
            {t === 'tasks' ? `Tarefas (${tasks.length})` : t === 'rewards' ? `Recompensas (${rewards.length})` : 'Família'}
          </button>
        ))}
      </div>

      {flash && (
        <div style={{
          background:'var(--weekly-bg)', border:'1px solid var(--weekly-border)',
          color:'var(--weekly-text)', borderRadius:'var(--radius-md)',
          padding:'9px 15px', marginBottom:14, fontSize:14, fontWeight:500,
          animation:'fadeIn .2s ease',
        }}>✓ {flash}</div>
      )}

      {/* ── Tasks ── */}
      {tab === 'tasks' && (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button onClick={() => setShowForm(v => !v)} style={{
              padding:'7px 17px', borderRadius:'var(--radius-md)',
              background: showForm ? 'var(--surface-2)' : 'var(--text-primary)',
              color: showForm ? 'var(--text-primary)' : 'var(--bg)',
              border:'1px solid var(--border-strong)', fontSize:13, fontWeight:500,
            }}>
              {showForm ? '✕ Cancelar' : '+ Nova tarefa'}
            </button>
          </div>

          {showForm && (
            <div style={{
              background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:'var(--radius-lg)', padding:'18px', marginBottom:18,
              animation:'slideIn .2s ease',
            }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:17, marginBottom:15 }}>Nova tarefa</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Nome *</label>
                  <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name:e.target.value }))} placeholder="ex.: Regar as plantas" />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Descrição</label>
                  <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))} placeholder="Detalhes opcionais" />
                </div>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type:e.target.value as TaskType }))}>
                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Frequência</label>
                  <select style={inputStyle} value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency:e.target.value as TaskFrequency }))}>
                    {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Responsável padrão</label>
                  <select style={inputStyle} value={form.defaultAssignee} onChange={e => setForm(f => ({ ...f, defaultAssignee:e.target.value as Assignee }))}>
                    {ASSIGNEE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Pontos</label>
                  <input style={inputStyle} type="number" min={1} max={10} value={form.points} onChange={e => setForm(f => ({ ...f, points:Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={labelStyle}>Prazo (texto)</label>
                  <input style={inputStyle} value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline:e.target.value }))} placeholder="ex.: até 19:30" />
                </div>
                <div>
                  <label style={labelStyle}>Janela de horário</label>
                  <input style={inputStyle} value={form.timeWindow} onChange={e => setForm(f => ({ ...f, timeWindow:e.target.value }))} placeholder="ex.: 06:30 – 07:30" />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Data e hora limite (deadline) 📅</label>
                  <input
                    style={inputStyle} type="datetime-local"
                    value={form.deadlineDate}
                    onChange={e => setForm(f => ({ ...f, deadlineDate:e.target.value }))}
                  />
                  <p style={{ fontSize:11, color:'var(--text-hint)', marginTop:4 }}>
                    Se preenchida, envia notificação WhatsApp quando a tarefa não for concluída até esta data/hora (requer telefone cadastrado em "Família").
                  </p>
                </div>
              </div>
              <button onClick={saveTask} disabled={saving || !form.name.trim()} style={{
                marginTop:16, padding:'9px 22px', borderRadius:'var(--radius-md)',
                background: form.name.trim() ? 'var(--child1-strong)' : 'var(--surface-2)',
                color: form.name.trim() ? '#fff' : 'var(--text-hint)',
                border:'none', fontSize:13, fontWeight:500, fontFamily:'var(--font-body)',
              }}>
                {saving ? 'Salvando…' : 'Salvar tarefa'}
              </button>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {tasks.map(t => (
              <div key={t.id} style={{
                background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:'var(--radius-md)', padding:'11px 15px',
                display:'flex', alignItems:'center', gap:11,
              }}>
                <div style={{ width:9, height:9, borderRadius:'50%', background:TYPE_COLOR[t.type], flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:500 }}>{t.name}</p>
                  {t.description && <p style={{ fontSize:11, color:'var(--text-secondary)', marginTop:1 }}>{t.description}</p>}
                  <p style={{ fontSize:11, color:'var(--text-hint)', marginTop:2 }}>
                    {TYPE_LABEL[t.type]} · {FREQ_LABEL[t.frequency]} · {t.points} ponto{t.points !== 1 ? 's' : ''}
                    {t.deadline ? ` · ${t.deadline}` : ''}
                    {t.deadlineDate ? ` · prazo: ${new Date(t.deadlineDate).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' })}` : ''}
                    {t.defaultAssignee !== 'UNASSIGNED' ? ` · padrão: ${ASSIGNEE_LABEL[t.defaultAssignee]}` : ''}
                  </p>
                </div>
                <span style={{
                  fontSize:11, padding:'2px 8px', borderRadius:10,
                  background: t.active ? 'var(--weekly-bg)' : 'var(--surface-2)',
                  color: t.active ? 'var(--weekly-text)' : 'var(--text-hint)',
                  border:`1px solid ${t.active ? 'var(--weekly-border)' : 'var(--border)'}`,
                }}>{t.active ? 'ativa' : 'inativa'}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Rewards ── */}
      {tab === 'rewards' && (
        <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
          {rewards.map(r => (
            <div key={r.id} style={{
              background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:'var(--radius-md)', padding:'13px 15px',
              display:'flex', alignItems:'center', gap:11,
            }}>
              <span style={{ fontSize:22 }}>{r.emoji}</span>
              <span style={{ fontSize:13, fontWeight:500, flex:1 }}>{r.name}</span>
              <span style={{
                background:'var(--daily-bg)', border:'1px solid var(--daily-border)',
                borderRadius:10, padding:'3px 10px', fontSize:13, fontWeight:500, color:'var(--daily-text)',
              }}>{r.pointsCost} pontos</span>
            </div>
          ))}
          <p style={{ fontSize:12, color:'var(--text-hint)', textAlign:'center', marginTop:8 }}>
            Edição de recompensas via API — interface em breve.
          </p>
        </div>
      )}

      {/* ── Family config ── */}
      {tab === 'config' && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:16 }}>Nomes das crianças</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:24 }}>
            <div>
              <label style={labelStyle}>Nome da criança 1</label>
              <input style={{ ...inputStyle, borderColor: configDirty ? 'var(--child1-strong)' : undefined }}
                value={config.child1Name}
                onChange={e => { setConfig(c => ({ ...c, child1Name:e.target.value })); setConfigDirty(true) }}
              />
            </div>
            <div>
              <label style={labelStyle}>Nome da criança 2</label>
              <input style={{ ...inputStyle, borderColor: configDirty ? 'var(--child2-strong)' : undefined }}
                value={config.child2Name}
                onChange={e => { setConfig(c => ({ ...c, child2Name:e.target.value })); setConfigDirty(true) }}
              />
            </div>
          </div>

          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:6 }}>WhatsApp (Callmebot) 📱</h3>
          <p style={{ fontSize:12, color:'var(--text-hint)', marginBottom:14, lineHeight:1.6 }}>
            Para ativar notificações gratuitas via WhatsApp, cada criança precisa:<br/>
            1. Adicionar o número <strong>+34 644 61 79 98</strong> nos contatos<br/>
            2. Enviar a mensagem: <em>"I allow callmebot to send me messages"</em><br/>
            3. Receber um <strong>apikey</strong> de resposta<br/>
            4. Preencher abaixo no formato: <code>5554999990000:APIKEY</code>
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
            <div>
              <label style={labelStyle}>Telefone criança 1 (phone:apikey)</label>
              <input
                style={{ ...inputStyle, borderColor: configDirty ? 'var(--child1-strong)' : undefined }}
                value={config.child1Phone ?? ''}
                onChange={e => { setConfig(c => ({ ...c, child1Phone:e.target.value })); setConfigDirty(true) }}
                placeholder="5554999990000:123456"
              />
            </div>
            <div>
              <label style={labelStyle}>Telefone criança 2 (phone:apikey)</label>
              <input
                style={{ ...inputStyle, borderColor: configDirty ? 'var(--child2-strong)' : undefined }}
                value={config.child2Phone ?? ''}
                onChange={e => { setConfig(c => ({ ...c, child2Phone:e.target.value })); setConfigDirty(true) }}
                placeholder="5554999990000:123456"
              />
            </div>
          </div>

          <button onClick={saveConfig} disabled={saving || !configDirty} style={{
            padding:'9px 22px', borderRadius:'var(--radius-md)',
            background: configDirty ? 'var(--text-primary)' : 'var(--surface-2)',
            color: configDirty ? 'var(--bg)' : 'var(--text-hint)',
            border:'none', fontSize:13, fontWeight:500, fontFamily:'var(--font-body)',
          }}>
            {saving ? 'Salvando…' : 'Salvar configurações'}
          </button>
          <p style={{ fontSize:12, color:'var(--text-hint)', marginTop:12 }}>
            As configurações são salvas no banco de dados e usadas em todo o app.
          </p>
        </div>
      )}
    </div>
  )
}
