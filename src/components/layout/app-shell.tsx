'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { NotificationBell } from './notification-bell'
import { NamePrompt } from '@/components/onboarding/name-prompt'
import { NoodinformatieModal } from '@/components/noah/noodinformatie-modal'
import { useProfile } from '@/hooks/use-profile'

interface AppShellProps {
  children: ReactNode
}

function looksLikeEmailPrefix(naam: string, email?: string | null): boolean {
  if (!naam) return true
  if (email) {
    const prefix = email.split('@')[0]
    if (naam === prefix) return true
  }
  return false
}

export function AppShell({ children }: AppShellProps) {
  const { profile, user, loading } = useProfile()
  const [nameCompleted, setNameCompleted] = useState(false)
  const [noodOpen, setNoodOpen] = useState(false)

  const needsName =
    !loading &&
    profile &&
    user &&
    !nameCompleted &&
    looksLikeEmailPrefix(profile.naam, user.email)

  if (needsName) {
    return (
      <NamePrompt
        profileId={profile.id}
        onComplete={() => {
          setNameCompleted(true)
          window.location.reload()
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Noodinformatie modal — beheerd door sidebar op desktop */}
      <NoodinformatieModal open={noodOpen} onClose={() => setNoodOpen(false)} />

      {/* Desktop sidebar (bevat eigen noodinformatie knop) */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="pb-20 lg:pl-64 lg:pb-0">
        {/* Mobiele topbar: notificatiebel + noodknop */}
        <div className="lg:hidden px-4 pt-3 pb-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Noah&apos;s Zorg</span>
            <NotificationBell />
          </div>
          <button
            onClick={() => setNoodOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 active:bg-red-800 shadow-sm"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Noodinformatie</span>
          </button>
        </div>

        {children}
      </main>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
