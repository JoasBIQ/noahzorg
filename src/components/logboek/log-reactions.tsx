'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/audit'
import { Avatar } from '@/components/ui/avatar'
import { formatRelative } from '@/lib/utils'
import type { Reactie, Profile } from '@/types'

interface LogReactionsProps {
  reacties: Reactie[]
  logboekId: string
  currentUserId: string
  currentProfile: Profile
  allProfiles: Profile[]
  onUpdate: () => void
}

export function LogReactions({
  reacties,
  logboekId,
  currentUserId,
  currentProfile,
  allProfiles,
  onUpdate,
}: LogReactionsProps) {
  const [bericht, setBericht] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bericht.trim()) return

    setSubmitting(true)

    const nieuweReactie: Reactie = {
      auteur_id: currentUserId,
      naam: currentProfile.naam,
      kleur: currentProfile.kleur,
      bericht: bericht.trim(),
      created_at: new Date().toISOString(),
    }

    const updatedReacties = [...reacties, nieuweReactie]

    await supabase
      .from('logboek')
      .update({ reacties: updatedReacties })
      .eq('id', logboekId)

    setBericht('')
    setSubmitting(false)
    onUpdate()
    logAudit({
      gebruikerId: currentUserId,
      actie: 'reactie',
      module: 'notities',
      omschrijving: `Reactie geplaatst: "${bericht.trim().slice(0, 60)}${bericht.trim().length > 60 ? '...' : ''}"`,
    })
  }

  return (
    <div className="space-y-3">
      {/* Existing reactions */}
      {reacties.length > 0 && (
        <div className="space-y-2">
          {reacties.map((reactie, index) => {
            const profile = allProfiles.find(
              (p) => p.id === reactie.auteur_id
            )
            return (
              <div key={index} className="flex items-start gap-2">
                <Avatar
                  naam={profile?.naam ?? reactie.naam}
                  kleur={profile?.kleur ?? reactie.kleur}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {profile?.naam ?? reactie.naam}
                    </span>
                    <span className="text-xs text-muted">
                      {formatRelative(reactie.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {reactie.bericht}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {reacties.length === 0 && (
        <p className="text-xs text-muted">
          Nog geen reacties. Schrijf de eerste!
        </p>
      )}

      {/* Add reaction form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={bericht}
          onChange={(e) => setBericht(e.target.value)}
          placeholder="Schrijf een reactie..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
        <button
          type="submit"
          disabled={submitting || !bericht.trim()}
          className="p-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
