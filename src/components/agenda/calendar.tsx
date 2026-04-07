'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DayView } from './day-view'
import { WeekView } from './week-view'
import { MonthView } from './month-view'
import type { CalendarView } from '@/hooks/use-calendar-navigation'
import type { AgendaItem, GoogleCalendarEvent } from '@/types'

interface CalendarProps {
  currentDate: Date
  view: CalendarView
  title: string
  items: AgendaItem[]
  googleEvents: GoogleCalendarEvent[]
  onViewChange: (view: CalendarView) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSelectDate: (date: Date) => void
  onSelectTime: (date: Date) => void
  onSelectEvent: (item: AgendaItem) => void
  onSelectGoogleEvent: (event: GoogleCalendarEvent) => void
}

const VIEW_LABELS: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Dag' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Maand' },
]

export function Calendar({
  currentDate,
  view,
  title,
  items,
  googleEvents,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onSelectDate,
  onSelectTime,
  onSelectEvent,
  onSelectGoogleEvent,
}: CalendarProps) {
  return (
    <div>
      {/* Header: navigation + view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onToday}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Vandaag
          </button>
          <button
            onClick={onPrev}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={onNext}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 capitalize ml-1">
            {title}
          </h2>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {VIEW_LABELS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onViewChange(value)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                view === value
                  ? 'bg-[#4A7C59]/10 text-[#4A7C59]'
                  : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar view */}
      <motion.div
        key={view}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {view === 'day' && (
          <DayView
            date={currentDate}
            items={items}
            googleEvents={googleEvents}
            onSelectTime={onSelectTime}
            onSelectEvent={onSelectEvent}
            onSelectGoogleEvent={onSelectGoogleEvent}
          />
        )}
        {view === 'week' && (
          <WeekView
            date={currentDate}
            items={items}
            googleEvents={googleEvents}
            onSelectTime={onSelectTime}
            onSelectEvent={onSelectEvent}
            onSelectGoogleEvent={onSelectGoogleEvent}
          />
        )}
        {view === 'month' && (
          <MonthView
            date={currentDate}
            items={items}
            googleEvents={googleEvents}
            onSelectDate={onSelectDate}
            onSelectEvent={onSelectEvent}
            onSelectGoogleEvent={onSelectGoogleEvent}
          />
        )}
      </motion.div>
    </div>
  )
}
