import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PushSettings } from '../components/PushSettings'
import * as push from '../lib/push'
import { pushApi } from '../api/client'

const subscription = { endpoint: 'https://push/1' } as PushSubscription

describe('PushSettings', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    vi.spyOn(push, 'pushSupported').mockReturnValue(true)
    vi.spyOn(push, 'currentSubscription').mockResolvedValue(null)
  })

  it('offers each child to turn the reminders on for this phone', async () => {
    const enable = vi.spyOn(push, 'enablePush').mockResolvedValue(subscription)
    render(<PushSettings child1Name="Clara" child2Name="Bernardo" />)

    fireEvent.click(screen.getByRole('button', { name: 'Bernardo' }))

    await waitFor(() => expect(enable).toHaveBeenCalledWith('CHILD2'))
    expect(await screen.findByRole('status')).toHaveTextContent('lembretes de Bernardo ao meio-dia e às 19h')
    expect(screen.getByText('Bernardo', { selector: 'strong' })).toBeInTheDocument()
  })

  it('explains why the reminders could not be turned on', async () => {
    vi.spyOn(push, 'enablePush').mockRejectedValue(new Error('Permita as notificações para este site nas configurações do celular.'))
    render(<PushSettings child1Name="Clara" child2Name="Bernardo" />)

    fireEvent.click(screen.getByRole('button', { name: 'Clara' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Permita as notificações')
  })

  it('shows whose reminders are on, sends a test and turns them off', async () => {
    localStorage.setItem('hometask.push.child', 'CHILD1')
    vi.spyOn(push, 'currentSubscription').mockResolvedValue(subscription)
    const test = vi.spyOn(pushApi, 'test').mockResolvedValue({ result: 'SENT' })
    const disable = vi.spyOn(push, 'disablePush').mockResolvedValue()
    render(<PushSettings child1Name="Clara" child2Name="Bernardo" />)

    expect(await screen.findByText('Clara', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar teste' }))
    await waitFor(() => expect(test).toHaveBeenCalledWith('https://push/1'))
    expect(await screen.findByRole('status')).toHaveTextContent('Aviso de teste enviado.')

    fireEvent.click(screen.getByRole('button', { name: 'Desativar' }))
    await waitFor(() => expect(disable).toHaveBeenCalled())
    expect(await screen.findByRole('button', { name: 'Clara' })).toBeInTheDocument()
  })

  it('tells iPhone users to install the app first', () => {
    vi.spyOn(push, 'pushSupported').mockReturnValue(false)
    vi.spyOn(push, 'isIosOutsideApp').mockReturnValue(true)
    render(<PushSettings child1Name="Clara" child2Name="Bernardo" />)

    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeInTheDocument()
  })
})

describe('urlBase64ToUint8Array', () => {
  it('turns the base64url key into its bytes', () => {
    expect(Array.from(push.urlBase64ToUint8Array('AQID_-8'))).toEqual([1, 2, 3, 255, 239])
  })
})
