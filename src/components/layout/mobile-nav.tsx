'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/use-profile'
import { useMailCounts } from '@/hooks/use-mail-counts'
import { useOngelezen } from '@/hooks/use-ongelezen'

export function MobileNav() {
  const pathname = usePathname()
  const { profile } = useProfile()
  const mailCounts = useMailCounts()
  const ongelezen = useOngelezen()

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="flex items-center justify-around px-2 py-1">
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
                    'flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors',
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
      </ul>
    </nav>
  )
}
