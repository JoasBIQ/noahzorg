'use client'

import { useState, useMemo } from 'react'
import { Pencil, Loader2, X, Calendar } from 'lucide-react'
import type { GoogleDriveFile } from './drive-content'

interface Props {
  file: GoogleDriveFile
  onClose: () => void
  onRenamed: (updatedFile: GoogleDriveFile) => void
}

/**
 * Probeert een datum te detecteren in een bestandsnaam en geeft de
 * JJMMDD-variant terug. Herkent patronen als:
 *   "9-4-26: Titel.m4a"     → "260409 Titel.m4a"
 *   "10-4-2026 Titel.pdf"   → "260410 Titel.pdf"
 *   "2026-04-13_Titel.docx" → "260413 Titel.docx"
 */
function hernoemenNaarJJMMDD(naam: string): string | null {
  // Splits naam en extensie
  const dotIdx = naam.lastIndexOf('.')
  const ext = dotIdx > 0 ? naam.slice(dotIdx) : ''
  const basis = dotIdx > 0 ? naam.slice(0, dotIdx) : naam

  // Patronen: d-m-yy, d-m-yyyy, yyyy-mm-dd, dd/mm/yy, etc.
  const patronen: RegExp[] = [
    // "9-4-26:", "10-4-2026:", "10-4-26 "
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})[:, ]+(.*)$/,
    // ISO: "2026-04-13_" of "2026-04-13 "
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[_: ]+(.*)$/,
  ]

  for (const patroon of patronen) {
    const m = basis.match(patroon)
    if (!m) continue

    let jj: number, mm: number, dd: number, rest: string

    if (patroon === patronen[0]) {
      // d-m-yy(yy) → dag, maand, jaar
      dd = parseInt(m[1], 10)
      mm = parseInt(m[2], 10)
      const jaarRaw = parseInt(m[3], 10)
      jj = jaarRaw > 99 ? jaarRaw % 100 : jaarRaw
      rest = m[4].trim()
    } else {
      // yyyy-mm-dd
      const jaarRaw = parseInt(m[1], 10)
      jj = jaarRaw > 99 ? jaarRaw % 100 : jaarRaw
      mm = parseInt(m[2], 10)
      dd = parseInt(m[3], 10)
      rest = m[4].trim()
    }

    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) continue

    const jjStr = String(jj).padStart(2, '0')
    const mmStr = String(mm).padStart(2, '0')
    const ddStr = String(dd).padStart(2, '0')
    const prefix = `${jjStr}${mmStr}${ddStr}`

    const nieuweNaam = rest ? `${prefix} ${rest}${ext}` : `${prefix}${ext}`
    return nieuweNaam
  }

  return null
}

export function DriveRenameDialog({ file, onClose, onRenamed }: Props) {
  const [name, setName] = useState(file.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Bereken suggestie eenmalig op basis van de originele bestandsnaam
  const suggestie = useMemo(() => hernoemenNaarJJMMDD(file.name), [file.name])

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (trimmed === file.name) {
      onClose()
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/drive/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Hernoemen mislukt.')
      onRenamed({ ...file, name: trimmed })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hernoemen mislukt.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-[#4A7C59]" />
            <h3 className="font-semibold text-gray-900">Hernoemen</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') onClose()
          }}
          autoFocus
          onFocus={(e) => {
            // Selecteer bestandsnaam zonder extensie
            const val = e.target.value
            const dotIdx = val.lastIndexOf('.')
            if (dotIdx > 0) {
              e.target.setSelectionRange(0, dotIdx)
            } else {
              e.target.select()
            }
          }}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[#4A7C59] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/20"
        />

        {/* JJMMDD-suggestie — alleen tonen als datum herkend is */}
        {suggestie && suggestie !== name && (
          <button
            type="button"
            onClick={() => setName(suggestie)}
            className="mt-2 flex w-full items-center gap-2 rounded-lg border border-[#4A7C59]/30 bg-[#4A7C59]/5 px-3 py-2 text-left text-xs text-[#4A7C59] hover:bg-[#4A7C59]/10 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Formatteer naar JJMMDD: <span className="font-semibold">{suggestie}</span>
            </span>
          </button>
        )}

        {/* Naamgevingsregel als hint */}
        <p className="mt-2 text-xs text-gray-400">
          Gebruik datumprefix <span className="font-medium text-gray-500">JJMMDD</span> zonder streepjes, bijv. <span className="font-medium text-gray-500">260423 Naam.pdf</span>
        </p>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {/* Knoppen */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
            className="flex items-center gap-2 rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3d6849] disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Opslaan
          </button>
        </div>
      </div>
    </div>
  )
}
