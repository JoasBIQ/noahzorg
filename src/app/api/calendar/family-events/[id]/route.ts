import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCalendarClient, mapGoogleEvent } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const { titel, beschrijving, start, einde, locatie } = await request.json()

    if (!titel?.trim() || !start || !einde) {
      return NextResponse.json({ error: 'Titel, start en einde zijn verplicht.' }, { status: 400 })
    }

    const calendar = await getCalendarClient()
    if (!calendar) return NextResponse.json({ error: 'Agenda niet gekoppeld.' }, { status: 503 })

    const res = await calendar.events.patch({
      calendarId: 'primary',
      eventId: params.id,
      requestBody: {
        summary: titel.trim(),
        description: beschrijving?.trim() || null,
        location: locatie?.trim() || null,
        start: { dateTime: start },
        end: { dateTime: einde },
      },
    })

    return NextResponse.json({ success: true, event: mapGoogleEvent(res.data) })
  } catch (err) {
    console.error('[calendar/family-events/[id]] PUT fout:', err)
    return NextResponse.json({ error: 'Bijwerken mislukt.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const calendar = await getCalendarClient()
    if (!calendar) return NextResponse.json({ error: 'Agenda niet gekoppeld.' }, { status: 503 })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: params.id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[calendar/family-events/[id]] DELETE fout:', err)
    return NextResponse.json({ error: 'Verwijderen mislukt.' }, { status: 500 })
  }
}
