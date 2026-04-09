'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/audit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Profile } from '@/types'

interface OverlegFormProps {
  profiles: Profile[]
  currentUserId: string
  onClose: () => void
  onSubmit: () => void
}

export function OverlegForm({
  profiles,
  currentUserId,
  onClose,
  onSubmit,
}: OverlegFormProps) {
  const [titel, setTitel] = useState('')
  const [datumTijd, setDatumTijd] = useState('')
  const [aanwezigen, setAanwezigen] = useState<string[]>([])
  const [bespreekpuntenText, setBespreekpuntenText] = useState('')
  const [notities, setNotities] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const toggleAanwezige = (profileId: string) => {
    setAanwezigen((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!titel.trim()) {
      setError('Titel is verplicht')
      return
    }
    if (!datumTijd) {
      setError('Datum en tijd zijn verplicht')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Parse bespreekpunten from textarea (one per line)
      const bespreekpunten = bespreekpuntenText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((tekst) => ({
          tekst,
          toegevoegd_door: currentUserId,
          created_at: new Date().toISOString(),
        }))

      const { error: insertError } = await supabase.from('overleggen').insert({
        titel: titel.trim(),
        datum_tijd: new Date(datumTijd).toISOString(),
        aanwezigen,
        bespreekpunten,
        notities: notities.trim() || null,
        aangemaakt_door: currentUserId,
      })

      if (insertError) throw insertError

      // Push notificatie naar alle gebruikers
      const eersteBepreekpunt = bespreekpuntenText.split('\n').find(l => l.trim())
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Familieoverleg gepland',
          body: `${new Date(datumTijd).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}${eersteBepreekpunt ? ` · ${eersteBepreekpunt.trim().slice(0, 60)}` : ''}`,
          url: '/overleggen',
          tag: 'overleg-nieuw',
          excludeUserId: currentUserId,
        }),
      }).catch(() => {})

      logAudit({
        gebruikerId: currentUserId,
        actie: 'aangemaakt',
        module: 'overleggen',
        omschrijving: `Overleg aangemaakt: "${titel.trim()}"`,
      })
      onSubmit()
    } catch {
      setError('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Titel"
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        placeholder="Bijv. Zorgoverleg, MDO, Evaluatie..."
        required
      />

      <Input
        label="Datum en tijd"
        type="datetime-local"
        value={datumTijd}
        onChange={(e) => setDatumTijd(e.target.value)}
        required
      />

      {/* Aanwezigen checkboxes */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Aanwezigen
        </label>
        <div className="flex flex-wrap gap-2">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => toggleAanwezige(profile.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                aanwezigen.includes(profile.id)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: profile.kleur }}
              >
                {profile.naam.charAt(0).toUpperCase()}
              </div>
              {profile.naam}
            </button>
          ))}
        </div>
      </div>

      <Textarea
        label="Bespreekpunten"
        value={bespreekpuntenText}
        onChange={(e) => setBespreekpuntenText(e.target.value)}
        placeholder="Eén bespreekpunt per regel..."
        rows={4}
      />

      <Textarea
        label="Notities"
        value={notities}
        onChange={(e) => setNotities(e.target.value)}
        placeholder="Eventuele notities vooraf..."
        rows={3}
      />

      {error && <p className="text-sm text-accent">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Opslaan...' : 'Aanmaken'}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Annuleren
        </Button>
      </div>
    </form>
  )
}
