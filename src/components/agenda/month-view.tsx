'use client'

import { useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  format,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { AgendaItem, GoogleCalendarEvent, AgendaType } from '@/types'

const TYPE_COLORS: Record<AgendaType, string> = {
  medisch: '#EF4444',
  zorg: '#4A7C59',
  juridisch: '#8B5CF6',
  sociaal: '#EAB308',
  overleg: '#3B82F6',
  overig: '#6B7280',
}

const DAY_HEADERS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const MAX_VISIBLE_EVENTS = 3

interface MonthViewProps {
  date: Date
  items: AgendaItem[]
  googleEvents: GoogleCalendarEvent[]
  onSelectDate: (date: Date) => void
  onSelectEvent: (item: AgendaItem) => void
  onSelectGoogleEvent: (event: GoogleCalendarEvent) => void
}

export function MonthView({
  date,
  items,
  googleEvents,
  onSelectDate,
  onSelectEvent,
  onSelectGoogleEvent,
}: MonthViewProps) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)

  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [monthStart.toISOString(), monthEnd.toISOString()])

  // Pre-compute events per day
  const eventsByDay = useMemo(() => {
    const map = new Map<
      string,
      { localItems: AgendaItem[]; googleItems: GoogleCalendarEvent[] }
    >()

    calendarDays.forEach((day) => {
      const key = format(day, 'yyyy-MM-dd')
      const localItems = items.filter((item) =>
        isSameDay(new Date(item.datum_tijd), day)
      )
      const googleItems = googleEvents.filter((event) =>
        isSameDay(new Date(event.start), day)
      )
      map.set(key, { localItems, googleItems })
    })

    return map
  }, [calendarDays, items, googleEvents])

  return (
    <div>
      {/* Day name headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 uppercase py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-t border-l border-gray-200">
        {calendarDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, date)
          const dayIsToday = isToday(day)
          const dayEvents = eventsByDay.get(key) || {
            localItems: [],
            googleItems: [],
          }
          const totalEvents =
            dayEvents.localItems.length + dayEvents.googleItems.length
          const overflow = totalEvents - MAX_VISIBLE_EVENTS

          // Merge events for display, limited to MAX_VISIBLE_EVENTS
          const visibleLocal = dayEvents.localItems.slice(0, MAX_VISIBLE_EVENTS)
          const remainingSlots = MAX_VISIBLE_EVENTS - visibleLocal.length
          const visibleGoogle = dayEvents.googleItems.slice(0, remainingSlots)

          return (
            <div
              key={key}
              className={cn(
                'border-b border-r border-gray-200 min-h-[100px] lg:min-h-[120px] p-1 cursor-pointer hover:bg-gray-50/50 transition-colors',
                !inMonth && 'opacity-30'
              )}
              onClick={() => onSelectDate(day)}
            >
              {/* Day number */}
              <div className="flex justify-end mb-0.5">
                <span
                  className={cn(
                    'text-sm inline-flex items-center justify-center',
                    dayIsToday
                      ? 'w-7 h-7 rounded-full bg-[#4A7C59] text-white font-medium'
                      : 'text-gray-900'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Event pills */}
              <div className="space-y-0.5">
                {visibleLocal.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md px-1.5 py-0.5 text-[10px] truncate cursor-pointer text-white font-medium"
                    style={{ backgroundColor: TYPE_COLORS[item.type] }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectEvent(item)
                    }}
                  >
                    {item.titel}
                  </div>
                ))}
                {visibleGoogle.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-md px-1.5 py-0.5 text-[10px] truncate cursor-pointer font-medium text-white"
                    style={{
                      backgroundColor: event.source === 'noah' ? '#C4704F' : '#4A7C59',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectGoogleEvent(event)
                    }}
                  >
                    {event.summary}
                  </div>
                ))}
                {overflow > 0 && (
                  <p className="text-[10px] text-gray-500 px-1">
                    +{overflow} meer
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
