'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, AlertTriangle, User } from 'lucide-react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { NAV_ITEMS } from '@/lib/constants'
import { cn, getInitials } from '@/lib/utils'
import { useProfile } from '@/hooks/use-profile'
import { useMailCounts } from '@/hooks/use-mail-counts'
import { useOngelezen } from '@/hooks/use-ongelezen'
import { createClient } from '@/lib/supabase/client'
import { NoodinformatieModal } from '@/components/noah/noodinformatie-modal'
import { NotificationBell } from '@/components/layout/notification-bell'

function NavBadge({ count, color = 'bg-[#DC2626]' }: { count: number; color?: string }) {
  if (count <= 0) return null
  return (
    <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full ${color} px-1.5 text-[10px] font-semibold text-white`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useProfile()
  const mailCounts = useMailCounts()
  const ongelezen = useOngelezen()
  const [noodOpen, setNoodOpen] = useState(false)

  const filteredItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || profile?.rol === 'beheerder'
  )

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <NoodinformatieModal open={noodOpen} onClose={() => setNoodOpen(false)} />

      <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200 bg-[#FAFAF8]">
        {/* Logo + notificatiebel */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-5">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden bg-[#FAFAF8]">
            <Image src="/icons/icon-192x192.png" alt="Noah's Zorg" width={44} height={44} />
          </div>
          <span className="flex-1 text-lg font-semibold text-gray-900">
            Noah&apos;s Zorg
          </span>
          <NotificationBell />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              const Icon = item.icon

              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <motion.div
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-[#4A7C59]/10 text-[#4A7C59]'
                          : 'text-[#6B7280] hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>

                      {/* Badges per nav item */}
                      {item.href === '/logboek' && (
                        <NavBadge count={ongelezen.notities} />
                      )}
                      {item.href === '/overleggen' && (
                        <NavBadge count={ongelezen.overleggen} />
                      )}
                      {item.href === '/mail' && (
                        <span className="flex items-center gap-1">
                          {mailCounts.unread > 0 && (
                            <NavBadge count={mailCounts.unread} />
                          )}
                          {mailCounts.overleg > 0 && (
                            <NavBadge count={mailCounts.overleg} color="bg-orange-500" />
                          )}
                          {mailCounts.unread === 0 && mailCounts.overleg === 0 && mailCounts.drafts > 0 && (
                            <NavBadge count={mailCounts.drafts} color="bg-gray-400" />
                          )}
                        </span>
                      )}
                    </motion.div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Noodinformatie knop + user + logout */}
        <div className="px-3 pb-4">
          <Link href="/profiel">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className={cn(
                'mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === '/profiel'
                  ? 'bg-[#4A7C59]/10 text-[#4A7C59]'
                  : 'text-[#6B7280] hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <User className="h-5 w-5 flex-shrink-0" />
              <span>Mijn profiel</span>
            </motion.div>
          </Link>

          <button
            onClick={() => setNoodOpen(true)}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 active:bg-red-800"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Noodinformatie</span>
          </button>

          <div className="border-t border-gray-200 pt-4">
            {profile && (
              <div className="mb-3 flex items-center gap-3 rounded-lg px-3 py-2">
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: profile.kleur ?? '#4A7C59' }}
                >
                  {getInitials(profile.naam)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {profile.naam}
                  </p>
                  <p className="truncate text-xs text-[#6B7280] capitalize">
                    {profile.rol}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#6B7280] transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5" />
              <span>Uitloggen</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
