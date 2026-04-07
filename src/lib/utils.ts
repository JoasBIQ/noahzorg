import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns'
import { nl } from 'date-fns/locale'

export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isToday(d)) return 'Vandaag'
  if (isTomorrow(d)) return 'Morgen'
  if (isYesterday(d)) return 'Gisteren'
  return format(d, 'd MMMM yyyy', { locale: nl })
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date
  const dateStr = formatDate(d)
  const timeStr = format(d, 'HH:mm')
  return `${dateStr} om ${timeStr}`
}

export function formatTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'HH:mm')
}

export function formatRelative(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: nl })
}

export function getInitials(naam: string) {
  return naam
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 6) return 'Goedenacht'
  if (hour < 12) return 'Goedemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goedenavond'
}
