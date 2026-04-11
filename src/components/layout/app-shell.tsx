'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, User } from 'lucide-react'
import Link from 'next/link'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { NotificationBell } from './notification-bell'
import { NamePrompt } from '@/components/onboarding/name-prompt'
import { NoodinformatieModal } from '@/components/noah/noodinformatie-modal'
import { NotificatieBanner } from '@/components/notificatie-banner'
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
      <NoodinformatieModal open={noodOpen} onClose={() => setNoodOpen(false)} />

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Notificatiebel — fixed rechtsboven, zowel desktop als mobiel */}
      <div className="fixed top-4 right-4 z-40">
        <NotificationBell />
      </div>

      {/* Main content */}
      <main className="pb-20 lg:pl-64 lg:pb-0">
        {/* Mobiele topbar */}
        <div className="lg:hidden px-4 pt-3 pb-1 space-y-2">
          <div className="flex items-center gap-3 pr-10">
            <Link
              href="/profiel"
              className="flex items-center gap-1.5 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <User size={20} />
              {profile?.naam && (
                <span className="text-sm font-medium text-gray-700 leading-tight">
                  {profile.naam.length > 12
                    ? profile.naam.slice(0, 12) + '…'
                    : profile.naam.split(' ')[0]}
                </span>
              )}
            </Link>
            <span className="text-sm font-semibold text-gray-700">Rondom Noah</span>
          </div>
          <button
            onClick={() => setNoodOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 active:bg-red-800 shadow-sm"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Noodinformatie</span>
          </button>
        </div>

        {/* Notificatie banner — eenmalig per sessie als push nog niet is ingeschakeld */}
        <NotificatieBanner />

        {children}
      </main>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
