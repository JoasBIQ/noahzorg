'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/audit'
import type { Bespreekpunt } from '@/types'

interface BespreekpuntFormProps {
  overlegId: string
  currentBespreekpunten: Bespreekpunt[]
  currentUserId: string
  onAdded: () => void
}

export function BespreekpuntForm({
  overlegId,
  currentBespreekpunten,
  currentUserId,
  onAdded,
}: BespreekpuntFormProps) {
  const [tekst, setTekst] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const handleAdd = async () => {
    if (!tekst.trim()) return

    setSaving(true)

    const newPunt: Bespreekpunt = {
      tekst: tekst.trim(),
      toegevoegd_door: currentUserId,
      created_at: new Date().toISOString(),
    }

    const updated = [...currentBespreekpunten, newPunt]

    await supabase
      .from('overleggen')
      .update({ bespreekpunten: updated })
      .eq('id', overlegId)

    setTekst('')
    setSaving(false)
    logAudit({
      gebruikerId: currentUserId,
      actie: 'gewijzigd',
      module: 'overleggen',
      omschrijving: `Bespreekpunt toegevoegd aan overleg: "${tekst.trim().slice(0, 60)}"`,
    })
    onAdded()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Bespreekpunt toevoegen..."
        disabled={saving}
        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:opacity-50"
      />
      <button
        onClick={handleAdd}
        disabled={saving || !tekst.trim()}
        className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
      >
        <Plus size={14} />
        Toevoegen
      </button>
    </div>
  )
}
