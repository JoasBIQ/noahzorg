'use client'

import { useState, useCallback, useMemo } from 'react'
import { isSameDay, format, isAfter, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns'
import { nl } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar as CalendarIcon, List, Filter, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react'
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
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

// ------- Family Event Form Modal -------

interface FamilyEventFormProps {
  existing?: GoogleCalendarEvent
  defaultDateTime?: string
  onClose: () => void
  onSaved: () => void
  currentUserId: string
  currentProfile: Profile
}

function FamilyEventForm({
  existing,
  defaultDateTime,
  onClose,
  onSaved,
  currentUserId,
  currentProfile,
}: FamilyEventFormProps) {
  const [titel, setTitel] = useState(existing?.summary ?? '')
  const [start, setStart] = useState(() => {
    if (existing?.start) {
      const d = new Date(existing.start)
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    return defaultDateTime ?? ''
  })
  const [einde, setEinde] = useState(() => {
    if (existing?.end) {
      const d = new Date(existing.end)
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    return ''
  })
  const [locatie, setLocatie] = useState(existing?.location ?? '')
  const [beschrijving, setBeschrijving] = useState(existing?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!existing

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titel.trim()) { setError('Titel is verplicht'); return }
    if (!start) { setError('Starttijd is verplicht'); return }
    if (!einde) { setError('Eindtijd is verplicht'); return }

    setSaving(true)
    setError('')
    try {
      const body = {
        titel: titel.trim(),
        beschrijving: beschrijving.trim() || null,
        start: new Date(start).toISOString(),
        einde: new Date(einde).toISOString(),
        locatie: locatie.trim() || null,
        aangemaakt_door: currentProfile.naam,
      }

      const url = isEditing
        ? `/api/calendar/family-events/${existing.id}`
        : '/api/calendar/family-events'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Opslaan mislukt')
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
        <input
          type="text"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Naam van de afspraak"
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Start *</label>
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Einde *</label>
        <input
          type="datetime-local"
          value={einde}
          onChange={(e) => setEinde(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Locatie</label>
        <input
          type="text"
          value={locatie}
          onChange={(e) => setLocatie(e.target.value)}
          placeholder="Waar vindt het plaats?"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
        <textarea
          value={beschrijving}
          onChange={(e) => setBeschrijving(e.target.value)}
          placeholder="Extra informatie..."
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 rounded-lg bg-[#4A7C59] text-white text-sm font-medium hover:bg-[#3d6b4a] disabled:opacity-50 transition-colors"
        >
          {saving ? 'Opslaan...' : isEditing ? 'Bijwerken' : 'Aanmaken'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annuleren
        </button>
      </div>
    </form>
  )
}

// ------- Family Event Detail Modal -------

interface FamilyEventDetailProps {
  event: GoogleCalendarEvent
  allProfiles: Profile[]
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
}

function FamilyEventDetail({ event, allProfiles, onClose, onEdit, onDeleted }: FamilyEventDetailProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const auteurNaam = useMemo(() => {
    if (!event.aangemaakt_door) return null
    // aangemaakt_door kan een naam zijn (string) of een UUID
    const profile = allProfiles.find((p) => p.id === event.aangemaakt_door)
    return profile?.naam ?? event.aangemaakt_door
  }, [event.aangemaakt_door, allProfiles])

  async function handleDelete() {
    if (!confirm('Weet je zeker dat je deze afspraak wilt verwijderen?')) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/calendar/family-events/${event.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Verwijderen mislukt')
      onDeleted()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt')
      setDeleting(false)
    }
  }

  const isNoah = event.source === 'noah'

  return (
    <div className="space-y-4">
      {isNoah && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg border border-orange-100">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#C4704F' }} />
          <span className="text-sm text-orange-800 font-medium">Noah&apos;s agenda (alleen lezen)</span>
        </div>
      )}

      <div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">Titel</span>
        <p className="text-gray-900 font-medium mt-0.5">{event.summary}</p>
      </div>

      <div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">Tijd</span>
        <p className="text-gray-900 mt-0.5">
          {format(new Date(event.start), 'EEEE d MMMM yyyy, HH:mm', { locale: nl })}
          {event.end && <> – {format(new Date(event.end), 'HH:mm', { locale: nl })}</>}
        </p>
      </div>

      {event.location && (
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Locatie</span>
          <p className="text-gray-900 mt-0.5">{event.location}</p>
        </div>
      )}

      {event.description && (
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Beschrijving</span>
          <p className="text-gray-900 text-sm whitespace-pre-wrap mt-0.5">{event.description}</p>
        </div>
      )}

      {auteurNaam && !isNoah && (
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Aangemaakt door</span>
          <p className="text-gray-900 mt-0.5">{auteurNaam}</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!isNoah && (
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={14} />
            Bewerken
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-100 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            {deleting ? 'Verwijderen...' : 'Verwijderen'}
          </button>
        </div>
      )}
    </div>
  )
}

// ------- Main AgendaPage -------

export function AgendaPage({
  initialItems,
  allProfiles,
  currentProfile,
  currentUserId,
}: AgendaPageProps) {
  const [items, setItems] = useState<AgendaItem[]>(initialItems)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [filterType, setFilterType] = useState<string>('alle')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null)
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<GoogleCalendarEvent | null>(null)
  const [editingGoogleEvent, setEditingGoogleEvent] = useState<GoogleCalendarEvent | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [defaultDateTime, setDefaultDateTime] = useState<string | undefined>()

  const supabase = createClient()

  const {
    currentDate,
    view: calendarView,
    setView: setCalendarView,
    goToday,
    goPrev,
    goNext,
    title: calendarTitle,
  } = useCalendarNavigation('month')

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
        const paddedStart = startOfWeek(ms, { weekStartsOn: 1 })
        const paddedEnd = addDays(endOfWeek(me, { weekStartsOn: 1 }), 1)
        return { start: paddedStart, end: paddedEnd }
      }
    }
  }, [currentDate, calendarView])

  const { events: googleEvents, familyConnected, refreshFamilyEvents } = useGoogleCalendarEvents(
    visibleRange.start,
    visibleRange.end
  )

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('agenda')
      .select('*')
      .order('datum_tijd', { ascending: true })
    if (data) setItems(data as AgendaItem[])
  }, [supabase])

  useRealtime('agenda', () => { fetchItems() })

  const filteredItems = useMemo(() => {
    if (filterType === 'alle') return items
    return items.filter((item) => item.type === filterType)
  }, [items, filterType])

  const groupedItems = useMemo(() => {
    if (viewMode !== 'list') return new Map<string, AgendaItem[]>()
    const today = startOfDay(new Date())
    const upcoming = filteredItems.filter(
      (item) => isAfter(new Date(item.datum_tijd), today) || isSameDay(new Date(item.datum_tijd), today)
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

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    if (mode !== 'list') setCalendarView(mode as CalendarView)
  }

  const handleCalendarViewChange = (view: CalendarView) => {
    setCalendarView(view)
    setViewMode(view)
  }

  const handleSelectTime = (date: Date) => {
    if (familyConnected) {
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      setDefaultDateTime(local.toISOString().slice(0, 16))
      setShowNewForm(true)
    }
  }

  const handleSelectDate = (date: Date) => {
    setCalendarView('day')
    setViewMode('day')
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-muted mt-0.5">Afspraken en belangrijke data</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} />
          </Button>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => handleViewModeChange('list')}
              className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50')}
              title="Lijst"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => handleViewModeChange('month')}
              className={cn('p-2 transition-colors', viewMode !== 'list' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50')}
              title="Kalender"
            >
              <CalendarIcon size={18} />
            </button>
          </div>
          {familyConnected && (
            <button
              onClick={() => { setDefaultDateTime(undefined); setShowNewForm(true) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#4A7C59] text-white text-sm font-medium hover:bg-[#3d6b4a] transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nieuwe afspraak</span>
            </button>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4A7C59' }} />
          <span className="text-xs text-gray-600">Familieagenda</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C4704F' }} />
          <span className="text-xs text-gray-600">Noah&apos;s agenda</span>
        </div>
      </div>

      {/* Melding als agenda niet verbonden */}
      {familyConnected === false && (
        <div className="flex items-start gap-2 mb-4 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Familieagenda niet verbonden. Herauthoriseer Gmail via{' '}
            <a href="/beheer" className="font-medium underline">Beheer</a> om afspraken te maken en te synchroniseren.
          </span>
        </div>
      )}

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
                <label className="block text-xs font-medium text-gray-500">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="alle">Alle</option>
                  {(Object.entries(AGENDA_TYPE_LABELS) as [AgendaType, string][]).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
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
          onSelectEvent={(item) => setSelectedItem(item)}
          onSelectGoogleEvent={(event) => setSelectedGoogleEvent(event)}
        />
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <>
          {groupedItems.size === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="Geen afspraken"
              description={filterType !== 'alle' ? 'Er zijn geen afspraken die aan het filter voldoen.' : 'Voeg een afspraak toe om te beginnen.'}
            />
          ) : (
            <div className="space-y-6">
              {Array.from(groupedItems.entries()).map(([dateKey, dateItems]) => (
                <div key={dateKey}>
                  <h3 className="text-sm font-medium text-gray-500 mb-3 capitalize">
                    {format(new Date(dateKey), 'EEEE d MMMM', { locale: nl })}
                  </h3>
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
                    {dateItems.map((item) => (
                      <motion.div key={item.id} variants={itemVariants}>
                        <EventCard
                          item={item}
                          allProfiles={allProfiles}
                          currentUserId={currentUserId}
                          onUpdate={fetchItems}
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

      {/* Nieuw afspraak modal */}
      <Modal open={showNewForm} onClose={() => { setShowNewForm(false); setDefaultDateTime(undefined) }} title="Nieuwe afspraak">
        <FamilyEventForm
          defaultDateTime={defaultDateTime}
          onClose={() => { setShowNewForm(false); setDefaultDateTime(undefined) }}
          onSaved={refreshFamilyEvents}
          currentUserId={currentUserId}
          currentProfile={currentProfile}
        />
      </Modal>

      {/* Local agenda item bewerken */}
      {selectedItem && (
        <Modal open={!!selectedItem} onClose={() => setSelectedItem(null)} title="Afspraak bewerken">
          <EventForm
            profiles={allProfiles}
            currentUserId={currentUserId}
            existingItem={selectedItem}
            onClose={() => setSelectedItem(null)}
            onSubmit={() => { fetchItems(); setSelectedItem(null) }}
          />
        </Modal>
      )}

      {/* Google/iCal event detail */}
      {selectedGoogleEvent && !editingGoogleEvent && (
        <Modal
          open={!!selectedGoogleEvent}
          onClose={() => setSelectedGoogleEvent(null)}
          title={selectedGoogleEvent.source === 'family' ? 'Familieagenda' : "Noah's agenda"}
        >
          <FamilyEventDetail
            event={selectedGoogleEvent}
            allProfiles={allProfiles}
            onClose={() => setSelectedGoogleEvent(null)}
            onEdit={() => {
              setEditingGoogleEvent(selectedGoogleEvent)
              setSelectedGoogleEvent(null)
            }}
            onDeleted={refreshFamilyEvents}
          />
        </Modal>
      )}

      {/* Family event bewerken */}
      {editingGoogleEvent && (
        <Modal
          open={!!editingGoogleEvent}
          onClose={() => setEditingGoogleEvent(null)}
          title="Afspraak bewerken"
        >
          <FamilyEventForm
            existing={editingGoogleEvent}
            onClose={() => setEditingGoogleEvent(null)}
            onSaved={refreshFamilyEvents}
            currentUserId={currentUserId}
            currentProfile={currentProfile}
          />
        </Modal>
      )}
    </div>
  )
}
