import { useEffect, useState } from 'react'
import { pushApi, type ReminderChild } from '../api/client'
import { currentSubscription, disablePush, enablePush, isIosOutsideApp, pushSupported, savedChild } from '../lib/push'

interface Props {
  child1Name: string
  child2Name: string
}

/**
 * "Lembretes neste celular": each child turns on, on their own phone, the noon and evening reminders
 * of the tasks still open that day.
 */
export function PushSettings({ child1Name, child2Name }: Props) {
  const [child, setChild] = useState<ReminderChild | null>(savedChild())
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const supported = pushSupported()
  const nameOf = (value: ReminderChild) => (value === 'CHILD1' ? child1Name : child2Name)

  useEffect(() => {
    if (!supported) return
    currentSubscription().then(subscription => setActive(subscription !== null && savedChild() !== null)).catch(() => setActive(false))
  }, [supported])

  async function run(action: () => Promise<string>) {
    setBusy(true)
    setMessage(null)
    try {
      setMessage({ text: await action() })
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Não foi possível concluir.', error: true })
    } finally {
      setBusy(false)
    }
  }

  const enable = (value: ReminderChild) =>
    run(async () => {
      await enablePush(value)
      setChild(value)
      setActive(true)
      return `Pronto! Este celular vai receber os lembretes de ${nameOf(value)} ao meio-dia e às 19h.`
    })

  const disable = () =>
    run(async () => {
      await disablePush()
      setActive(false)
      setChild(null)
      return 'Lembretes desligados neste celular.'
    })

  const test = () =>
    run(async () => {
      const subscription = await currentSubscription()
      if (!subscription) throw new Error('Este celular não está inscrito.')
      const { result } = await pushApi.test(subscription.endpoint)
      if (result !== 'SENT') throw new Error('O aviso de teste não foi entregue. Desative e ative de novo.')
      return 'Aviso de teste enviado.'
    })

  return (
    <section
      aria-label="Lembretes neste celular"
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        padding: '14px 16px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, marginBottom: 2 }}>🔔 Lembretes neste celular</h2>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Ao meio-dia e às 19h, um aviso com as tarefas que ainda faltam no dia.
        </p>
      </div>

      {!supported && (
        <p style={{ fontSize: 13 }}>
          {isIosOutsideApp()
            ? 'No iPhone, instale o app primeiro: Compartilhar → Adicionar à Tela de Início, e abra por lá.'
            : 'Este navegador não recebe notificações.'}
        </p>
      )}

      {supported && !active && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 13 }}>Este celular é de:</span>
          {(['CHILD1', 'CHILD2'] as const).map(value => (
            <button key={value} type="button" disabled={busy} onClick={() => enable(value)} style={buttonStyle(true)}>
              {nameOf(value)}
            </button>
          ))}
        </div>
      )}

      {supported && active && child && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 13 }}>
            Ativado para <strong>{nameOf(child)}</strong>.
          </span>
          <button type="button" disabled={busy} onClick={test} style={buttonStyle(false)}>
            Enviar teste
          </button>
          <button type="button" disabled={busy} onClick={disable} style={buttonStyle(false)}>
            Desativar
          </button>
        </div>
      )}

      {message && (
        <p role={message.error ? 'alert' : 'status'} style={{ fontSize: 12, color: message.error ? 'var(--danger, #b42318)' : 'var(--text-secondary)' }}>
          {message.text}
        </p>
      )}
    </section>
  )
}

const buttonStyle = (primary: boolean) => ({
  padding: '7px 14px', borderRadius: 'var(--radius-md)', fontSize: 13, fontFamily: 'var(--font-body)',
  border: primary ? 'none' : '1px solid var(--border)',
  background: primary ? 'var(--text-primary)' : 'var(--surface)',
  color: primary ? 'var(--bg)' : 'var(--text-primary)',
})
