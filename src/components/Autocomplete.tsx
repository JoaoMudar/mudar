'use client'

import { useEffect, useRef, useState } from 'react'
import { normalizeText, matchesSearch } from '@/lib/text'

export interface AutocompleteItem {
  id: string
  label: string
  sublabel?: string
}

interface Props {
  items: AutocompleteItem[]
  onSelect: (item: AutocompleteItem) => void
  placeholder?: string
  /** Mostra opcao "criar novo" quando o texto digitado nao casa exatamente. */
  allowCreate?: boolean
  onCreateNew?: (query: string) => void
  /** Texto inicial exibido no input (ex: item ja selecionado). */
  initialValue?: string
  autoFocus?: boolean
}

/**
 * Autocomplete reutilizavel com filtragem client-side, debounce e navegacao
 * por teclado. Usado para busca de cliente e de especie.
 */
export default function Autocomplete({
  items,
  onSelect,
  placeholder,
  allowCreate = false,
  onCreateNew,
  initialValue = '',
  autoFocus = false,
}: Props) {
  const [query, setQuery] = useState(initialValue)
  const [debounced, setDebounced] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce de 300ms na query usada para filtrar
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Fecha ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Busca tolerante: ignora acento, caixa e espacos nas pontas.
  const q = normalizeText(debounced)
  const filtered = q
    ? items.filter((i) => matchesSearch(i.label, debounced))
    : items
  const visible = filtered.slice(0, 50)

  const exactMatch = items.some((i) => normalizeText(i.label) === q)
  const showCreate = allowCreate && q.length > 0 && !exactMatch

  function choose(item: AutocompleteItem) {
    onSelect(item)
    setQuery(item.label)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    const max = visible.length + (showCreate ? 1 : 0)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, max - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (showCreate && highlight === visible.length) {
        onCreateNew?.(query.trim())
        setOpen(false)
      } else if (visible[highlight]) {
        choose(visible[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="input"
      />

      {open && (visible.length > 0 || showCreate) && (
        <ul className="absolute z-20 mt-1 w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-72 overflow-auto">
          {visible.map((item, idx) => (
            <li key={item.id}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => choose(item)}
                className={`w-full text-left px-4 py-3 ${
                  idx === highlight ? 'bg-green-50' : ''
                }`}
              >
                <span className="font-medium text-gray-900">{item.label}</span>
                {item.sublabel && (
                  <span className="block text-sm text-gray-500">{item.sublabel}</span>
                )}
              </button>
            </li>
          ))}
          {showCreate && (
            <li>
              <button
                type="button"
                onMouseEnter={() => setHighlight(visible.length)}
                onClick={() => {
                  onCreateNew?.(query.trim())
                  setOpen(false)
                }}
                className={`w-full text-left px-4 py-3 font-semibold text-green-700 ${
                  highlight === visible.length ? 'bg-green-50' : ''
                }`}
              >
                + Criar “{query.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
