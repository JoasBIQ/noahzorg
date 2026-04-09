'use client'

import { useState } from 'react'
import { Briefcase, Stethoscope, Users2, FolderOpen, ClipboardList } from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Header } from '@/components/layout/header'
import { WieIsNoahTab } from '@/components/noah/wie-is-noah-tab'
import { PraktischTab } from '@/components/noah/praktisch-tab'
import { MedischTab } from '@/components/noah/medisch-tab'
import { ContactenTab } from '@/components/noah/contacten-tab'
import { DossierTab } from '@/components/noah/dossier-tab'
import { ZorgplanContent } from '@/components/zorgplan/zorgplan-content'
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
  { id: 'praktisch', label: 'Praktisch', icon: Briefcase },
  { id: 'medisch', label: 'Medisch', icon: Stethoscope },
  { id: 'contacten', label: 'Contacten', icon: Users2 },
  { id: 'dossier', label: 'Dossier', icon: FolderOpen },
  { id: 'zorgplan', label: 'Zorgplan', icon: ClipboardList },
] as const

type TabId = (typeof TABS)[number]['id']

export function NoahTabs({ noahProfiel, currentProfile, updatedByProfile }: NoahTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('wie-is-noah')

  return (
    <div>
      <Header title="Noah" />

      {/* Tabs */}
      <div className="border-b border-gray-200 px-4 sm:px-6 overflow-x-auto">
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

      {/* Tab content */}
      <div>
        {activeTab === 'wie-is-noah' && (
          <WieIsNoahTab currentUserId={currentProfile.id} />
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
