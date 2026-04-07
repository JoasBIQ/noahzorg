import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthorizedClient, GmailTokenExpiredError } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { messageId } = await request.json()
    if (!messageId) {
      return NextResponse.json({ error: 'messageId is verplicht.' }, { status: 400 })
    }

    const client = await getAuthorizedClient()
    if (!client) {
      return NextResponse.json({ error: 'Gmail niet gekoppeld.' }, { status: 400 })
    }

    const gmail = google.gmail({ version: 'v1', auth: client })
    await gmail.users.messages.trash({ userId: 'me', id: messageId })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 })
    }
    console.error('[Gmail trash] Error:', error)
    return NextResponse.json({ error: 'Mail verplaatsen naar prullenbak mislukt.' }, { status: 500 })
  }
}
