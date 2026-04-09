import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCalendarClient } from '@/lib/google-calendar'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ connected: false })

    const calendar = await getCalendarClient()
    if (!calendar) return NextResponse.json({ connected: false, gmailConnected: false })

    // Test of calendar scope beschikbaar is
    await calendar.calendarList.list({ maxResults: 1 })
    return NextResponse.json({ connected: true })
  } catch (err: unknown) {
    const status = (err as { status?: number; code?: number })?.status ?? (err as { code?: number })?.code
    if (status === 403 || status === 401) {
      return NextResponse.json({ connected: false, needsReauth: true })
    }
    return NextResponse.json({ connected: false })
  }
}
