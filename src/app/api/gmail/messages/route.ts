import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getMessages, GmailTokenExpiredError } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pageToken = searchParams.get('pageToken') ?? undefined
    const maxResults = parseInt(searchParams.get('maxResults') ?? '20', 10)
    const label = searchParams.get('label') ?? 'INBOX'
    const query = searchParams.get('q') ?? undefined

    const result = await getMessages(maxResults, pageToken, label, query)

    if (result.messages.length === 0) {
      return NextResponse.json(result)
    }

    const messageIds = result.messages.map((m) => m.id)

    // Leestatus opzoeken — bij zoekopdracht voor alle resultaten, anders alleen INBOX
    if (query || label === 'INBOX') {
      const { data: leestatus } = await supabase
        .from('mail_leestatus')
        .select('gmail_message_id')
        .eq('gebruiker_id', user.id)
        .in('gmail_message_id', messageIds)

      const gelezenIds = new Set(leestatus?.map((l) => l.gmail_message_id) ?? [])

      result.messages = result.messages.map((m) => ({
        ...m,
        // Bij zoekopdracht: alleen INBOX-berichten kunnen ongelezen zijn
        gelezen: query
          ? !m.labelIds.includes('INBOX') || gelezenIds.has(m.id)
          : gelezenIds.has(m.id),
      }))
    } else {
      // Verzonden en concepten altijd als gelezen weergeven
      result.messages = result.messages.map((m) => ({ ...m, gelezen: true }))
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof GmailTokenExpiredError) {
      return NextResponse.json({ error: 'token_expired', messages: [] }, { status: 401 })
    }
    console.error('[Gmail messages] Error:', error)
    return NextResponse.json({ error: 'Berichten ophalen mislukt.', messages: [] }, { status: 500 })
  }
}
