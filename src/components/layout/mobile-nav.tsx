'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/use-profile'
import { useMailCounts } from '@/hooks/use-mail-counts'

export function MobileNav() {
  const pathname = usePathname()
  const { profile } = useProfile()
  const mailCounts = useMailCounts()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || profile?.rol === 'beheerder'
  ).slice(0, 5)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="flex items-center justify-around px-2 py-1">
        {visibleItems.map((item) => {
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
                    'flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors',
                    isActive
                      ? 'text-[#4A7C59]'
                      : 'text-[#6B7280]'
                  )}
                >
                  <div className="relative">
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {item.href === '/mail' && mailCounts.unread > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white leading-none">
                        {mailCounts.unread > 99 ? '99+' : mailCounts.unread}
                      </span>
                    )}
                    {item.href === '/mail' && mailCounts.unread === 0 && mailCounts.overleg === 0 && mailCounts.drafts > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gray-400 px-1 text-[9px] font-bold text-white leading-none">
                        {mailCounts.drafts > 99 ? '99+' : mailCounts.drafts}
                      </span>
                    )}
                    {item.href === '/mail' && mailCounts.overleg > 0 && (
                      <span className="absolute -top-1.5 -left-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white leading-none">
                        {mailCounts.overleg > 99 ? '99+' : mailCounts.overleg}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] leading-tight',
                      isActive ? 'font-semibold' : 'font-medium'
                    )}
                  >
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
