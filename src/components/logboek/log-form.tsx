'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/audit'
import { Button } from '@/components/ui/button'
import { CATEGORIE_LABELS } from '@/lib/constants'
import type { Profile, LogboekCategorie } from '@/types'

interface LogFormProps {
  currentUserId: string
  currentProfile: Profile
  onSubmit: () => void
  onCancel: () => void
}

export function LogForm({
  currentUserId,
  currentProfile,
  onSubmit,
  onCancel,
}: LogFormProps) {
  const [bericht, setBericht] = useState('')
  const [categorie, setCategorie] = useState<LogboekCategorie>('observatie')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bericht.trim()) {
      setError('Schrijf een bericht.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: insertError } = await supabase.from('logboek').insert({
      auteur_id: currentUserId,
      bericht: bericht.trim(),
      categorie,
      gelezen_door: [currentUserId],
      reacties: [],
    })

    if (insertError) {
      setError('Er ging iets mis. Probeer het opnieuw.')
      setSubmitting(false)
      return
    }

    // Push notificatie naar alle andere gebruikers
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Nieuwe notitie van ${currentProfile.naam}`,
        body: bericht.trim().slice(0, 80),
        url: '/logboek',
        tag: 'logboek-nieuw',
        excludeUserId: currentUserId,
      }),
    }).catch(() => {})

    setSubmitting(false)
    logAudit({
      gebruikerId: currentUserId,
      actie: 'aangemaakt',
      module: 'notities',
      omschrijving: `Notitie aangemaakt: "${bericht.trim().slice(0, 60)}${bericht.trim().length > 60 ? '...' : ''}"`,
      metadata: { categorie },
    })
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Categorie select */}
      <div className="space-y-1">
        <label
          htmlFor="categorie"
          className="block text-sm font-medium text-gray-700"
        >
          Categorie
        </label>
        <select
          id="categorie"
          value={categorie}
          onChange={(e) => setCategorie(e.target.value as LogboekCategorie)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        >
          {(
            Object.entries(CATEGORIE_LABELS) as [LogboekCategorie, string][]
          ).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Bericht textarea */}
      <div className="space-y-1">
        <label
          htmlFor="bericht"
          className="block text-sm font-medium text-gray-700"
        >
          Bericht
        </label>
        <textarea
          id="bericht"
          value={bericht}
          onChange={(e) => {
            setBericht(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Schrijf je observatie, zorg of bericht..."
          rows={5}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y min-h-[120px]"
        />
        {error && <p className="text-sm text-accent">{error}</p>}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Annuleren
        </Button>
        <Button type="submit" disabled={submitting || !bericht.trim()}>
          {submitting ? 'Opslaan...' : 'Opslaan'}
        </Button>
      </div>
    </form>
  )
}
