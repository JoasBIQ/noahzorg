'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, BookOpen, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { LogEntryCard } from '@/components/logboek/log-entry'
import { LogForm } from '@/components/logboek/log-form'
import { CATEGORIE_LABELS } from '@/lib/constants'
import type { LogEntry, Profile, LogboekCategorie } from '@/types'

interface LogboekPageProps {
  initialEntries: LogEntry[]
  allProfiles: Profile[]
  currentProfile: Profile
  currentUserId: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

export function LogboekPage({
  initialEntries,
  allProfiles,
  currentProfile,
  currentUserId,
}: LogboekPageProps) {
  const [entries, setEntries] = useState<LogEntry[]>(initialEntries)
  const [showForm, setShowForm] = useState(false)
  const [filterCategorie, setFilterCategorie] = useState<string>('alle')
  const [filterAuteur, setFilterAuteur] = useState<string>('alle')
  const [showArchived, setShowArchived] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const supabase = createClient()

  // Refetch entries when showArchived changes or after realtime event
  const fetchEntries = useCallback(async () => {
    let query = supabase
      .from('logboek')
      .select('*')
      .order('created_at', { ascending: false })

    if (!showArchived) {
      query = query.eq('gearchiveerd', false)
    }

    const { data } = await query
    if (data) {
      setEntries(data as LogEntry[])
    }
  }, [showArchived, supabase])

  // Subscribe to realtime changes on logboek table
  useRealtime('logboek', () => {
    fetchEntries()
  })

  // Refetch when showArchived toggle changes
  const handleToggleArchived = async () => {
    const newVal = !showArchived
    setShowArchived(newVal)

    let query = supabase
      .from('logboek')
      .select('*')
      .order('created_at', { ascending: false })

    if (!newVal) {
      query = query.eq('gearchiveerd', false)
    }

    const { data } = await query
    if (data) {
      setEntries(data as LogEntry[])
    }
  }

  // Filter entries client-side
  const filteredEntries = entries.filter((entry) => {
    if (filterCategorie !== 'alle' && entry.categorie !== filterCategorie) {
      return false
    }
    if (filterAuteur !== 'alle' && entry.auteur_id !== filterAuteur) {
      return false
    }
    return true
  })

  const handleFormSubmit = () => {
    setShowForm(false)
    fetchEntries()
  }

  const handleEntryUpdate = () => {
    fetchEntries()
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notities over Noah</h1>
          <p className="text-sm text-muted mt-0.5">
            Dagelijkse notities en observaties
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
        </Button>
      </div>

      {/* Filter bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl shadow-sm">
              {/* Categorie filter */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Categorie
                </label>
                <select
                  value={filterCategorie}
                  onChange={(e) => setFilterCategorie(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="alle">Alle</option>
                  {(
                    Object.entries(CATEGORIE_LABELS) as [
                      LogboekCategorie,
                      string
                    ][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auteur filter */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Auteur
                </label>
                <select
                  value={filterAuteur}
                  onChange={(e) => setFilterAuteur(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="alle">Iedereen</option>
                  {allProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.naam}
                    </option>
                  ))}
                </select>
              </div>

              {/* Archived toggle */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Gearchiveerd
                </label>
                <button
                  onClick={handleToggleArchived}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    showArchived
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {showArchived ? 'Toon alles' : 'Toon gearchiveerd'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries list */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nog geen berichten"
          description={
            filterCategorie !== 'alle' || filterAuteur !== 'alle'
              ? 'Er zijn geen berichten die aan de filters voldoen.'
              : 'Schrijf de eerste notitie over Noah.'
          }
        />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {filteredEntries.map((entry) => (
            <motion.div key={entry.id} variants={itemVariants}>
              <LogEntryCard
                entry={entry}
                allProfiles={allProfiles}
                currentProfile={currentProfile}
                currentUserId={currentUserId}
                onUpdate={handleEntryUpdate}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* FAB - Nieuw bericht */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-full shadow-lg hover:bg-primary-dark transition-colors"
      >
        <Plus size={20} />
        <span className="font-medium">Nieuw bericht</span>
      </motion.button>

      {/* New entry modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Nieuwe notitie"
      >
        <LogForm
          currentUserId={currentUserId}
          currentProfile={currentProfile}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  )
}
