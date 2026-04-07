'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Pencil, MapPin, Clock, Cloud, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/audit'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Modal } from '@/components/ui/modal'
import { EventForm } from './event-form'
import { AGENDA_TYPE_LABELS, AGENDA_TYPE_COLORS } from '@/lib/constants'
import { formatDate, formatTime } from '@/lib/utils'
import type { AgendaItem, Profile, AgendaType } from '@/types'

interface EventCardProps {
  item: AgendaItem
  allProfiles: Profile[]
  currentUserId: string
  onUpdate: () => void
}

const TYPE_DOT_COLORS: Record<AgendaType, string> = {
  medisch: '#EF4444',
  zorg: '#4A7C59',
  juridisch: '#8B5CF6',
  sociaal: '#EAB308',
  overleg: '#3B82F6',
  overig: '#6B7280',
}

export function EventCard({
  item,
  allProfiles,
  currentUserId,
  onUpdate,
}: EventCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()

  const betrokkenenProfiles = allProfiles.filter((p) =>
    item.betrokkenen.includes(p.id)
  )

  const isSynced = !!item.google_event_id

  const handleEditSubmit = () => {
    setShowEditModal(false)
    onUpdate()
  }

  const handleDelete = async () => {
    if (!window.confirm('Weet je zeker dat je dit wilt verwijderen?')) return
    setDeleting(true)
    const { error } = await supabase.from('agenda').delete().eq('id', item.id)
    if (error) {
      console.error('Delete failed:', error)
      setDeleting(false)
      return
    }
    logAudit({
      gebruikerId: currentUserId,
      actie: 'verwijderd',
      module: 'agenda',
      omschrijving: `Afspraak verwijderd: "${item.titel}"`,
      metadata: { titel: item.titel, datum_tijd: item.datum_tijd, type: item.type, locatie: item.locatie },
    })
    onUpdate()
  }

  return (
    <>
      <Card>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <div className="flex items-start gap-3">
            {/* Type dot */}
            <div
              className="w-3 h-3 rounded-full mt-1.5 shrink-0"
              style={{ backgroundColor: TYPE_DOT_COLORS[item.type] }}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 truncate">
                  {item.titel}
                </h3>
                {isSynced && (
                  <Cloud size={14} className="text-blue-400 shrink-0" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-sm text-muted">
                  <Clock size={14} />
                  {formatDate(item.datum_tijd)}, {formatTime(item.datum_tijd)}{item.eind_tijd ? ` - ${formatTime(item.eind_tijd)}` : ''}
                </span>
                <Badge className={AGENDA_TYPE_COLORS[item.type]}>
                  {AGENDA_TYPE_LABELS[item.type]}
                </Badge>
              </div>
              {item.locatie && (
                <span className="flex items-center gap-1 text-sm text-muted mt-1">
                  <MapPin size={14} />
                  {item.locatie}
                </span>
              )}

              {/* Betrokkenen avatars */}
              {betrokkenenProfiles.length > 0 && (
                <div className="flex -space-x-1.5 mt-2">
                  {betrokkenenProfiles.map((p) => (
                    <Avatar
                      key={p.id}
                      naam={p.naam}
                      kleur={p.kleur}
                      size="sm"
                    />
                  ))}
                </div>
              )}
            </div>

            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0"
            >
              <ChevronDown size={18} className="text-gray-400" />
            </motion.div>
          </div>
        </button>

        {/* Expanded section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-gray-100 space-y-3">
                {/* Notes */}
                {item.notities && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {item.notities}
                  </p>
                )}

                {/* Betrokkenen names */}
                {betrokkenenProfiles.length > 0 && (
                  <div className="text-sm text-muted">
                    <span className="font-medium">Betrokkenen: </span>
                    {betrokkenenProfiles.map((p) => p.naam).join(', ')}
                  </div>
                )}

                {/* Sync status */}
                {isSynced && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-500">
                    <Cloud size={12} />
                    Gesynchroniseerd met Google Calendar
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowEditModal(true)
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Pencil size={14} />
                    Bewerken
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete()
                    }}
                    disabled={deleting}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deleting ? 'Verwijderen...' : 'Verwijderen'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Edit modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Afspraak bewerken"
      >
        <EventForm
          profiles={allProfiles}
          currentUserId={currentUserId}
          existingItem={item}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
        />
      </Modal>
    </>
  )
}
