'use client'

import { useEffect, useRef, useMemo } from 'react'
import {
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isToday,
  getHours,
  getMinutes,
  format,
  setHours,
  setMinutes,
  eachDayOfInterval,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
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
const DAY_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

interface WeekViewProps {
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
  if (!endStr) return HOUR_HEIGHT
  const start = new Date(startStr).getTime()
  const end = new Date(endStr).getTime()
  const durationMinutes = Math.max(15, (end - start) / (1000 * 60))
  return (durationMinutes / 60) * HOUR_HEIGHT
}

interface PositionedEvent {
  id: string
  top: number
  column: number
  totalColumns: number
}

function computeOverlapPositions(
  events: { id: string; dateStr: string; endStr?: string | null }[]
): Map<string, { column: number; totalColumns: number }> {
  const result = new Map<string, { column: number; totalColumns: number }>()

  if (events.length <= 1) {
    events.forEach((e) => result.set(e.id, { column: 0, totalColumns: 1 }))
    return result
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()
  )

  const columns: string[][] = []

  for (const event of sorted) {
    const eventTop = getTopPosition(event.dateStr)
    const eventBottom = eventTop + getBlockHeight(event.dateStr, event.endStr)

    let placed = false
    for (let col = 0; col < columns.length; col++) {
      const lastInCol = columns[col][columns[col].length - 1]
      const lastEvent = sorted.find((e) => e.id === lastInCol)!
      const lastTop = getTopPosition(lastEvent.dateStr)
      const lastBottom = lastTop + getBlockHeight(lastEvent.dateStr, lastEvent.endStr)

      if (eventTop >= lastBottom) {
        columns[col].push(event.id)
        placed = true
        break
      }
    }

    if (!placed) {
      columns.push([event.id])
    }
  }

  const totalColumns = columns.length
  columns.forEach((col, colIndex) => {
    col.forEach((id) => {
      result.set(id, { column: colIndex, totalColumns })
    })
  })

  return result
}

export function WeekView({
  date,
  items,
  googleEvents,
  onSelectTime,
  onSelectEvent,
  onSelectGoogleEvent,
}: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 })

  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart.toISOString(), weekEnd.toISOString()]
  )

  // Auto-scroll to current hour or 8:00
  useEffect(() => {
    if (scrollRef.current) {
      const hasToday = days.some((d) => isToday(d))
      const scrollTo = hasToday ? getHours(new Date()) : 8
      scrollRef.current.scrollTop = scrollTo * HOUR_HEIGHT - HOUR_HEIGHT
    }
  }, [days])

  // Group items by day
  const itemsByDay = useMemo(() => {
    const map = new Map<number, AgendaItem[]>()
    days.forEach((day, index) => {
      map.set(
        index,
        items.filter((item) => isSameDay(new Date(item.datum_tijd), day))
      )
    })
    return map
  }, [items, days])

  const googleEventsByDay = useMemo(() => {
    const map = new Map<number, GoogleCalendarEvent[]>()
    days.forEach((day, index) => {
      map.set(
        index,
        googleEvents.filter((event) => isSameDay(new Date(event.start), day))
      )
    })
    return map
  }, [googleEvents, days])

  const now = new Date()
  const nowTop = ((getHours(now) * 60 + getMinutes(now)) / 60) * HOUR_HEIGHT
  const todayIndex = days.findIndex((d) => isToday(d))

  const handleCellClick = (dayIndex: number, hour: number) => {
    const selected = setMinutes(setHours(days[dayIndex], hour), 0)
    onSelectTime(selected)
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[840px]">
        {/* Day header row */}
        <div className="flex border-b border-gray-200">
          <div className="w-14 flex-shrink-0" />
          {days.map((day, index) => {
            const dayIsToday = isToday(day)
            return (
              <div
                key={index}
                className="flex-1 text-center py-2"
              >
                <span className="text-xs text-gray-500 uppercase">
                  {DAY_LABELS[index]}
                </span>
                <div className="mt-0.5">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center text-sm font-medium',
                      dayIsToday
                        ? 'w-7 h-7 rounded-full bg-[#4A7C59] text-white'
                        : 'text-gray-900'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Scrollable grid */}
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

                {/* Day columns */}
                {days.map((_, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={cn(
                      'flex-1 border-l border-gray-100 cursor-pointer hover:bg-gray-50/50 transition-colors',
                      dayIndex === 0 && 'border-l-0'
                    )}
                    onClick={() => handleCellClick(dayIndex, hour)}
                  />
                ))}
              </div>
            ))}

            {/* Now indicator */}
            {todayIndex >= 0 && (
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  top: nowTop,
                  left: `calc(3.5rem + ${(todayIndex / 7) * 100}% * (1 - 3.5rem / 100%))`,
                  width: `calc(100% / 7)`,
                  marginLeft: `calc(${todayIndex} * (100% - 3.5rem) / 7)`,
                }}
              >
                {/* Simplified: use the column structure */}
              </div>
            )}

            {/* Events per day column */}
            {days.map((day, dayIndex) => {
              const dayItems = itemsByDay.get(dayIndex) || []
              const dayGoogleEvents = googleEventsByDay.get(dayIndex) || []

              // Compute overlaps for all events in this day
              const allEvents = [
                ...dayItems.map((item) => ({
                  id: item.id,
                  dateStr: item.datum_tijd,
                  endStr: item.eind_tijd,
                })),
                ...dayGoogleEvents.map((event) => ({
                  id: event.id,
                  dateStr: event.start,
                  endStr: event.end,
                })),
              ]
              const positions = computeOverlapPositions(allEvents)

              return (
                <div
                  key={dayIndex}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `calc(3.5rem + ${dayIndex} * ((100% - 3.5rem) / 7))`,
                    width: `calc((100% - 3.5rem) / 7)`,
                  }}
                >
                  {/* Now indicator for today column */}
                  {isToday(day) && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ top: nowTop }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                        <div className="flex-1 h-[2px] bg-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Local events */}
                  {dayItems.map((item) => {
                    const pos = positions.get(item.id)
                    const column = pos?.column || 0
                    const totalColumns = pos?.totalColumns || 1
                    const widthPercent = 100 / totalColumns
                    const leftPercent = column * widthPercent

                    return (
                      <EventBlock
                        key={item.id}
                        title={item.titel}
                        time={format(new Date(item.datum_tijd), 'HH:mm', { locale: nl }) + (item.eind_tijd ? ` - ${format(new Date(item.eind_tijd), 'HH:mm', { locale: nl })}` : '')}
                        isGoogleEvent={false}
                        typeColor={TYPE_COLORS[item.type]}
                        style={{
                          position: 'absolute',
                          top: getTopPosition(item.datum_tijd),
                          height: getBlockHeight(item.datum_tijd, item.eind_tijd),
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                        onClick={() => onSelectEvent(item)}
                      />
                    )
                  })}

                  {/* iCal/Google events */}
                  {dayGoogleEvents.map((event) => {
                    const pos = positions.get(event.id)
                    const column = pos?.column || 0
                    const totalColumns = pos?.totalColumns || 1
                    const widthPercent = 100 / totalColumns
                    const leftPercent = column * widthPercent

                    return (
                      <EventBlock
                        key={event.id}
                        title={event.summary}
                        time={format(new Date(event.start), 'HH:mm', { locale: nl }) + (event.end ? ` - ${format(new Date(event.end), 'HH:mm', { locale: nl })}` : '')}
                        isGoogleEvent={true}
                        googleSource={event.source}
                        style={{
                          position: 'absolute',
                          top: getTopPosition(event.start),
                          height: getBlockHeight(event.start, event.end),
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                        onClick={() => onSelectGoogleEvent(event)}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
