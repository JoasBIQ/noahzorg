'use client'

import { useState } from 'react'
import { Pencil, Loader2, X } from 'lucide-react'
import type { GoogleDriveFile } from './drive-content'

interface Props {
  file: GoogleDriveFile
  onClose: () => void
  onRenamed: (updatedFile: GoogleDriveFile) => void
}

export function DriveRenameDialog({ file, onClose, onRenamed }: Props) {
  const [name, setName] = useState(file.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
