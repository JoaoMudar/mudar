'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import {
  createUsuario,
  updateUsuario,
  resetSenha,
  toggleUsuarioAtivo,
  type UserPayload,
} from './actions'

type Role = 'admin' | 'chefia' | 'gerencia' | 'colaborador'

interface UserRow {
  id: string
  username: string
  display_name: string
  role: Role
  active: boolean
  created_at: string
  last_seen_at: string | null
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  chefia: 'Chefia',
  gerencia: 'Gerência',
  colaborador: 'Colaborador',
}

const ROLE_OPTIONS: Role[] = ['admin', 'chefia', 'gerencia', 'colaborador']

function emptyForm(): UserPayload {
  return { username: '', display_name: '', password: '', role: 'colaborador' }
}

interface ToastState { message: string; type: ToastType }

export default function UsuariosManager({ initialUsers }: { initialUsers: UserRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'list' | 'form' | 'reset-pw'>('list')
  const [editingItem, setEditingItem] = useState<UserRow | null>(null)
  const [form, setForm] = useState<UserPayload>(emptyForm())
  const [newPassword, setNewPassword] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function showToast(message: string, type: ToastType) { setToast({ message, type }) }

  function openCreate() {
    setEditingItem(null)
    setForm(emptyForm())
    setMode('form')
  }

  function openEdit(item: UserRow) {
    setEditingItem(item)
    setForm({
      username: item.username,
      display_name: item.display_name,
      role: item.role,
    })
    setMode('form')
  }

  function openResetPw(item: UserRow) {
    setEditingItem(item)
    setNewPassword('')
    setMode('reset-pw')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const result = editingItem
        ? await updateUsuario(editingItem.id, {
            username: form.username,
            display_name: form.display_name,
            role: form.role,
          })
        : await createUsuario(form)
      if (result.error) { showToast(`Erro: ${result.error}`, 'error'); return }
      showToast(editingItem ? 'Usuário atualizado!' : 'Usuário cadastrado!', 'success')
      setMode('list')
      startTransition(() => router.refresh())
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !editingItem) return
    setSubmitting(true)
    try {
      const result = await resetSenha(editingItem.id, newPassword)
      if (result.error) { showToast(`Erro: ${result.error}`, 'error'); return }
      showToast('Senha redefinida!', 'success')
      setMode('list')
    } finally {
      setSubmitting(false)
    }
  }

  function handleToggleActive(item: UserRow) {
    if (!window.confirm(`Deseja ${item.active ? 'desativar' : 'ativar'} "${item.display_name}"?`)) return
    startTransition(async () => {
      const result = await toggleUsuarioAtivo(item.id, !item.active)
      if (result.error) showToast(`Erro: ${result.error}`, 'error')
      else { showToast(item.active ? 'Desativado.' : 'Ativado!', 'success'); router.refresh() }
    })
  }

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  // ─── RESET SENHA ──────────────────────────────────────────
  if (mode === 'reset-pw' && editingItem) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setMode('list')} className="text-green-700 font-bold text-2xl">←</button>
          <h2 className="text-xl font-bold text-gray-800">
            Redefinir senha de {editingItem.display_name}
          </h2>
        </div>
        <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="label">Nova senha *</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="input"
            />
            <p className="text-xs text-gray-400 mt-1">
              Encerra as sessões ativas do usuário e exige nova troca no próximo acesso.
            </p>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Salvando…' : 'Redefinir senha'}
          </button>
        </form>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    )
  }

  // ─── FORMULÁRIO ────────────────────────────────────────────
  if (mode === 'form') {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setMode('list')} className="text-green-700 font-bold text-2xl">←</button>
          <h2 className="text-xl font-bold text-gray-800">
            {editingItem ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="label">Nome completo *</label>
            <input
              type="text"
              required
              value={form.display_name}
              onChange={(e) => setForm(f => ({ ...f, display_name: e.target.value }))}
              placeholder="Ex: Gilberto Silva"
              className="input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="label">Usuário (login) *</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))}
              placeholder="Ex: gilberto"
              autoCapitalize="none"
              className="input"
            />
          </div>

          {!editingItem && (
            <div className="flex flex-col gap-1">
              <label className="label">Senha inicial *</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password || ''}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                className="input"
              />
              <p className="text-xs text-gray-400">
                Senha temporária — o usuário define a própria no primeiro acesso.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="label">Perfil *</label>
            <select
              required
              value={form.role}
              onChange={(e) => setForm(f => ({ ...f, role: e.target.value as Role }))}
              className="input"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Salvando…' : editingItem ? 'Salvar alterações' : 'Cadastrar usuário'}
          </button>
        </form>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    )
  }

  // ─── LISTA ─────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Usuários</h2>
        <button onClick={openCreate} className="btn-primary px-5 py-3 text-base w-auto">+ Novo</button>
      </div>

      {initialUsers.length === 0 ? (
        <p className="text-gray-400 text-center py-16">Nenhum usuário cadastrado.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {initialUsers.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl shadow-sm border-2 p-4 ${item.active ? 'border-transparent' : 'border-gray-200 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900 text-lg">{item.display_name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                    <span>@{item.username}</span>
                    <span className="font-medium text-green-700">{ROLE_LABELS[item.role]}</span>
                    {item.last_seen_at && (
                      <span>Visto: {formatDate(item.last_seen_at)}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-xl"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => openResetPw(item)}
                      className="text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-2 rounded-xl"
                    >
                      Senha
                    </button>
                  </div>
                  <button
                    onClick={() => handleToggleActive(item)}
                    disabled={isPending}
                    className={`text-sm font-semibold px-3 py-2 rounded-xl ${item.active ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-100'}`}
                  >
                    {item.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
