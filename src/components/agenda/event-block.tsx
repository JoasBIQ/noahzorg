'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EventBlockProps {
  title: string
  time: string
  isGoogleEvent: boolean
  typeColor?: string
  style: React.CSSProperties
  onClick: () => void
}

const GOOGLE_EVENT_COLOR = '#93C5FD'

export function EventBlock({
  title,
  time,
  isGoogleEvent,
  typeColor,
  style,
  onClick,
}: EventBlockProps) {
  const borderColor = isGoogleEvent ? GOOGLE_EVENT_COLOR : typeColor || '#6B7280'
  const bgColor = isGoogleEvent
    ? 'rgba(147, 197, 253, 0.2)'
    : typeColor
      ? `${typeColor}26`
      : 'rgba(107, 114, 128, 0.15)'

  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      className={cn(
        'absolute rounded-lg overflow-hidden cursor-pointer',
        'px-2 py-1 z-10'
      )}
      style={{
        ...style,
        borderLeft: `3px solid ${borderColor}`,
        backgroundColor: bgColor,
      }}
      onClick={onClick}
    >
      <p className="text-xs font-medium text-gray-900 truncate">{title}</p>
      <p className="text-[10px] text-gray-500">{time}</p>
    </motion.div>
  )
}
