'use client'

import { useEffect, useRef, useMemo } from 'react'
import { isSameDay, isToday, getHours, getMinutes, format, setHours, setMinutes } from 'date-fns'
import { nl } from 'date-fns/locale'
import { EventBlock } from '@/components/agenda/event-block'
import type { AgendaItem, GoogleCalendarEvent, AgendaType } from '@/types'

const TYPE_COLORS: Record<AgendaType, string> = {
  medisch: '#EF4444',
  zorg: '#4A7C59',
  juridisch: '#8B5CF6',
  sociaal: '#EAB308',
  overleg: '#3B82F6',
  overig: '#6B7280',
}

const HOUR_HEIGHT = 64
const HOURS = Array.from({ length: 24 }, (_, i) => i)

interface DayViewProps {
  date: Date
  items: AgendaItem[]
  googleEvents: GoogleCalendarEvent[]
  onSelectTime: (date: Date) => void
  onSelectEvent: (item: AgendaItem) => void
  onSelectGoogleEvent: (event: GoogleCalendarEvent) => void
}

function getTopPosition(dateStr: string): number {
  const d = new Date(dateStr)
  const hours = getHours(d)
  const minutes = getMinutes(d)
  return ((hours * 60 + minutes) / 60) * HOUR_HEIGHT
}

function getBlockHeight(startStr: string, endStr: string | null | undefined): number {
  if (!endStr) return HOUR_HEIGHT // standaard 1 uur
  const start = new Date(startStr).getTime()
  const end = new Date(endStr).getTime()
  const durationMinutes = Math.max(15, (end - start) / (1000 * 60))
  return (durationMinutes / 60) * HOUR_HEIGHT
}

export function DayView({
  date,
  items,
  googleEvents,
  onSelectTime,
  onSelectEvent,
  onSelectGoogleEvent,
}: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const today = isToday(date)

  // Filter items for this day
  const dayItems = useMemo(
    () => items.filter((item) => isSameDay(new Date(item.datum_tijd), date)),
    [items, date]
  )

  const dayGoogleEvents = useMemo(
    () => googleEvents.filter((event) => isSameDay(new Date(event.start), date)),
    [googleEvents, date]
  )

  // Auto-scroll to current hour or 8:00
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = today ? getHours(new Date()) : 8
      scrollRef.current.scrollTop = scrollTo * HOUR_HEIGHT - HOUR_HEIGHT
    }
  }, [today, date])

  // Current time indicator position
  const now = new Date()
  const nowTop = ((getHours(now) * 60 + getMinutes(now)) / 60) * HOUR_HEIGHT

  const handleHourClick = (hour: number) => {
    const selected = setMinutes(setHours(date, hour), 0)
    onSelectTime(selected)
  }

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto relative"
      style={{ height: 'calc(100vh - 200px)' }}
    >
      <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
        {/* Hour rows */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute w-full flex border-t border-gray-100"
            style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          >
            {/* Hour label */}
            <div className="w-14 flex-shrink-0 pr-2 text-right">
              <span className="text-xs text-gray-400 -mt-2 block">
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>

            {/* Clickable area */}
            <div
              className="flex-1 cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => handleHourClick(hour)}
            />
          </div>
        ))}

        {/* Now indicator */}
        {today && (
          <div
            className="absolute left-14 right-0 z-20 pointer-events-none"
            style={{ top: nowTop }}
          >
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
              <div className="flex-1 h-[2px] bg-red-500" />
            </div>
          </div>
        )}

        {/* Local events */}
        {dayItems.map((item) => (
          <div key={item.id} className="absolute left-14 right-0">
            <EventBlock
              title={item.titel}
              time={format(new Date(item.datum_tijd), 'HH:mm', { locale: nl }) + (item.eind_tijd ? ` - ${format(new Date(item.eind_tijd), 'HH:mm', { locale: nl })}` : '')}
              isGoogleEvent={false}
              typeColor={TYPE_COLORS[item.type]}
              style={{
                position: 'absolute',
                top: getTopPosition(item.datum_tijd),
                height: getBlockHeight(item.datum_tijd, item.eind_tijd),
                left: 0,
                width: '100%',
              }}
              onClick={() => onSelectEvent(item)}
            />
          </div>
        ))}

        {/* Google/iCal events */}
        {dayGoogleEvents.map((event) => (
          <div key={event.id} className="absolute left-14 right-0">
            <EventBlock
              title={event.summary}
              time={format(new Date(event.start), 'HH:mm', { locale: nl }) + (event.end ? ` - ${format(new Date(event.end), 'HH:mm', { locale: nl })}` : '')}
              isGoogleEvent={true}
              style={{
                position: 'absolute',
                top: getTopPosition(event.start),
                height: getBlockHeight(event.start, event.end),
                left: 0,
                width: '100%',
              }}
              onClick={() => onSelectGoogleEvent(event)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
