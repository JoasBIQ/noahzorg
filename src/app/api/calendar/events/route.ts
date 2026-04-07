import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import ICAL from 'ical.js'
import type { GoogleCalendarEvent } from '@/types'

export const dynamic = 'force-dynamic'

// In-memory cache: { url, events, fetchedAt }
let cache: { url: string; events: GoogleCalendarEvent[]; fetchedAt: number } | null = null
const CACHE_TTL = 15 * 60 * 1000 // 15 minuten

async function fetchICalEvents(icalUrl: string): Promise<GoogleCalendarEvent[]> {
  // Check cache
  if (cache && cache.url === icalUrl && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.events
  }

  const response = await fetch(icalUrl, { next: { revalidate: 900 } })
  if (!response.ok) {
    throw new Error(`iCal fetch failed: ${response.status}`)
  }

  const text = await response.text()
  const jcalData = ICAL.parse(text)
  const comp = new ICAL.Component(jcalData)
  const vevents = comp.getAllSubcomponents('vevent')

  const events: GoogleCalendarEvent[] = vevents.map((vevent) => {
    const event = new ICAL.Event(vevent)
    const startDate = event.startDate
    const endDate = event.endDate

    return {
      id: event.uid || `ical-${Math.random().toString(36).slice(2)}`,
      summary: event.summary || 'Geen titel',
      start: startDate ? startDate.toJSDate().toISOString() : new Date().toISOString(),
      end: endDate ? endDate.toJSDate().toISOString() : new Date().toISOString(),
      location: event.location || undefined,
      description: event.description || undefined,
      htmlLink: '',
      isGoogleEvent: true as const,
    }
  })

  // Update cache
  cache = { url: icalUrl, events, fetchedAt: Date.now() }

  return events
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    if (!timeMin || !timeMax) {
      return NextResponse.json(
        { error: 'timeMin en timeMax zijn verplicht.' },
        { status: 400 }
      )
    }

    // Fetch iCal URL from app_instellingen
    const { data: setting } = await supabase
      .from('app_instellingen')
      .select('value')
      .eq('key', 'calendar_ical_url')
      .single()

    if (!setting?.value) {
      return NextResponse.json({ events: [] })
    }

    const allEvents = await fetchICalEvents(setting.value)

    // Filter by time range
    const min = new Date(timeMin).getTime()
    const max = new Date(timeMax).getTime()

    const filtered = allEvents.filter((event) => {
      const eventStart = new Date(event.start).getTime()
      const eventEnd = new Date(event.end).getTime()
      return eventEnd >= min && eventStart <= max
    })

    return NextResponse.json({ events: filtered })
  } catch (error) {
    console.error('Calendar events error:', error)
    return NextResponse.json({ events: [] })
  }
}
