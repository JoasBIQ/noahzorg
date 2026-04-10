'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/audit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { AGENDA_TYPE_LABELS } from '@/lib/constants'
import type { Profile, AgendaItem, AgendaType } from '@/types'

interface EventFormProps {
  profiles: Profile[]
  currentUserId: string
  existingItem?: AgendaItem
  defaultDateTime?: string
  onClose: () => void
  onSubmit: () => void
}

export function EventForm({
  profiles,
  currentUserId,
  existingItem,
  defaultDateTime,
  onClose,
  onSubmit,
}: EventFormProps) {
  const [titel, setTitel] = useState(existingItem?.titel ?? '')
  const [datumTijd, setDatumTijd] = useState(() => {
    if (existingItem?.datum_tijd) {
      return format(new Date(existingItem.datum_tijd), "yyyy-MM-dd'T'HH:mm")
    }
    if (defaultDateTime) {
      return defaultDateTime
    }
    return ''
  })
  const [eindTijd, setEindTijd] = useState(() => {
    if (existingItem?.eind_tijd) {
      return format(new Date(existingItem.eind_tijd), "yyyy-MM-dd'T'HH:mm")
    }
    return ''
  })
  const [type, setType] = useState<AgendaType>(existingItem?.type ?? 'overig')
  const [locatie, setLocatie] = useState(existingItem?.locatie ?? '')
  const [notities, setNotities] = useState(existingItem?.notities ?? '')
  const [betrokkenen, setBetrokkenen] = useState<string[]>(
    existingItem?.betrokkenen ?? []
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()
  const isEditing = !!existingItem

  const typeOptions = (
    Object.entries(AGENDA_TYPE_LABELS) as [AgendaType, string][]
  ).map(([value, label]) => ({ value, label }))

  const handleToggleBetrokkene = (profileId: string) => {
    setBetrokkenen((prev) =>
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
      const datumTijdISO = new Date(datumTijd).toISOString()

      if (isEditing) {
        const { error: updateError } = await supabase
          .from('agenda')
          .update({
            titel: titel.trim(),
            datum_tijd: datumTijdISO,
            eind_tijd: eindTijd ? new Date(eindTijd).toISOString() : null,
            type,
            locatie: locatie.trim() || null,
            notities: notities.trim() || null,
            betrokkenen,
          })
          .eq('id', existingItem.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('agenda').insert({
          titel: titel.trim(),
          datum_tijd: datumTijdISO,
          eind_tijd: eindTijd ? new Date(eindTijd).toISOString() : null,
          type,
          locatie: locatie.trim() || null,
          notities: notities.trim() || null,
          betrokkenen,
          aangemaakt_door: currentUserId,
        })

        if (insertError) throw insertError
      }

      logAudit({
        gebruikerId: currentUserId,
        actie: isEditing ? 'gewijzigd' : 'aangemaakt',
        module: 'agenda',
        omschrijving: `Afspraak ${isEditing ? 'gewijzigd' : 'aangemaakt'}: "${titel.trim()}"`,
        metadata: { type, datum_tijd: datumTijdISO },
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
        placeholder="Naam van de afspraak"
        required
      />

      <Input
        label="Datum en tijd"
        type="datetime-local"
        value={datumTijd}
        onChange={(e) => setDatumTijd(e.target.value)}
        required
      />

      <Input
        label="Eindtijd (optioneel)"
        type="datetime-local"
        value={eindTijd}
        onChange={(e) => setEindTijd(e.target.value)}
      />

      <Select
        label="Type"
        value={type}
        onChange={(e) => setType(e.target.value as AgendaType)}
        options={typeOptions}
      />

      <Input
        label="Locatie"
        value={locatie}
        onChange={(e) => setLocatie(e.target.value)}
        placeholder="Waar vindt het plaats?"
      />

      <Textarea
        label="Notities"
        value={notities}
        onChange={(e) => setNotities(e.target.value)}
        placeholder="Extra informatie..."
        rows={3}
      />

      {/* Betrokkenen multi-select via checkboxes */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Betrokkenen
        </label>
        <div className="space-y-2 mt-1">
          {profiles.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={betrokkenen.includes(p.id)}
                onChange={() => handleToggleBetrokkene(p.id)}
                className="rounded border-gray-300 text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-gray-700">{p.naam}</span>
            </label>
          ))}
        </div>
      </div>

      {!isEditing && (
        <p className="text-xs text-[#6B7280] bg-gray-50 rounded-lg px-3 py-2">
          Afspraken worden opgeslagen in Rondom Noah. Koppel Google Agenda via Beheer om automatisch te synchroniseren.
        </p>
      )}

      {error && <p className="text-sm text-accent">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Opslaan...' : isEditing ? 'Bijwerken' : 'Aanmaken'}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Annuleren
        </Button>
      </div>
    </form>
  )
}
