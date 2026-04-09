import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCalendarClient, mapGoogleEvent } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

// In-memory cache: key = userId+timeMin+timeMax, value = { events, ts }
const cache = new Map<string, { events: ReturnType<typeof mapGoogleEvent>[]; ts: number }>()
const CACHE_TTL_MS = 60_000 // 60 seconden

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ events: [], connected: false })

    const { searchParams } = request.nextUrl
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    if (!timeMin || !timeMax) {
      return NextResponse.json({ error: 'timeMin en timeMax zijn verplicht.' }, { status: 400 })
    }

    const cacheKey = `${user.id}:${timeMin}:${timeMax}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json({ events: cached.events, connected: true })
    }

    const calendar = await getCalendarClient()
    if (!calendar) return NextResponse.json({ events: [], connected: false })

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    })

    const events = (res.data.items ?? []).map(mapGoogleEvent)
    cache.set(cacheKey, { events, ts: Date.now() })
    return NextResponse.json({ events, connected: true })
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 403 || status === 401) {
      return NextResponse.json({ events: [], connected: false, needsReauth: true })
    }
    console.error('[calendar/family-events] GET fout:', err)
    return NextResponse.json({ events: [], connected: false })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const body = await request.json()
    const { titel, beschrijving, start, einde, locatie, aangemaakt_door } = body

    if (!titel?.trim() || !start || !einde) {
      return NextResponse.json({ error: 'Titel, start en einde zijn verplicht.' }, { status: 400 })
    }

    const calendar = await getCalendarClient()
    if (!calendar) return NextResponse.json({ error: 'Agenda niet gekoppeld. Herauthoriseer Gmail via Beheer.' }, { status: 503 })

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: titel.trim(),
        description: beschrijving?.trim() || undefined,
        location: locatie?.trim() || undefined,
        start: { dateTime: start },
        end: { dateTime: einde },
        extendedProperties: {
          private: {
            aangemaakt_door: aangemaakt_door || user.id,
          },
        },
      },
    })

    return NextResponse.json({ success: true, event: mapGoogleEvent(res.data) })
  } catch (err) {
    console.error('[calendar/family-events] POST fout:', err)
    return NextResponse.json({ error: 'Aanmaken mislukt.' }, { status: 500 })
  }
}
