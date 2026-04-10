'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Grid, MessageSquare, Mail, HardDrive, Users2, X } from 'lucide-react'
import { NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/use-profile'
import { useMailCounts } from '@/hooks/use-mail-counts'
import { useOngelezen } from '@/hooks/use-ongelezen'

const MEER_ITEMS = [
  { label: 'Familieoverleg', href: '/overleggen', icon: MessageSquare },
  { label: 'Mail', href: '/mail', icon: Mail },
  { label: 'Drive', href: '/drive', icon: HardDrive },
  { label: 'Rondom Noah', href: '/team', icon: Users2 },
] as const

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useProfile()
  const mailCounts = useMailCounts()
  const ongelezen = useOngelezen()
  const [meerOpen, setMeerOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || profile?.rol === 'beheerder'
  ).slice(0, 5)

  function getBadge(href: string): { count: number; color: string; side: 'right' | 'left' }[] {
    if (href === '/logboek' && ongelezen.notities > 0) {
      return [{ count: ongelezen.notities, color: 'bg-[#DC2626]', side: 'right' }]
    }
    if (href === '/overleggen' && ongelezen.overleggen > 0) {
      return [{ count: ongelezen.overleggen, color: 'bg-[#DC2626]', side: 'right' }]
    }
    if (href === '/mail') {
      const badges = []
      if (mailCounts.unread > 0) {
        badges.push({ count: mailCounts.unread, color: 'bg-[#DC2626]', side: 'right' as const })
      } else if (mailCounts.drafts > 0) {
        badges.push({ count: mailCounts.drafts, color: 'bg-gray-400', side: 'right' as const })
      }
      if (mailCounts.overleg > 0) {
        badges.push({ count: mailCounts.overleg, color: 'bg-orange-500', side: 'left' as const })
      }
      return badges
    }
    return []
  }

  // Badge op "Meer" als er ongelezen items zijn in verborgen pagina's
  const meerBadgeCount =
    (ongelezen.overleggen ?? 0) +
    (mailCounts.unread ?? 0) +
    (mailCounts.overleg ?? 0)

  // "Meer" is actief als de huidige pagina een verborgen pagina is
  const meerActive = MEER_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  function handleMeerItemClick(href: string) {
    setMeerOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <ul className="flex items-center justify-around px-1 py-1">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon
            const badges = getBadge(item.href)

            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'flex min-h-[48px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 py-1.5 transition-colors',
                      isActive ? 'text-[#4A7C59]' : 'text-[#6B7280]'
                    )}
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                      {badges.map((b, i) => (
                        <span
                          key={i}
                          className={cn(
                            'absolute flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white leading-none',
                            b.color,
                            b.side === 'right' ? '-top-1.5 -right-1.5' : '-top-1.5 -left-1.5'
                          )}
                        >
                          {b.count > 99 ? '99+' : b.count}
                        </span>
                      ))}
                    </div>
                    <span className={cn('text-[10px] leading-tight', isActive ? 'font-semibold' : 'font-medium')}>
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              </li>
            )
          })}

          {/* Meer-knop */}
          <li>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMeerOpen(true)}
              className={cn(
                'flex min-h-[48px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 py-1.5 transition-colors',
                meerActive || meerOpen ? 'text-[#4A7C59]' : 'text-[#6B7280]'
              )}
            >
              <div className="relative">
                <Grid className="h-5 w-5" strokeWidth={meerActive || meerOpen ? 2.5 : 2} />
                {meerBadgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[9px] font-bold text-white leading-none">
                    {meerBadgeCount > 99 ? '99+' : meerBadgeCount}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] leading-tight', meerActive || meerOpen ? 'font-semibold' : 'font-medium')}>
                Meer
              </span>
            </motion.button>
          </li>
        </ul>
      </nav>

      {/* Bottomsheet overlay */}
      <AnimatePresence>
        {meerOpen && (
          <>
            {/* Dimmed backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setMeerOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-gray-300" />
              </div>

              {/* Titelbalk */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-base font-semibold text-gray-900">Meer pagina's</span>
                <button
                  onClick={() => setMeerOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigatie-items */}
              <ul className="px-2 py-2">
                {MEER_ITEMS.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const badges = getBadge(item.href)
                  const badgeCount = badges.reduce((sum, b) => sum + b.count, 0)

                  return (
                    <li key={item.href}>
                      <button
                        onClick={() => handleMeerItemClick(item.href)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-3.5 transition-colors text-left',
                          isActive
                            ? 'bg-[#4A7C59]/10 text-[#4A7C59]'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        )}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 flex-shrink-0">
                          <Icon size={20} className={isActive ? 'text-[#4A7C59]' : 'text-gray-500'} />
                        </div>
                        <span className="flex-1 text-sm font-medium">{item.label}</span>
                        {badgeCount > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#DC2626] px-1.5 text-[11px] font-bold text-white leading-none">
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
