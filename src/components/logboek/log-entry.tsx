'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle,
  CheckSquare,
  Archive,
  ChevronDown,
  ChevronUp,
  Users2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/audit'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { LogReactions } from '@/components/logboek/log-reactions'
import { LogReadBy } from '@/components/logboek/log-read-by'
import { formatRelative, cn } from '@/lib/utils'
import { CATEGORIE_LABELS, CATEGORIE_COLORS } from '@/lib/constants'
import type { LogEntry, Profile, Reactie } from '@/types'

interface LogEntryCardProps {
  entry: LogEntry
  allProfiles: Profile[]
  currentProfile: Profile
  currentUserId: string
  onUpdate: () => void
}

export function LogEntryCard({
  entry,
  allProfiles,
  currentProfile,
  currentUserId,
  onUpdate,
}: LogEntryCardProps) {
  const [showReactions, setShowReactions] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const hasMarkedRead = useRef(false)

  const supabase = createClient()
  const auteur = allProfiles.find((p) => p.id === entry.auteur_id)
  const canArchive =
    entry.auteur_id === currentUserId || currentProfile?.rol === 'beheerder'
  const reactieCount = entry.reacties?.length ?? 0
  const gelezenDoor = entry.gelezen_door ?? []

  // Mark as read when visible
  useEffect(() => {
    if (hasMarkedRead.current) return
    if (gelezenDoor.includes(currentUserId)) {
      hasMarkedRead.current = true
      return
    }

    const observer = new IntersectionObserver(
      async ([el]) => {
        if (el.isIntersecting && !hasMarkedRead.current) {
          hasMarkedRead.current = true
          const updated = [...gelezenDoor, currentUserId]
          await supabase
            .from('logboek')
            .update({ gelezen_door: updated })
            .eq('id', entry.id)
        }
      },
      { threshold: 0.5 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [entry.id, currentUserId, gelezenDoor, supabase])

  const handleArchive = async () => {
    if (!window.confirm('Weet je zeker dat je dit wilt verwijderen?')) return
    setIsArchiving(true)
    await supabase
      .from('logboek')
      .update({
        gearchiveerd: true,
        gearchiveerd_door: currentUserId,
        gearchiveerd_op: new Date().toISOString(),
      })
      .eq('id', entry.id)
    setIsArchiving(false)
    logAudit({
      gebruikerId: currentUserId,
      actie: 'gearchiveerd',
      module: 'notities',
      omschrijving: `Notitie gearchiveerd: "${entry.bericht.slice(0, 60)}${entry.bericht.length > 60 ? '...' : ''}"`,
      metadata: { bericht: entry.bericht, categorie: entry.categorie, auteur_id: entry.auteur_id },
    })
    onUpdate()
  }

  return (
    <div ref={cardRef}>
      <Card
        borderColor={auteur?.kleur}
        className={cn(entry.gearchiveerd && 'opacity-60')}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar
            naam={auteur?.naam ?? 'Onbekend'}
            kleur={auteur?.kleur ?? '#6B7280'}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">
                {auteur?.naam ?? 'Onbekend'}
              </span>
              <span className="text-xs text-muted">
                {formatRelative(entry.created_at)}
              </span>
              <Badge className={CATEGORIE_COLORS[entry.categorie]}>
                {CATEGORIE_LABELS[entry.categorie]}
              </Badge>
              {entry.gearchiveerd && (
                <Badge className="bg-gray-100 text-gray-500">
                  Gearchiveerd
                </Badge>
              )}
            </div>

            {/* Body */}
            <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
              {entry.bericht}
            </p>

            {/* Gelezen door */}
            {gelezenDoor.length > 0 && (
              <div className="mt-3">
                <LogReadBy
                  gelezenDoor={gelezenDoor}
                  allProfiles={allProfiles}
                />
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-gray-900 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
              >
                <MessageCircle size={14} />
                <span>
                  {showReactions ? 'Verberg' : 'Reageer'}
                  {reactieCount > 0 && ` (${reactieCount})`}
                </span>
                {showReactions ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>

              <TaakButton bericht={entry.bericht} />

              <Link
                href={`/overleggen?toevoegen=${entry.id}`}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-gray-900 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
              >
                <Users2 size={14} />
                <span>Voeg toe aan overleg</span>
              </Link>

              {canArchive && !entry.gearchiveerd && (
                <button
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-red-50 ml-auto disabled:opacity-50"
                >
                  <Archive size={14} />
                  <span>{isArchiving ? 'Verwijderen...' : 'Verwijderen'}</span>
                </button>
              )}
            </div>

            {/* Reactions section */}
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <LogReactions
                      reacties={entry.reacties ?? []}
                      logboekId={entry.id}
                      currentUserId={currentUserId}
                      currentProfile={currentProfile}
                      allProfiles={allProfiles}
                      onUpdate={onUpdate}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </div>
  )
}

function TaakButton({ bericht }: { bericht: string }) {
  const href = `/taken?maakTaak=${encodeURIComponent(bericht.slice(0, 200))}`
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 text-xs text-muted hover:text-gray-900 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
    >
      <CheckSquare size={14} />
      <span>Maak taak</span>
    </Link>
  )
}
