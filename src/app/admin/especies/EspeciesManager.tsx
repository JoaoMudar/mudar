'use client'

import { useState, useRef, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Toast, { ToastType } from '@/components/Toast'
import SpeciesTags from '@/components/SpeciesTags'
import { SPECIES_TAG_LIST, type SpeciesTagSlug } from '@/lib/species-tags'
import { isSpeciesIncomplete, googleSearchUrl } from '@/lib/species-review'
import {
  uploadEspecieFoto,
  createEspecie,
  updateEspecie,
  toggleEspecieAtiva,
  type SpeciesPayload,
} from './actions'

interface Species {
  id: string
  common_name: string
  scientific_name: string | null
  tags: SpeciesTagSlug[] | null
  germination_time_days: number | null
  growth_time_months: number | null
  notes: string | null
  photo_url: string | null
  active: boolean
}

function emptyForm(): SpeciesPayload {
  return {
    common_name: '',
    scientific_name: '',
    tags: [],
    germination_time_days: null,
    growth_time_months: null,
    notes: '',
    photo_url: '',
    active: true,
  }
}

interface ToastState { message: string; type: ToastType }

export default function EspeciesManager({ initialSpecies }: { initialSpecies: Species[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'list' | 'form' | 'review'>('list')
  const [editingItem, setEditingItem] = useState<Species | null>(null)
  const [form, setForm] = useState<SpeciesPayload>(emptyForm())
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Quando o form foi aberto a partir do modo "revisar", exigimos os dados
  // minimos (nome cientifico + 1 caracteristica) e voltamos para a revisao.
  const [completing, setCompleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const incompleteSpecies = useMemo(
    () => initialSpecies.filter((s) => isSpeciesIncomplete(s)),
    [initialSpecies],
  )

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
  }

  function openCreate() {
    setEditingItem(null)
    setForm(emptyForm())
    setPhotoFile(null)
    setPhotoPreview('')
    setCompleting(false)
    setMode('form')
  }

  function openEdit(item: Species, fromReview = false) {
    setEditingItem(item)
    setForm({
      common_name: item.common_name,
      scientific_name: item.scientific_name ?? '',
      tags: item.tags ?? [],
      germination_time_days: item.germination_time_days,
      growth_time_months: item.growth_time_months,
      notes: item.notes ?? '',
      photo_url: item.photo_url ?? '',
      active: item.active,
    })
    setPhotoFile(null)
    setPhotoPreview(item.photo_url ?? '')
    setCompleting(fromReview)
    setMode('form')
  }

  function toggleTag(slug: SpeciesTagSlug) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(slug) ? f.tags.filter((t) => t !== slug) : [...f.tags, slug],
    }))
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    // Ao completar um cadastro incompleto, exigimos os dados minimos.
    if (completing && (form.scientific_name.trim() === '' || form.tags.length === 0)) {
      showToast(
        'Para completar o cadastro, informe o nome científico e ao menos uma característica.',
        'error',
      )
      return
    }

    setSubmitting(true)

    try {
      let finalData = { ...form }

      // Upload da foto se selecionada
      if (photoFile) {
        const fd = new FormData()
        fd.append('file', photoFile)
        const result = await uploadEspecieFoto(fd)
        if ('error' in result) {
          showToast(`Erro ao enviar foto: ${result.error}`, 'error')
          return
        }
        finalData.photo_url = result.url
      }

      const result = editingItem
        ? await updateEspecie(editingItem.id, finalData)
        : await createEspecie(finalData)

      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }

      showToast(editingItem ? 'Espécie atualizada!' : 'Espécie cadastrada!', 'success')
      // Veio da revisao: volta para a lista de incompletos para seguir revisando.
      setMode(completing ? 'review' : 'list')
      startTransition(() => router.refresh())
    } finally {
      setSubmitting(false)
    }
  }

  function handleToggleActive(item: Species) {
    const acao = item.active ? 'desativar' : 'ativar'
    if (!window.confirm(`Deseja ${acao} "${item.common_name}"?`)) return
    startTransition(async () => {
      const result = await toggleEspecieAtiva(item.id, !item.active)
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
      } else {
        showToast(item.active ? 'Espécie desativada.' : 'Espécie ativada!', 'success')
        router.refresh()
      }
    })
  }

  // ─── FORMULÁRIO ────────────────────────────────────────────
  if (mode === 'form') {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setMode(completing ? 'review' : 'list')}
            className="text-green-700 font-bold text-2xl leading-none"
          >
            ←
          </button>
          <h2 className="text-xl font-bold text-gray-800">
            {completing ? 'Completar cadastro' : editingItem ? 'Editar Espécie' : 'Nova Espécie'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Nome popular */}
          <div className="flex flex-col gap-1">
            <label className="label">Nome popular *</label>
            <input
              type="text"
              required
              value={form.common_name}
              onChange={(e) => setForm(f => ({ ...f, common_name: e.target.value }))}
              placeholder="Ex: Ipê-amarelo"
              className="input"
            />
          </div>

          {/* Nome científico */}
          <div className="flex flex-col gap-1">
            <label className="label">Nome científico</label>
            <input
              type="text"
              value={form.scientific_name}
              onChange={(e) => setForm(f => ({ ...f, scientific_name: e.target.value }))}
              placeholder="Ex: Handroanthus albus"
              className="input"
            />
            {form.common_name.trim() !== '' && (
              <button
                type="button"
                onClick={() =>
                  window.open(googleSearchUrl(form.common_name), '_blank', 'noopener')
                }
                className="self-start text-sm font-semibold text-green-700 mt-1"
              >
                🔍 Pesquisar no Google
              </button>
            )}
          </div>

          {/* Caracteristicas (multi-selecao) */}
          <div className="flex flex-col gap-1">
            <label className="label">Características</label>
            <div className="flex flex-wrap gap-2">
              {SPECIES_TAG_LIST.map(({ slug, label }) => {
                const selected = form.tags.includes(slug)
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggleTag(slug)}
                    aria-pressed={selected}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
                      selected
                        ? 'bg-green-700 text-white border-green-700'
                        : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tempos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label">Germinação (dias)</label>
              <input
                type="number"
                min="0"
                value={form.germination_time_days ?? ''}
                onChange={(e) => setForm(f => ({ ...f, germination_time_days: e.target.value ? Number(e.target.value) : null }))}
                placeholder="Ex: 30"
                className="input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label">Crescimento (meses)</label>
              <input
                type="number"
                min="0"
                value={form.growth_time_months ?? ''}
                onChange={(e) => setForm(f => ({ ...f, growth_time_months: e.target.value ? Number(e.target.value) : null }))}
                placeholder="Ex: 12"
                className="input"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="flex flex-col gap-1">
            <label className="label">Observações</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas sobre a espécie…"
              className="input resize-none"
            />
          </div>

          {/* Upload de foto */}
          <div className="flex flex-col gap-2">
            <label className="label">Foto</label>
            {photoPreview && (
              <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100">
                <Image
                  src={photoPreview}
                  alt="Preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-500 font-medium hover:border-green-500 hover:text-green-700 transition-colors"
            >
              {photoPreview ? 'Trocar foto' : 'Selecionar foto'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Ativo */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm(f => ({ ...f, active: e.target.checked }))}
              className="w-5 h-5 accent-green-700"
            />
            <span className="text-base font-medium text-gray-700">Espécie ativa</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? 'Salvando…' : editingItem ? 'Salvar alterações' : 'Cadastrar espécie'}
          </button>
        </form>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    )
  }

  // ─── REVISAR CADASTROS INCOMPLETOS ─────────────────────────
  if (mode === 'review') {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setMode('list')}
            className="text-green-700 font-bold text-2xl leading-none"
          >
            ←
          </button>
          <h2 className="text-xl font-bold text-gray-800">Revisar cadastros incompletos</h2>
        </div>

        {incompleteSpecies.length === 0 ? (
          <p className="text-gray-400 text-center py-16">Nenhum cadastro incompleto. 🎉</p>
        ) : (
          <div className="flex flex-col gap-3">
            {incompleteSpecies.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-sm border-2 border-amber-200 p-4 flex gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{item.common_name}</p>
                  <p className="text-sm text-amber-700">Faltam nome científico e características</p>
                </div>
                <button
                  onClick={() => openEdit(item, true)}
                  className="text-sm font-semibold text-white bg-green-700 px-3 py-2 rounded-xl flex-shrink-0 self-center"
                >
                  Completar
                </button>
              </div>
            ))}
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    )
  }

  // ─── LISTA ─────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Espécies</h2>
        <button onClick={openCreate} className="btn-primary px-5 py-3 text-base">
          + Nova
        </button>
      </div>

      {incompleteSpecies.length > 0 && (
        <button
          onClick={() => setMode('review')}
          className="w-full mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-left font-semibold text-amber-800 flex items-center justify-between"
        >
          <span>⚠ Revisar cadastros incompletos ({incompleteSpecies.length})</span>
          <span className="text-amber-600">→</span>
        </button>
      )}

      {initialSpecies.length === 0 ? (
        <p className="text-gray-400 text-center py-16">Nenhuma espécie cadastrada.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {initialSpecies.map(item => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl shadow-sm border-2 p-4 flex gap-3 ${
                item.active ? 'border-transparent' : 'border-gray-200 opacity-60'
              }`}
            >
              {item.photo_url && (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                  <Image src={item.photo_url} alt={item.common_name} fill className="object-cover" unoptimized />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{item.common_name}</p>
                {item.scientific_name && (
                  <p className="text-sm text-gray-500 italic truncate">{item.scientific_name}</p>
                )}
                <SpeciesTags tags={item.tags} className="mt-1" />
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(item)}
                  className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-xl"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggleActive(item)}
                  disabled={isPending}
                  className={`text-sm font-semibold px-3 py-2 rounded-xl ${
                    item.active
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 bg-gray-100'
                  }`}
                >
                  {item.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
