import type { ReactNode } from 'react'

interface HeaderProps {
  title: string
  action?: ReactNode
}

export function Header({ title, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-[#FAFAF8]/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
