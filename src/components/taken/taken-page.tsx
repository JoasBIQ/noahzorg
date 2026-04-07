'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckSquare, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { TaskCard } from '@/components/taken/task-card'
import { TaskForm } from '@/components/taken/task-form'
import {
  STATUS_LABELS,
  PRIORITEIT_LABELS,
} from '@/lib/constants'
import type { Taak, Profile, TaakStatus, TaakPrioriteit } from '@/types'

interface TakenPageProps {
  initialTaken: Taak[]
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

export function TakenPage({
  initialTaken,
  allProfiles,
  currentProfile,
  currentUserId,
}: TakenPageProps) {
  const [taken, setTaken] = useState<Taak[]>(initialTaken)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('alle')
  const [filterAssignee, setFilterAssignee] = useState<string>('alle')
  const [filterPrioriteit, setFilterPrioriteit] = useState<string>('alle')
  const [showArchived, setShowArchived] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [prefillTitel, setPrefillTitel] = useState('')
  const [prefillOmschrijving, setPrefillOmschrijving] = useState('')

  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check for logboek prefill params
  useEffect(() => {
    const from = searchParams.get('from')
    const id = searchParams.get('id')
    if (from === 'logboek' && id) {
      // Fetch the logboek entry to prefill
      const fetchEntry = async () => {
        const { data } = await supabase
          .from('logboek')
          .select('*')
          .eq('id', id)
          .single()
        if (data) {
          setPrefillTitel('')
          setPrefillOmschrijving(data.bericht)
          setShowForm(true)
        }
      }
      fetchEntry()
    }
  }, [searchParams, supabase])

  const fetchTaken = useCallback(async () => {
    let query = supabase
      .from('taken')
      .select('*')
      .order('created_at', { ascending: false })

    if (!showArchived) {
      query = query.eq('gearchiveerd', false)
    }

    const { data } = await query
    if (data) {
      setTaken(data as Taak[])
    }
  }, [showArchived, supabase])

  // Subscribe to realtime changes
  useRealtime('taken', () => {
    fetchTaken()
  })

  const handleToggleArchived = async () => {
    const newVal = !showArchived
    setShowArchived(newVal)

    let query = supabase
      .from('taken')
      .select('*')
      .order('created_at', { ascending: false })

    if (!newVal) {
      query = query.eq('gearchiveerd', false)
    }

    const { data } = await query
    if (data) {
      setTaken(data as Taak[])
    }
  }

  // Filter taken client-side
  const filteredTaken = taken.filter((taak) => {
    if (filterStatus !== 'alle' && taak.status !== filterStatus) return false
    if (filterAssignee !== 'alle' && taak.toegewezen_aan !== filterAssignee)
      return false
    if (filterPrioriteit !== 'alle' && taak.prioriteit !== filterPrioriteit)
      return false
    return true
  })

  const handleFormSubmit = () => {
    setShowForm(false)
    setPrefillTitel('')
    setPrefillOmschrijving('')
    fetchTaken()
  }

  const handleFormClose = () => {
    setShowForm(false)
    setPrefillTitel('')
    setPrefillOmschrijving('')
  }

  const handleTaskUpdate = () => {
    fetchTaken()
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Taken</h1>
          <p className="text-sm text-muted mt-0.5">
            Openstaande taken en actiepunten
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
              {/* Status filter */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="alle">Alle</option>
                  {(
                    ['open', 'bezig', 'gereed'] as TaakStatus[]
                  ).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee filter */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Toegewezen aan
                </label>
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
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

              {/* Priority filter */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Prioriteit
                </label>
                <select
                  value={filterPrioriteit}
                  onChange={(e) => setFilterPrioriteit(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="alle">Alle</option>
                  {(
                    Object.entries(PRIORITEIT_LABELS) as [
                      TaakPrioriteit,
                      string
                    ][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
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

      {/* Tasks list */}
      {filteredTaken.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Geen taken gevonden"
          description={
            filterStatus !== 'alle' ||
            filterAssignee !== 'alle' ||
            filterPrioriteit !== 'alle'
              ? 'Er zijn geen taken die aan de filters voldoen.'
              : 'Maak de eerste taak aan om te beginnen.'
          }
        />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {filteredTaken.map((taak) => (
            <motion.div key={taak.id} variants={itemVariants}>
              <TaskCard
                taak={taak}
                allProfiles={allProfiles}
                currentUserId={currentUserId}
                onUpdate={handleTaskUpdate}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* FAB - Nieuwe taak */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-full shadow-lg hover:bg-primary-dark transition-colors"
      >
        <Plus size={20} />
        <span className="font-medium">Nieuwe taak</span>
      </motion.button>

      {/* New/prefill task modal */}
      <Modal
        open={showForm}
        onClose={handleFormClose}
        title="Nieuwe taak"
      >
        <TaskForm
          profiles={allProfiles}
          currentUserId={currentUserId}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          prefillTitel={prefillTitel}
          prefillOmschrijving={prefillOmschrijving}
        />
      </Modal>
    </div>
  )
}
