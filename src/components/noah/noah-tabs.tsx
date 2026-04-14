'use client'

import { useState, useRef, useEffect } from 'react'
import { Briefcase, Stethoscope, Users2, FolderOpen, ClipboardList, ChevronRight, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Header } from '@/components/layout/header'
import { WieIsNoahTab } from '@/components/noah/wie-is-noah-tab'
import { PraktischTab } from '@/components/noah/praktisch-tab'
import { MedischTab } from '@/components/noah/medisch-tab'
import { ContactenTab } from '@/components/noah/contacten-tab'
import { DossierTab } from '@/components/noah/dossier-tab'
import { ZorgplanContent } from '@/components/zorgplan/zorgplan-content'
import { NotitiesTab } from '@/components/noah/notities-tab'
import type { Profile, NoahProfiel } from '@/types'

interface NoahTabsProps {
  noahProfiel: NoahProfiel | null
  currentProfile: Profile
  updatedByProfile: Profile | null
}

function NoahTabIcon(_props: { size?: number; className?: string }) {
  return <Image src="/icons/icon-192x192.png" alt="" width={16} height={16} className="flex-shrink-0" />
}

const TABS = [
  { id: 'wie-is-noah', label: 'Wie is Noah', icon: NoahTabIcon },
  { id: 'notities', label: 'Notities', icon: BookOpen },
  { id: 'praktisch', label: 'Praktisch', icon: Briefcase },
  { id: 'medisch', label: 'Medisch', icon: Stethoscope },
  { id: 'contacten', label: 'Contacten', icon: Users2 },
  { id: 'dossier', label: 'Dossier', icon: FolderOpen },
  { id: 'zorgplan', label: 'Zorgplan', icon: ClipboardList },
] as const

type TabId = (typeof TABS)[number]['id']

export function NoahTabs({ noahProfiel, currentProfile, updatedByProfile }: NoahTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('wie-is-noah')
  const tabsScrollRef = useRef<HTMLDivElement>(null)
  const [showScrollHint, setShowScrollHint] = useState(true)

  // Controleer of tabs überhaupt scrollbaar zijn (alleen op smal scherm)
  useEffect(() => {
    const el = tabsScrollRef.current
    if (!el) return
    // Als er geen overflow is, hoeven we de hint niet te tonen
    if (el.scrollWidth <= el.clientWidth) {
      setShowScrollHint(false)
    }
  }, [])

  function handleTabsScroll() {
    if (showScrollHint) setShowScrollHint(false)
  }

  return (
    <div>
      <Header title="Noah" />

      {/* Tabs met scroll-indicator */}
      <div className="relative border-b border-gray-200">
        <div
          ref={tabsScrollRef}
          className="px-4 sm:px-6 overflow-x-auto"
          onScroll={handleTabsScroll}
        >
        <nav className="flex gap-1 -mb-px min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-[#4A7C59]'
                    : 'text-[#6B7280] hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="noah-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A7C59]"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </nav>
        </div>

        {/* Scroll-hint: gradient + chevron, verdwijnt na eerste scroll */}
        <AnimatePresence>
          {showScrollHint && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none absolute right-0 top-0 bottom-0 flex items-center justify-end pr-2 w-12 bg-gradient-to-l from-white to-transparent sm:hidden"
            >
              <ChevronRight size={16} className="text-gray-400" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'wie-is-noah' && (
          <WieIsNoahTab currentUserId={currentProfile.id} />
        )}
        {activeTab === 'notities' && (
          <NotitiesTab currentProfile={currentProfile} />
        )}
        {activeTab === 'praktisch' && (
          <PraktischTab currentUserId={currentProfile.id} />
        )}
        {activeTab === 'medisch' && (
          <MedischTab currentUserId={currentProfile.id} />
        )}
        {activeTab === 'contacten' && (
          <ContactenTab currentUserId={currentProfile.id} />
        )}
        {activeTab === 'dossier' && (
          <DossierTab currentUserId={currentProfile.id} />
        )}
        {activeTab === 'zorgplan' && (
          <ZorgplanContent currentUserId={currentProfile.id} currentProfile={currentProfile} />
        )}
      </div>
    </div>
  )
}
