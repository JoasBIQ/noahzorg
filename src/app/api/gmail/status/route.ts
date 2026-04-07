import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isGmailConnected } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const status = await isGmailConnected()
    return NextResponse.json(status)
  } catch (error) {
    console.error('[Gmail status] Error:', error)
    return NextResponse.json({ connected: false })
  }
}
