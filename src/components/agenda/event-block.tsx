'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Familieagenda: zachtgroen (huisstijl), Noah's agenda: terracotta (accentkleur)
const SOURCE_COLORS: Record<'family' | 'noah', string> = {
  family: '#4A7C59',
  noah: '#C4704F',
}

interface EventBlockProps {
  title: string
  time: string
  isGoogleEvent: boolean
  googleSource?: 'family' | 'noah'
  typeColor?: string
  style: React.CSSProperties
  onClick: () => void
}

export function EventBlock({
  title,
  time,
  isGoogleEvent,
  googleSource,
  typeColor,
  style,
  onClick,
}: EventBlockProps) {
  const color = isGoogleEvent
    ? SOURCE_COLORS[googleSource ?? 'family']
    : typeColor || '#6B7280'

  const bgColor = `${color}26`

  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      className={cn(
        'absolute rounded-lg overflow-hidden cursor-pointer',
        'px-2 py-1 z-10'
      )}
      style={{
        ...style,
        borderLeft: `3px solid ${color}`,
        backgroundColor: bgColor,
      }}
      onClick={onClick}
    >
      <p className="text-xs font-medium text-gray-900 truncate">{title}</p>
      <p className="text-[10px] text-gray-500">{time}</p>
    </motion.div>
  )
}
