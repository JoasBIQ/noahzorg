'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { PRIORITEIT_LABELS, STATUS_LABELS } from '@/lib/constants'
import type { Profile, Taak, TaakPrioriteit, TaakStatus } from '@/types'

interface TaskFormProps {
  profiles: Profile[]
  currentUserId: string
  existingTask?: Taak
  onClose: () => void
  onSubmit: () => void
  prefillTitel?: string
  prefillOmschrijving?: string
}

export function TaskForm({
  profiles,
  currentUserId,
  existingTask,
  onClose,
  onSubmit,
  prefillTitel,
  prefillOmschrijving,
}: TaskFormProps) {
  const [titel, setTitel] = useState(existingTask?.titel ?? prefillTitel ?? '')
  const [omschrijving, setOmschrijving] = useState(
    existingTask?.omschrijving ?? prefillOmschrijving ?? ''
  )
  const [toegewezenAan, setToegewezenAan] = useState(
    existingTask?.toegewezen_aan ?? ''
  )
  const [prioriteit, setPrioriteit] = useState<TaakPrioriteit>(
    existingTask?.prioriteit ?? 'normaal'
  )
  const [deadline, setDeadline] = useState(existingTask?.deadline ?? '')
  const [status, setStatus] = useState<TaakStatus>(
    existingTask?.status ?? 'open'
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()
  const isEditing = !!existingTask

  const prioriteitOptions = (
    Object.entries(PRIORITEIT_LABELS) as [TaakPrioriteit, string][]
  ).map(([value, label]) => ({ value, label }))

  const statusOptions = (
    Object.entries(STATUS_LABELS) as [TaakStatus, string][]
  )
    .filter(([value]) => value !== 'gearchiveerd')
    .map(([value, label]) => ({ value, label }))

  const assigneeOptions = [
    { value: '', label: 'Niet toegewezen' },
    ...profiles.map((p) => ({ value: p.id, label: p.naam })),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titel.trim()) {
      setError('Titel is verplicht')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (isEditing) {
        const { error: updateError } = await supabase
          .from('taken')
          .update({
            titel: titel.trim(),
            omschrijving: omschrijving.trim() || null,
            toegewezen_aan: toegewezenAan || null,
            prioriteit,
            deadline: deadline || null,
            status,
          })
          .eq('id', existingTask.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('taken').insert({
          titel: titel.trim(),
          omschrijving: omschrijving.trim() || null,
          toegewezen_aan: toegewezenAan || null,
          prioriteit,
          deadline: deadline || null,
          status,
          aangemaakt_door: currentUserId,
        })

        if (insertError) throw insertError
      }

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
        placeholder="Wat moet er gebeuren?"
        required
      />

      <Textarea
        label="Omschrijving"
        value={omschrijving}
        onChange={(e) => setOmschrijving(e.target.value)}
        placeholder="Extra details of context..."
        rows={3}
      />

      <Select
        label="Toegewezen aan"
        value={toegewezenAan}
        onChange={(e) => setToegewezenAan(e.target.value)}
        options={assigneeOptions}
      />

      <Select
        label="Prioriteit"
        value={prioriteit}
        onChange={(e) => setPrioriteit(e.target.value as TaakPrioriteit)}
        options={prioriteitOptions}
      />

      <Input
        label="Deadline"
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
      />

      {isEditing && (
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as TaakStatus)}
          options={statusOptions}
        />
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
