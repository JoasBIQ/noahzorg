'use client'

import { useState, useCallback, useMemo } from 'react'
import { isSameDay, format, isAfter, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns'
import { nl } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar as CalendarIcon, List, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useCalendarNavigation } from '@/hooks/use-calendar-navigation'
import { useGoogleCalendarEvents } from '@/hooks/use-google-calendar-events'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { EventCard } from '@/components/agenda/event-card'
import { EventForm } from '@/components/agenda/event-form'
import { Calendar } from '@/components/agenda/calendar'
import { AGENDA_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { AgendaItem, Profile, AgendaType, GoogleCalendarEvent } from '@/types'
import type { CalendarView } from '@/hooks/use-calendar-navigation'

interface AgendaPageProps {
  initialItems: AgendaItem[]
  allProfiles: Profile[]
  currentProfile: Profile
  currentUserId: string
}

type ViewMode = 'list' | 'day' | 'week' | 'month'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

export function AgendaPage({
  initialItems,
  allProfiles,
  currentProfile,
  currentUserId,
}: AgendaPageProps) {
  const [items, setItems] = useState<AgendaItem[]>(initialItems)
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [filterType, setFilterType] = useState<string>('alle')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null)
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<GoogleCalendarEvent | null>(null)
  const [defaultDateTime, setDefaultDateTime] = useState<string | undefined>()

  const supabase = createClient()

  // Calendar navigation
  const {
    currentDate,
    view: calendarView,
    setView: setCalendarView,
    goToday,
    goPrev,
    goNext,
    title: calendarTitle,
  } = useCalendarNavigation('month')

  // Compute visible date range for Google Calendar fetch
  const visibleRange = useMemo(() => {
    switch (calendarView) {
      case 'day':
        return { start: startOfDay(currentDate), end: addDays(startOfDay(currentDate), 1) }
      case 'week': {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
        const we = endOfWeek(currentDate, { weekStartsOn: 1 })
        return { start: ws, end: addDays(we, 1) }
      }
      case 'month': {
        const ms = startOfMonth(currentDate)
        const me = endOfMonth(currentDate)
        // Include padding days
        const paddedStart = startOfWeek(ms, { weekStartsOn: 1 })
        const paddedEnd = addDays(endOfWeek(me, { weekStartsOn: 1 }), 1)
        return { start: paddedStart, end: paddedEnd }
      }
    }
  }, [currentDate, calendarView])

  // Fetch Google Calendar events for visible range
  const { events: googleEvents } = useGoogleCalendarEvents(visibleRange.start, visibleRange.end)

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('agenda')
      .select('*')
      .order('datum_tijd', { ascending: true })

    if (data) {
      setItems(data as AgendaItem[])
    }
  }, [supabase])

  // Subscribe to realtime changes
  useRealtime('agenda', () => {
    fetchItems()
  })

  // Filter items
  const filteredItems = useMemo(() => {
    if (filterType === 'alle') return items
    return items.filter((item) => item.type === filterType)
  }, [items, filterType])

  // Group items by date for list view
  const groupedItems = useMemo(() => {
    if (viewMode !== 'list') return new Map<string, AgendaItem[]>()

    const today = startOfDay(new Date())
    const upcoming = filteredItems.filter(
      (item) =>
        isAfter(new Date(item.datum_tijd), today) ||
        isSameDay(new Date(item.datum_tijd), today)
    )

    const map = new Map<string, AgendaItem[]>()
    upcoming.forEach((item) => {
      const key = format(new Date(item.datum_tijd), 'yyyy-MM-dd')
      const existing = map.get(key) || []
      existing.push(item)
      map.set(key, existing)
    })
    return map
  }, [filteredItems, viewMode])

  const handleFormSubmit = () => {
    setShowForm(false)
    setDefaultDateTime(undefined)
    fetchItems()
  }

  const handleFormClose = () => {
    setShowForm(false)
    setDefaultDateTime(undefined)
  }

  const handleItemUpdate = () => {
    fetchItems()
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    if (mode !== 'list') {
      setCalendarView(mode as CalendarView)
    }
  }

  const handleCalendarViewChange = (view: CalendarView) => {
    setCalendarView(view)
    setViewMode(view)
  }

  const handleSelectTime = (date: Date) => {
    setDefaultDateTime(format(date, "yyyy-MM-dd'T'HH:mm"))
    setShowForm(true)
  }

  const handleSelectEvent = (item: AgendaItem) => {
    setSelectedItem(item)
  }

  const handleSelectGoogleEvent = (event: GoogleCalendarEvent) => {
    setSelectedGoogleEvent(event)
  }

  const handleSelectDate = (date: Date) => {
    setCalendarView('day')
    setViewMode('day')
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-muted mt-0.5">
            Afspraken en belangrijke data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
          </Button>
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => handleViewModeChange('list')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500 hover:bg-gray-50'
              )}
              title="Lijst"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => handleViewModeChange('month')}
              className={cn(
                'p-2 transition-colors',
                viewMode !== 'list'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500 hover:bg-gray-50'
              )}
              title="Kalender"
            >
              <CalendarIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl shadow-sm">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">
                  Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="alle">Alle</option>
                  {(
                    Object.entries(AGENDA_TYPE_LABELS) as [
                      AgendaType,
                      string
                    ][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar views */}
      {viewMode !== 'list' && (
        <Calendar
          currentDate={currentDate}
          view={calendarView}
          title={calendarTitle}
          items={filteredItems}
          googleEvents={googleEvents}
          onViewChange={handleCalendarViewChange}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
          onSelectDate={handleSelectDate}
          onSelectTime={handleSelectTime}
          onSelectEvent={handleSelectEvent}
          onSelectGoogleEvent={handleSelectGoogleEvent}
        />
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <>
          {groupedItems.size === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="Geen afspraken"
              description={
                filterType !== 'alle'
                  ? 'Er zijn geen afspraken die aan het filter voldoen.'
                  : 'Voeg een afspraak toe om te beginnen.'
              }
            />
          ) : (
            <div className="space-y-6">
              {Array.from(groupedItems.entries()).map(([dateKey, dateItems]) => (
                <div key={dateKey}>
                  <h3 className="text-sm font-medium text-gray-500 mb-3 capitalize">
                    {format(new Date(dateKey), 'EEEE d MMMM', { locale: nl })}
                  </h3>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    {dateItems.map((item) => (
                      <motion.div key={item.id} variants={itemVariants}>
                        <EventCard
                          item={item}
                          allProfiles={allProfiles}
                          currentUserId={currentUserId}
                          onUpdate={handleItemUpdate}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* FAB - Nieuw event */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-full shadow-lg hover:bg-primary-dark transition-colors"
      >
        <Plus size={20} />
        <span className="font-medium">Nieuw event</span>
      </motion.button>

      {/* New event modal */}
      <Modal
        open={showForm}
        onClose={handleFormClose}
        title="Nieuwe afspraak"
      >
        <EventForm
          profiles={allProfiles}
          currentUserId={currentUserId}
          defaultDateTime={defaultDateTime}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
        />
      </Modal>

      {/* Event detail/edit modal (for calendar clicks) */}
      {selectedItem && (
        <Modal
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title="Afspraak bewerken"
        >
          <EventForm
            profiles={allProfiles}
            currentUserId={currentUserId}
            existingItem={selectedItem}
            onClose={() => setSelectedItem(null)}
            onSubmit={() => {
              setSelectedItem(null)
              handleItemUpdate()
            }}
          />
        </Modal>
      )}

      {/* Google event detail modal */}
      {selectedGoogleEvent && (
        <Modal
          open={!!selectedGoogleEvent}
          onClose={() => setSelectedGoogleEvent(null)}
          title="Google Calendar afspraak"
        >
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Titel</span>
              <p className="text-gray-900 font-medium">{selectedGoogleEvent.summary}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Tijd</span>
              <p className="text-gray-900">
                {format(new Date(selectedGoogleEvent.start), 'EEEE d MMMM yyyy, HH:mm', { locale: nl })}
                {selectedGoogleEvent.end && (
                  <> - {format(new Date(selectedGoogleEvent.end), 'HH:mm', { locale: nl })}</>
                )}
              </p>
            </div>
            {selectedGoogleEvent.location && (
              <div>
                <span className="text-sm text-gray-500">Locatie</span>
                <p className="text-gray-900">{selectedGoogleEvent.location}</p>
              </div>
            )}
            {selectedGoogleEvent.description && (
              <div>
                <span className="text-sm text-gray-500">Beschrijving</span>
                <p className="text-gray-900 text-sm whitespace-pre-wrap">{selectedGoogleEvent.description}</p>
              </div>
            )}
            <a
              href={selectedGoogleEvent.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mt-2"
            >
              Openen in Google Calendar
            </a>
          </div>
        </Modal>
      )}
    </div>
  )
}
