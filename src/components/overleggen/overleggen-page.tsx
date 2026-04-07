'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Users, Search, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Header } from '@/components/layout/header'
import { OverlegCard } from '@/components/overleggen/overleg-card'
import { OverlegForm } from '@/components/overleggen/overleg-form'
import type { Overleg, Profile } from '@/types'

interface OverleggenPageProps {
  initialOverleggen: Overleg[]
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

export function OverleggenPage({
  initialOverleggen,
  allProfiles,
  currentProfile,
  currentUserId,
}: OverleggenPageProps) {
  const [overleggen, setOverleggen] = useState<Overleg[]>(initialOverleggen)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const supabase = createClient()
  const isBeheerder = currentProfile?.rol === 'beheerder'

  const fetchOverleggen = useCallback(async () => {
    const { data } = await supabase
      .from('overleggen')
      .select('*')
      .order('datum_tijd', { ascending: false })

    if (data) {
      setOverleggen(data as Overleg[])
    }
  }, [supabase])

  useRealtime('overleggen', () => {
    fetchOverleggen()
  })

  // Filter: search + archief
  const filtered = useMemo(() => {
    let result = overleggen

    // Archief filter
    if (!showArchived) {
      result = result.filter((o) => !o.gearchiveerd)
    }

    // Zoekfilter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((o) => o.titel.toLowerCase().includes(q))
    }

    return result
  }, [overleggen, searchQuery, showArchived])

  const now = new Date().toISOString()
  const aankomend = filtered.filter((o) => o.datum_tijd >= now && !o.gearchiveerd)
    .sort((a, b) => a.datum_tijd.localeCompare(b.datum_tijd))
  const afgerond = filtered.filter((o) => o.datum_tijd < now && !o.gearchiveerd)
  const gearchiveerd = filtered.filter((o) => o.gearchiveerd)

  const handleFormSubmit = () => {
    setShowForm(false)
    fetchOverleggen()
  }

  const handleOverlegUpdate = () => {
    fetchOverleggen()
  }

  return (
    <>
      <Header title="Familieoverleg" />

      <div className="p-4 lg:p-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek familieoverleg..."
            className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>

        {/* Aankomend */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Aankomend
          </h2>
          {aankomend.length === 0 ? (
            <p className="text-sm text-muted py-4">
              Geen aankomend familieoverleg.
            </p>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {aankomend.map((overleg) => (
                <motion.div key={overleg.id} variants={itemVariants}>
                  <OverlegCard
                    overleg={overleg}
                    allProfiles={allProfiles}
                    currentProfile={currentProfile}
                    currentUserId={currentUserId}
                    onUpdate={handleOverlegUpdate}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Afgerond */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Afgerond
          </h2>
          {afgerond.length === 0 ? (
            <p className="text-sm text-muted py-4">
              Geen afgerond familieoverleg.
            </p>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {afgerond.map((overleg) => (
                <motion.div key={overleg.id} variants={itemVariants}>
                  <OverlegCard
                    overleg={overleg}
                    allProfiles={allProfiles}
                    currentProfile={currentProfile}
                    currentUserId={currentUserId}
                    onUpdate={handleOverlegUpdate}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Gearchiveerd toggle + sectie */}
        <section>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors mb-4 ${
              showArchived
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Archive size={14} />
            {showArchived ? 'Verberg gearchiveerd' : 'Toon gearchiveerd'}
            {gearchiveerd.length > 0 && showArchived && (
              <span className="ml-1">({gearchiveerd.length})</span>
            )}
          </button>

          <AnimatePresence>
            {showArchived && gearchiveerd.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Gearchiveerd
                </h2>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {gearchiveerd.map((overleg) => (
                    <motion.div key={overleg.id} variants={itemVariants}>
                      <OverlegCard
                        overleg={overleg}
                        allProfiles={allProfiles}
                        currentProfile={currentProfile}
                        currentUserId={currentUserId}
                        onUpdate={handleOverlegUpdate}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {showArchived && gearchiveerd.length === 0 && (
            <p className="text-sm text-muted py-4">
              Geen gearchiveerd familieoverleg.
            </p>
          )}
        </section>

        {/* Show empty state only when no overleggen at all */}
        {overleggen.filter((o) => !o.gearchiveerd).length === 0 && !showArchived && (
          <EmptyState
            icon={Users}
            title="Nog geen familieoverleg"
            description="Plan het eerste familieoverleg om te beginnen."
          />
        )}

        {/* FAB */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-full shadow-lg hover:bg-primary-dark transition-colors"
        >
          <Plus size={20} />
          <span className="font-medium">Nieuw familieoverleg</span>
        </motion.button>

        {/* New overleg modal */}
        <Modal
          open={showForm}
          onClose={() => setShowForm(false)}
          title="Nieuw familieoverleg"
        >
          <OverlegForm
            profiles={allProfiles}
            currentUserId={currentUserId}
            onClose={() => setShowForm(false)}
            onSubmit={handleFormSubmit}
          />
        </Modal>
      </div>
    </>
  )
}
