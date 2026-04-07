'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Pencil, Archive, Calendar, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Modal } from '@/components/ui/modal'
import { TaskForm } from './task-form'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITEIT_LABELS,
  PRIORITEIT_COLORS,
} from '@/lib/constants'
import { cn, formatDate } from '@/lib/utils'
import type { Taak, Profile, TaakStatus, TaakPrioriteit } from '@/types'

interface TaskCardProps {
  taak: Taak
  allProfiles: Profile[]
  currentUserId: string
  onUpdate: () => void
}

const PRIORITY_BORDER_COLORS: Record<TaakPrioriteit, string> = {
  laag: '#9CA3AF',
  normaal: '#3B82F6',
  hoog: '#F97316',
  urgent: '#EF4444',
}

export function TaskCard({
  taak,
  allProfiles,
  currentUserId,
  onUpdate,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const supabase = createClient()

  const assignee = allProfiles.find((p) => p.id === taak.toegewezen_aan)
  const canArchive =
    taak.aangemaakt_door === currentUserId ||
    allProfiles.find((p) => p.id === currentUserId)?.rol === 'beheerder'

  const handleStatusChange = async (newStatus: TaakStatus) => {
    await supabase
      .from('taken')
      .update({ status: newStatus })
      .eq('id', taak.id)
    onUpdate()
  }

  const handleArchive = async () => {
    setArchiving(true)
    await supabase
      .from('taken')
      .update({ gearchiveerd: true })
      .eq('id', taak.id)
    onUpdate()
    setArchiving(false)
  }

  const handleEditSubmit = () => {
    setShowEditModal(false)
    onUpdate()
  }

  return (
    <>
      <Card borderColor={PRIORITY_BORDER_COLORS[taak.prioriteit]}>
        {/* Main row - always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3
                className={cn(
                  'font-medium text-gray-900 truncate',
                  taak.status === 'gereed' && 'line-through text-gray-500'
                )}
              >
                {taak.titel}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge className={STATUS_COLORS[taak.status]}>
                  {STATUS_LABELS[taak.status]}
                </Badge>
                <Badge className={PRIORITEIT_COLORS[taak.prioriteit]}>
                  {PRIORITEIT_LABELS[taak.prioriteit]}
                </Badge>
                {taak.deadline && (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Calendar size={12} />
                    {formatDate(taak.deadline)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {assignee && (
                <Avatar
                  naam={assignee.naam}
                  kleur={assignee.kleur}
                  size="sm"
                />
              )}
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={18} className="text-gray-400" />
              </motion.div>
            </div>
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
                {/* Description */}
                {taak.omschrijving && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {taak.omschrijving}
                  </p>
                )}

                {/* Assignee display */}
                {assignee && (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <User size={14} />
                    <span>Toegewezen aan {assignee.naam}</span>
                  </div>
                )}

                {/* Inline status change */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-500">
                    Status wijzigen
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      ['open', 'bezig', 'gereed'] as TaakStatus[]
                    ).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border',
                          taak.status === s
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Pencil size={14} />
                    Bewerken
                  </button>
                  {canArchive && (
                    <button
                      onClick={handleArchive}
                      disabled={archiving}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      <Archive size={14} />
                      {archiving ? 'Archiveren...' : 'Archiveren'}
                    </button>
                  )}
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
        title="Taak bewerken"
      >
        <TaskForm
          profiles={allProfiles}
          currentUserId={currentUserId}
          existingTask={taak}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
        />
      </Modal>
    </>
  )
}
