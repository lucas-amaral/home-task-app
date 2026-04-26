import { useState, useEffect } from 'react'
import { boardApi } from '../api/client'
import type { Task, Reward, TaskType, TaskFrequency, Assignee, FamilyConfig } from '../types'

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'8px 11px',
  border:'1px solid var(--border-strong)', borderRadius:'var(--radius-sm)',
  fontSize:14, fontFamily:'var(--font-body)',
  background:'var(--surface)', color:'var(--text-primary)', outline:'none',
}
const labelStyle: React.CSSProperties = {
  fontSize:12, fontWeight:500, color:'var(--text-secondary)', display:'block', marginBottom:4,
}

// ── Option lists ──────────────────────────────────────────────────────────────

const TYPE_OPTIONS    = [{ value:'DAILY', label:'Diária' }, { value:'WEEKLY', label:'Semanal' }, { value:'JOINT', label:'Conjunta' }, { value:'RULE', label:'Regra' }]
const FREQ_OPTIONS    = [{ value:'DAILY', label:'Diária' }, { value:'WEEKLY', label:'Semanal' }, { value:'BIWEEKLY', label:'Quinzenal' }, { value:'MONTHLY', label:'Mensal' }]
const ASSIGNEE_OPTIONS= [{ value:'UNASSIGNED', label:'Não atribuída' }, { value:'CHILD1', label:'Filho 1' }, { value:'CHILD2', label:'Filho 2' }, { value:'BOTH', label:'Ambos' }]

const TYPE_LABEL: Record<TaskType, string>     = { DAILY:'diária', WEEKLY:'semanal', JOINT:'conjunta', RULE:'regra' }
const FREQ_LABEL: Record<TaskFrequency, string> = { DAILY:'diária', WEEKLY:'semanal', BIWEEKLY:'quinzenal', MONTHLY:'mensal' }
const ASSIGNEE_LABEL: Record<Assignee, string>  = { UNASSIGNED:'não atribuída', CHILD1:'filho 1', CHILD2:'filho 2', BOTH:'ambos' }
const TYPE_COLOR: Record<TaskType, string>      = { DAILY:'var(--daily-border)', WEEKLY:'var(--weekly-border)', JOINT:'var(--joint-border)', RULE:'var(--rule-border)' }

// ── Blank form ────────────────────────────────────────────────────────────────

const BLANK_FORM = {
  name:'', description:'', type:'DAILY' as TaskType,
  frequency:'DAILY' as TaskFrequency, defaultAssignee:'UNASSIGNED' as Assignee,
  points:1, timeWindow:'', deadline:'', sortOrder:0, active:true,
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminPage() {
  const [tab, setTab]               = useState<'tasks'|'rewards'|'config'>('tasks')
  const [tasks, setTasks]           = useState<Task[]>([])
  const [rewards, setRewards]       = useState<Reward[]>([])
  const [config, setConfig]         = useState<FamilyConfig>({ child1Name:'', child2Name:'' })
  const [configDirty, setConfigDirty] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [flash, setFlash]           = useState<{ msg: string; error?: boolean } | null>(null)

  // Form state — null = hidden, populated = create/edit mode
  const [formMode, setFormMode]     = useState<'create'|'edit' | null>(null)
  const [editingId, setEditingId]   = useState<number | null>(null)
  const [form, setForm]             = useState(BLANK_FORM)

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  useEffect(() => {
    boardApi.listTasks().then(setTasks).catch(() => {})
    boardApi.listRewards().then(setRewards).catch(() => {})
    boardApi.getConfig().then(setConfig).catch(() => {})
  }, [])

  function showFlash(msg: string, error = false) {
    setFlash({ msg, error })
    setTimeout(() => setFlash(null), 2800)
  }

  // ── Form helpers ────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(BLANK_FORM)
    setEditingId(null)
    setFormMode('create')
  }

  function openEdit(t: Task) {
    setForm({
      name: t.name, description: t.description,
      type: t.type, frequency: t.frequency,
      defaultAssignee: t.defaultAssignee,
      points: t.points, timeWindow: t.timeWindow,
      deadline: t.deadline, sortOrder: t.sortOrder, active: t.active,
    })
    setEditingId(t.id)
    setFormMode('edit')
    // Scroll to top so the form is visible
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setFormMode(null)
    setEditingId(null)
    setForm(BLANK_FORM)
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async function saveTask() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (formMode === 'edit' && editingId !== null) {
        const updated = await boardApi.updateTask(editingId, { ...form })
        setTasks(p => p.map(t => t.id === editingId ? updated : t))
        showFlash('Tarefa atualizada!')
      } else {
        const created = await boardApi.createTask({ ...form })
        setTasks(p => [...p, created])
        showFlash('Tarefa criada!')
      }
      closeForm()
    } catch {
      showFlash('Erro ao salvar a tarefa.', true)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete(id: number) {
    setSaving(true)
    try {
      await boardApi.deleteTask(id)
      setTasks(p => p.filter(t => t.id !== id))
      showFlash('Tarefa removida.')
    } catch {
      showFlash('Erro ao remover a tarefa.', true)
    } finally {
      setSaving(false)
      setConfirmDeleteId(null)
    }
  }

  async function saveConfig() {
    setSaving(true)
    try {
      const updated = await boardApi.updateConfig(config.child1Name, config.child2Name)
      setConfig(updated)
      setConfigDirty(false)
      showFlash('Nomes atualizados!')
    } catch {
      showFlash('Erro ao atualizar os nomes.', true)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:'22px 14px 80px' }}>
      <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:500, marginBottom:4 }}>Administração</h1>
      <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:22 }}>
        Gerencie tarefas, recompensas e configurações da família
      </p>

      {/* Tabs */}
      <div style={{ display:'flex', marginBottom:20, border:'1px solid var(--border)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
        {(['tasks','rewards','config'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); closeForm() }} style={{
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

      {/* Flash message */}
      {flash && (
        <div style={{
          borderRadius:'var(--radius-md)', padding:'9px 15px', marginBottom:14,
          fontSize:14, fontWeight:500, animation:'fadeIn .2s ease',
          background: flash.error ? '#FCEBEB' : 'var(--weekly-bg)',
          border: `1px solid ${flash.error ? '#F7C1C1' : 'var(--weekly-border)'}`,
          color: flash.error ? '#A32D2D' : 'var(--weekly-text)',
        }}>
          {flash.error ? '✕' : '✓'} {flash.msg}
        </div>
      )}

      {/* ── Tasks tab ── */}
      {tab === 'tasks' && (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button
              onClick={formMode === 'create' ? closeForm : openCreate}
              style={{
                padding:'7px 17px', borderRadius:'var(--radius-md)',
                background: formMode === 'create' ? 'var(--surface-2)' : 'var(--text-primary)',
                color: formMode === 'create' ? 'var(--text-primary)' : 'var(--bg)',
                border:'1px solid var(--border-strong)', fontSize:13, fontWeight:500,
              }}
            >
              {formMode === 'create' ? '✕ Cancelar' : '+ Nova tarefa'}
            </button>
          </div>

          {/* Create / Edit form */}
          {formMode !== null && (
            <TaskForm
              mode={formMode}
              form={form}
              setForm={setForm}
              saving={saving}
              onSave={saveTask}
              onCancel={closeForm}
            />
          )}

          {/* Task list */}
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {tasks.length === 0 && (
              <p style={{ textAlign:'center', color:'var(--text-hint)', padding:'32px 0', fontSize:13 }}>
                Nenhuma tarefa cadastrada ainda.
              </p>
            )}
            {tasks.map(t => (
              <TaskRow
                key={t.id}
                task={t}
                isEditing={editingId === t.id}
                confirmingDelete={confirmDeleteId === t.id}
                onEdit={() => editingId === t.id ? closeForm() : openEdit(t)}
                onDeleteRequest={() => setConfirmDeleteId(t.id)}
                onDeleteConfirm={() => confirmDelete(t.id)}
                onDeleteCancel={() => setConfirmDeleteId(null)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Rewards tab ── */}
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

      {/* ── Family config tab ── */}
      {tab === 'config' && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, marginBottom:16 }}>Nomes das crianças</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
            <div>
              <label style={labelStyle}>Nome da criança 1</label>
              <input
                style={{ ...inputStyle, borderColor: configDirty ? 'var(--child1-strong)' : undefined }}
                value={config.child1Name}
                onChange={e => { setConfig(c => ({ ...c, child1Name:e.target.value })); setConfigDirty(true) }}
              />
            </div>
            <div>
              <label style={labelStyle}>Nome da criança 2</label>
              <input
                style={{ ...inputStyle, borderColor: configDirty ? 'var(--child2-strong)' : undefined }}
                value={config.child2Name}
                onChange={e => { setConfig(c => ({ ...c, child2Name:e.target.value })); setConfigDirty(true) }}
              />
            </div>
          </div>
          <button onClick={saveConfig} disabled={saving || !configDirty} style={{
            padding:'9px 22px', borderRadius:'var(--radius-md)',
            background: configDirty ? 'var(--text-primary)' : 'var(--surface-2)',
            color: configDirty ? 'var(--bg)' : 'var(--text-hint)',
            border:'none', fontSize:13, fontWeight:500, fontFamily:'var(--font-body)',
          }}>
            {saving ? 'Salvando…' : 'Salvar nomes'}
          </button>
          <p style={{ fontSize:12, color:'var(--text-hint)', marginTop:12 }}>
            Os nomes são salvos no banco de dados e usados em todo o quadro.
          </p>
        </div>
      )}
    </div>
  )
}

// ── TaskForm (create + edit) ───────────────────────────────────────────────────

type FormState = typeof BLANK_FORM

interface TaskFormProps {
  mode: 'create' | 'edit'
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

function TaskForm({ mode, form, setForm, saving, onSave, onCancel }: TaskFormProps) {
  const accent = mode === 'edit' ? 'var(--child2-strong)' : 'var(--child1-strong)'

  return (
    <div style={{
      background:'var(--surface)',
      border:`1.5px solid ${accent}`,
      borderRadius:'var(--radius-lg)', padding:'18px', marginBottom:18,
      animation:'slideIn .2s ease',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:15 }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:17, color: accent }}>
          {mode === 'edit' ? '✎ Editar tarefa' : 'Nova tarefa'}
        </h3>
        <button onClick={onCancel} style={{
          fontSize:18, color:'var(--text-hint)', background:'none', border:'none', cursor:'pointer',
        }}>✕</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={labelStyle}>Nome *</label>
          <input
            autoFocus={mode === 'create'}
            style={inputStyle} value={form.name}
            onChange={e => setForm(f => ({ ...f, name:e.target.value }))}
            placeholder="ex.: Regar as plantas"
            onKeyDown={e => e.key === 'Enter' && onSave()}
          />
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={labelStyle}>Descrição</label>
          <input style={inputStyle} value={form.description}
            onChange={e => setForm(f => ({ ...f, description:e.target.value }))}
            placeholder="Detalhes opcionais" />
        </div>
        <div>
          <label style={labelStyle}>Tipo</label>
          <select style={inputStyle} value={form.type}
            onChange={e => setForm(f => ({ ...f, type:e.target.value as TaskType }))}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Frequência</label>
          <select style={inputStyle} value={form.frequency}
            onChange={e => setForm(f => ({ ...f, frequency:e.target.value as TaskFrequency }))}>
            {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Responsável padrão</label>
          <select style={inputStyle} value={form.defaultAssignee}
            onChange={e => setForm(f => ({ ...f, defaultAssignee:e.target.value as Assignee }))}>
            {ASSIGNEE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Pontos</label>
          <input style={inputStyle} type="number" min={1} max={10} value={form.points}
            onChange={e => setForm(f => ({ ...f, points:Number(e.target.value) }))} />
        </div>
        <div>
          <label style={labelStyle}>Prazo (HH:mm)</label>
          <input style={inputStyle} value={form.deadline}
            onChange={e => setForm(f => ({ ...f, deadline:e.target.value }))}
            placeholder="ex.: 13:05" />
        </div>
        <div>
          <label style={labelStyle}>Janela de horário</label>
          <input style={inputStyle} value={form.timeWindow}
            onChange={e => setForm(f => ({ ...f, timeWindow:e.target.value }))}
            placeholder="ex.: 06:30 – 07:30" />
        </div>
        {mode === 'edit' && (
          <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:10 }}>
            <input type="checkbox" id="task-active" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active:e.target.checked }))}
              style={{ width:16, height:16 }} />
            <label htmlFor="task-active" style={{ fontSize:13, color:'var(--text-primary)', cursor:'pointer' }}>
              Tarefa ativa (desmarcado = oculta do quadro)
            </label>
          </div>
        )}
      </div>

      <div style={{ display:'flex', gap:10, marginTop:16 }}>
        <button onClick={onCancel} style={{
          padding:'9px 18px', borderRadius:'var(--radius-md)',
          border:'1px solid var(--border)', fontSize:13,
          color:'var(--text-secondary)', background:'var(--surface)',
        }}>Cancelar</button>
        <button onClick={onSave} disabled={saving || !form.name.trim()} style={{
          padding:'9px 22px', borderRadius:'var(--radius-md)',
          background: form.name.trim() ? accent : 'var(--surface-2)',
          color: form.name.trim() ? '#fff' : 'var(--text-hint)',
          border:'none', fontSize:13, fontWeight:500, fontFamily:'var(--font-body)',
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Salvando…' : mode === 'edit' ? 'Atualizar tarefa' : 'Criar tarefa'}
        </button>
      </div>
    </div>
  )
}

// ── TaskRow ────────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task
  isEditing: boolean
  confirmingDelete: boolean
  onEdit: () => void
  onDeleteRequest: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
}

function TaskRow({ task: t, isEditing, confirmingDelete, onEdit, onDeleteRequest, onDeleteConfirm, onDeleteCancel }: TaskRowProps) {
  return (
    <div style={{
      background: isEditing ? 'color-mix(in srgb, var(--child2-light) 40%, white)' : 'var(--surface)',
      border: `1px solid ${isEditing ? 'var(--child2-strong)' : confirmingDelete ? '#F7C1C1' : 'var(--border)'}`,
      borderRadius:'var(--radius-md)',
      transition:'border-color .2s, background .2s',
      overflow:'hidden',
    }}>
      {/* Main row */}
      <div style={{ padding:'11px 15px', display:'flex', alignItems:'center', gap:11 }}>
        <div style={{ width:9, height:9, borderRadius:'50%', background:TYPE_COLOR[t.type], flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{
            fontSize:13, fontWeight:500,
            color: t.active ? 'var(--text-primary)' : 'var(--text-hint)',
            textDecoration: t.active ? 'none' : 'line-through',
          }}>{t.name}</p>
          {t.description && (
            <p style={{ fontSize:11, color:'var(--text-secondary)', marginTop:1 }}>{t.description}</p>
          )}
          <p style={{ fontSize:11, color:'var(--text-hint)', marginTop:2 }}>
            {TYPE_LABEL[t.type]} · {FREQ_LABEL[t.frequency]} · {t.points} ponto{t.points !== 1 ? 's' : ''}
            {t.deadline ? ` · prazo: ${t.deadline}` : ''}
            {t.defaultAssignee !== 'UNASSIGNED' ? ` · padrão: ${ASSIGNEE_LABEL[t.defaultAssignee]}` : ''}
          </p>
        </div>

        {/* Status badge */}
        <span style={{
          fontSize:11, padding:'2px 8px', borderRadius:10, flexShrink:0,
          background: t.active ? 'var(--weekly-bg)' : 'var(--surface-2)',
          color: t.active ? 'var(--weekly-text)' : 'var(--text-hint)',
          border:`1px solid ${t.active ? 'var(--weekly-border)' : 'var(--border)'}`,
        }}>{t.active ? 'ativa' : 'inativa'}</span>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          <button
            onClick={onEdit}
            title={isEditing ? 'Fechar edição' : 'Editar tarefa'}
            style={{
              width:28, height:28, borderRadius:'var(--radius-sm)',
              border:`1px solid ${isEditing ? 'var(--child2-strong)' : 'var(--border)'}`,
              background: isEditing ? 'var(--child2-light)' : 'transparent',
              color: isEditing ? 'var(--child2-strong)' : 'var(--text-secondary)',
              fontSize:13, cursor:'pointer', transition:'all .15s',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}
            onMouseEnter={e => {
              if (!isEditing) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--child2-strong)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--child2-strong)'
              }
            }}
            onMouseLeave={e => {
              if (!isEditing) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
              }
            }}
          >✎</button>
          <button
            onClick={onDeleteRequest}
            title="Excluir tarefa"
            style={{
              width:28, height:28, borderRadius:'var(--radius-sm)',
              border:`1px solid ${confirmingDelete ? '#F7C1C1' : 'var(--border)'}`,
              background: confirmingDelete ? '#FCEBEB' : 'transparent',
              color: confirmingDelete ? '#A32D2D' : 'var(--text-secondary)',
              fontSize:13, cursor:'pointer', transition:'all .15s',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#F7C1C1'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#A32D2D'
            }}
            onMouseLeave={e => {
              if (!confirmingDelete) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
              }
            }}
          >🗑</button>
        </div>
      </div>

      {/* Delete confirmation bar */}
      {confirmingDelete && (
        <div style={{
          padding:'10px 15px', borderTop:'1px solid #F7C1C1',
          background:'#FFF5F5', display:'flex', alignItems:'center',
          justifyContent:'space-between', gap:10, animation:'fadeIn .15s ease',
        }}>
          <span style={{ fontSize:12, color:'#A32D2D' }}>
            Remover <strong>{t.name}</strong>? Os históricos são mantidos.
          </span>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button onClick={onDeleteCancel} style={{
              padding:'4px 12px', borderRadius:'var(--radius-sm)',
              border:'1px solid #F7C1C1', background:'transparent',
              color:'#A32D2D', fontSize:12, cursor:'pointer',
            }}>Cancelar</button>
            <button onClick={onDeleteConfirm} style={{
              padding:'4px 12px', borderRadius:'var(--radius-sm)',
              background:'#A32D2D', color:'white', border:'none',
              fontSize:12, fontWeight:500, cursor:'pointer',
            }}>Confirmar exclusão</button>
          </div>
        </div>
      )}
    </div>
  )
}
